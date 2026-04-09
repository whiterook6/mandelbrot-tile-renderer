import { serializeCamera, type Camera } from "./camera";
import { Compositor } from "./compositor";
import { GradientController } from "./gradient";
import type { RenderedTileMessage, RenderTileMessage } from "./messages";
import { Status } from "./status";
import type { Screen } from "./tile";

const RENDER_DEBOUNCE_MS = 125;

const shuffleTileIndices = (count: number): number[] => {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = indices[i];
    indices[i] = indices[j]!;
    indices[j] = t!;
  }
  return indices;
};

export class Renderer {
  private workers: Worker[];
  private compositor: Compositor;
  private workQueue: Array<RenderTileMessage>;
  private frontCamera: Camera;
  private screen: Screen | null = null;
  private generation: number = 0;
  private cameraForActiveGeneration: Camera;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private expectedTilesInGeneration = 0;
  private tilesCompletedInGeneration = 0;
  private maxWorkerCount: number = Math.max(
    1,
    navigator.hardwareConcurrency - 1,
  );

  constructor(compositor: Compositor, initialCamera: Camera) {
    this.compositor = compositor;
    this.frontCamera = initialCamera;
    this.cameraForActiveGeneration = initialCamera;

    this.workers = Array.from({ length: this.maxWorkerCount }, () => {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      worker.addEventListener("error", (event) => {
        console.error(
          "tile worker error",
          event.message,
          event.filename,
          event.lineno,
        );
      });
      worker.addEventListener("messageerror", (event) => {
        console.error(
          "tile worker message could not be deserialized",
          event.data,
        );
      });

      worker.addEventListener(
        "message",
        (event: MessageEvent<RenderedTileMessage>) => {
          this.receiveTile(event.data);
          const nextMessage = this.dequeueTile();
          if (nextMessage !== undefined) {
            worker.postMessage(nextMessage);
          }
        },
      );
      return worker;
    });
    this.workQueue = [];
  }

  public render = (camera: Camera, screen: Screen, immediate = false) => {
    this.frontCamera = camera;
    this.screen = screen;
    this.generation++;
    this.compositor.blitToBackground(
      this.cameraForActiveGeneration,
      this.frontCamera,
      this.screen,
    );
    this.compositor.hideForeground(); // reveal again when tiles are received

    if (immediate) {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.dispatchRender(camera);
      return;
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.dispatchRender(camera);
    }, RENDER_DEBOUNCE_MS);
  };

  public rerender = (immediate = true) => {
    if (!this.screen) {
      return;
    }
    this.render(this.frontCamera, this.screen, immediate);
  };

  private dispatchRender = (camera: Camera) => {
    if (!this.screen) {
      return;
    }
    const screen = this.screen;
    const tileCount = this.screen.rowCount * this.screen.columnCount;

    Status.progress!.textContent = `${tileCount}`;
    this.expectedTilesInGeneration = tileCount;
    this.tilesCompletedInGeneration = 0;
    console.log(
      "[renderer] dispatch generation",
      this.generation,
      "expected tiles",
      tileCount,
    );
    this.workQueue = shuffleTileIndices(tileCount).map((index) => ({
      type: "requestTile",
      camera: serializeCamera(camera),
      generation: this.generation,
      screen,
      tileIndex: index,
    }));

    this.cameraForActiveGeneration = { ...camera };

    this.compositor.clearForeground();
    this.workers.forEach((worker) => {
      const nextMessage = this.dequeueTile();
      if (nextMessage !== undefined) {
        worker.postMessage(nextMessage);
      }
    });
  };

  private dequeueTile = () => {
    const nextMessage = this.workQueue.shift();
    if (nextMessage !== undefined) {
      Status.progress!.textContent = `${this.workQueue.length}`;
      return nextMessage;
    }
    return undefined;
  };

  private receiveTile = (message: RenderedTileMessage) => {
    const { generation, iterations, maxIterations, tile } = message;
    if (generation !== this.generation) {
      return;
    }

    this.tilesCompletedInGeneration++;
    console.log(
      "[renderer] composited",
      this.tilesCompletedInGeneration,
      "/",
      this.expectedTilesInGeneration,
      "at",
      tile.x,
      tile.y,
    );

    this.compositor.showForeground();
    const image = GradientController.renderTile(
      iterations,
      maxIterations,
      tile.width,
      tile.height,
    );
    this.compositor.drawTile(image, tile);
  };
}
