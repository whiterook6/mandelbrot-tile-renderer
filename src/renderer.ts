import {
  applyWarpTransform,
  cameraFromView,
  type Camera,
  type CameraView,
} from "./camera";
import type { RenderedTileMessage } from "./messages";
import type { Screen } from "./tile";

const RENDER_DEBOUNCE_MS = 250;

/** Canvas filter applied to warped stale content so fresh tiles read clearly on top. */
const PREVIEW_COMMITTED_FILTER = "brightness(0.82) saturate(0.72)";

const viewsNearlyEqual = (a: CameraView, b: CameraView): boolean =>
  a.worldX === b.worldX && a.worldY === b.worldY && a.zoom === b.zoom;

const iterationsToImageData = (
  iterations: Uint16Array,
  maxIterations: number,
  width: number,
  height: number,
): ImageData => {
  const image = new ImageData(width, height);
  const out = image.data;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const iter = iterations[i]!;
    const o = i * 4;
    if (iter >= maxIterations) {
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = 255;
    } else {
      const brightness = Math.floor((255 * iter) / maxIterations);
      out[o] = brightness;
      out[o + 1] = brightness;
      out[o + 2] = brightness;
      out[o + 3] = 255;
    }
  }
  return image;
};

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
  private committedCanvas: HTMLCanvasElement;
  private committedContext: CanvasRenderingContext2D;
  private progressCanvas: HTMLCanvasElement;
  private progressContext: CanvasRenderingContext2D;
  private workers: Worker[] = [];
  /** Camera (including generation) used for the active worker batch. */
  private camera: Camera = { worldX: 0, worldY: 0, zoom: 1, generation: 0 };
  private liveView: CameraView = { worldX: 0, worldY: 0, zoom: 1 };
  private renderCameraView: CameraView = { worldX: 0, worldY: 0, zoom: 1 };
  private committedCameraView: CameraView = { worldX: 0, worldY: 0, zoom: 1 };
  private committedHasContent = false;
  private renderInFlight = false;
  private tilesRemaining = 0;
  private renderGeneration = 0;
  private screen: Screen = {
    width: 1,
    height: 1,
    rowCount: 1,
    columnCount: 1,
  };
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingView: CameraView | null = null;
  private pendingScreen: Screen | null = null;
  private maxWorkerCount: number = Math.max(
    1,
    navigator.hardwareConcurrency - 1,
  );

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
    this.committedCanvas = document.createElement("canvas");
    const committedCtx = this.committedCanvas.getContext("2d");
    if (!committedCtx) {
      throw new Error("2D context unavailable for committed buffer");
    }
    this.committedContext = committedCtx;
    this.progressCanvas = document.createElement("canvas");
    const progressCtx = this.progressCanvas.getContext("2d", {
      alpha: true,
    });
    if (!progressCtx) {
      throw new Error("2D context unavailable for progress buffer");
    }
    this.progressContext = progressCtx;
  }

  public resize = (screen: Screen) => {
    if (
      this.screen.width === screen.width &&
      this.screen.height === screen.height
    ) {
      this.screen = screen;
      return;
    }

    this.screen = screen;
    this.committedCanvas.width = screen.width;
    this.committedCanvas.height = screen.height;
    this.progressCanvas.width = screen.width;
    this.progressCanvas.height = screen.height;

    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.committedHasContent = false;
    this.renderInFlight = false;
    this.tilesRemaining = 0;
    this.pendingView = null;
    this.pendingScreen = null;
    this.renderGeneration += 1;
    this.camera = {
      ...this.camera,
      generation: this.renderGeneration,
    };
  };

  public setLiveView = (view: CameraView) => {
    this.liveView = view;
    this.paint();
  };

  public paint = () => {
    const { context: ctx } = this;
    const { screen } = this;
    ctx.resetTransform();
    ctx.clearRect(0, 0, screen.width, screen.height);

    if (this.committedHasContent) {
      const committedIsPreview =
        this.renderInFlight ||
        !viewsNearlyEqual(this.liveView, this.committedCameraView);
      ctx.save();
      applyWarpTransform(ctx, this.committedCameraView, this.liveView, screen);
      if (committedIsPreview) {
        ctx.filter = PREVIEW_COMMITTED_FILTER;
      }
      ctx.drawImage(this.committedCanvas, 0, 0);
      ctx.restore();
    }

    if (this.renderInFlight) {
      ctx.save();
      applyWarpTransform(ctx, this.renderCameraView, this.liveView, screen);
      ctx.drawImage(this.progressCanvas, 0, 0);
      ctx.restore();
    }
  };

  /**
   * Queues a tile render for `view` after debounce. Generation is assigned only when dispatch runs.
   */
  public scheduleTileRender = (
    view: CameraView,
    screen: Screen,
    immediate = false,
  ) => {
    this.pendingView = { ...view };
    this.pendingScreen = screen;
    this.screen = screen;

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

  private finalizeBatch = () => {
    this.committedContext.drawImage(this.progressCanvas, 0, 0);
    this.committedCameraView = { ...this.renderCameraView };
    this.committedHasContent = true;
    this.progressContext.clearRect(0, 0, this.screen.width, this.screen.height);
    this.renderInFlight = false;
    this.tilesRemaining = 0;
    this.paint();
  };

  private dispatchRender = () => {
    if (this.pendingView === null || this.pendingScreen === null) {
      return;
    }
    const view = this.pendingView;
    const screen = this.pendingScreen;

    this.renderGeneration += 1;
    const camera = cameraFromView(view, this.renderGeneration);
    this.camera = camera;
    this.renderCameraView = { ...view };

    const tileCount = screen.rowCount * screen.columnCount;
    this.progressContext.clearRect(0, 0, screen.width, screen.height);
    this.renderInFlight = true;
    this.tilesRemaining = tileCount;

    this.paint();

    const queue = shuffleTileIndices(tileCount);
    const poolSize = Math.min(this.maxWorkerCount, tileCount);

    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];

    const workerUrl = new URL("./worker.ts", import.meta.url);

    for (let w = 0; w < poolSize; w++) {
      const worker = new Worker(workerUrl, { type: "module" });
      this.workers.push(worker);

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
          const nextIndex = queue.shift();
          if (nextIndex !== undefined) {
            worker.postMessage({
              type: "requestTile",
              camera,
              screen,
              tileIndex: nextIndex,
            });
          } else {
            const i = this.workers.indexOf(worker);
            if (i !== -1) {
              this.workers.splice(i, 1);
            }
            worker.terminate();
          }
        },
      );

      const firstIndex = queue.shift();
      if (firstIndex !== undefined) {
        worker.postMessage({
          type: "requestTile",
          camera,
          screen,
          tileIndex: firstIndex,
        });
      }
    }
  };

  public receiveTile = (message: RenderedTileMessage) => {
    const { generation, iterations, maxIterations, tile } = message;
    if (generation !== this.camera.generation) {
      return;
    }
    const image = iterationsToImageData(
      iterations,
      maxIterations,
      tile.width,
      tile.height,
    );
    this.progressContext.putImageData(image, tile.x, tile.y);
    this.tilesRemaining -= 1;
    this.paint();
    if (this.tilesRemaining === 0) {
      this.finalizeBatch();
    }
  };
}
