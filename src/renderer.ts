import type { Camera } from "./camera";
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
  private context: CanvasRenderingContext2D;
  private workers: Worker[];
  private workQueue: Array<RenderTileMessage>;
  private camera: Camera | null = null;
  private screen: Screen | null = null;
  private generation: number = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWorkerCount: number = Math.max(
    1,
    navigator.hardwareConcurrency - 1,
  );

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
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

  public rerender = () => {
    this.dispatchRender();
  };

  public render = (camera: Camera, screen: Screen, immediate = false) => {
    this.camera = camera;
    this.screen = screen;
    this.generation++;

    if (immediate) {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.dispatchRender();
      return;
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.dispatchRender();
    }, RENDER_DEBOUNCE_MS);
  };

  private dispatchRender = () => {
    if (!this.camera || !this.screen) {
      return;
    }
    const camera = this.camera;
    const screen = this.screen;
    const tileCount = this.screen.rowCount * this.screen.columnCount;

    Status.progress!.textContent = `${tileCount}`;
    this.workQueue = shuffleTileIndices(tileCount).map((index) => ({
      type: "requestTile",
      camera,
      generation: this.generation,
      screen,
      tileIndex: index,
    }));

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

    const image = GradientController.renderTile(
      iterations,
      maxIterations,
      tile.width,
      tile.height,
    );
    this.context.putImageData(image, tile.x, tile.y);
  };
}
