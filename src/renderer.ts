import { initialCamera, type Camera } from "./camera";
import { rainbowGradient } from "./gradient";
import type { RenderedTileMessage, RenderTileMessage } from "./messages";
import type { Screen } from "./tile";

const RENDER_DEBOUNCE_MS = 125;

const iterationsToImageData = (
  iterations: Uint16Array,
  maxIterations: number,
  width: number,
  height: number,
): ImageData => {
  const imageData = new ImageData(width, height);
  const out = imageData.data;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const iter = iterations[i]!;
    const o = i * 4;
    const pixel = rainbowGradient(iter === maxIterations, iter, maxIterations);
    out[o] = pixel[0];
    out[o + 1] = pixel[1];
    out[o + 2] = pixel[2];
    out[o + 3] = pixel[3];
  }
  return imageData;
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
  private workers: Worker[];
  private workQueue: Array<RenderTileMessage>;
  private camera: Camera = { ...initialCamera };
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCamera: Camera | null = null;
  private pendingScreen: Screen | null = null;
  private maxWorkerCount: number = Math.max(
    1,
    navigator.hardwareConcurrency - 1,
  );

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
    this.workers = Array.from({ length: this.maxWorkerCount }, () => {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener("error", (event) => {
        console.error("tile worker error", event.message, event.filename, event.lineno);
      });
      worker.addEventListener("messageerror", (event) => {
        console.error("tile worker message could not be deserialized", event.data);
      });

      worker.addEventListener("message", (event: MessageEvent<RenderedTileMessage>) => {
        this.receiveTile(event.data);
        if (this.workQueue.length > 0){
          const nextMessage = this.workQueue.shift();
          if (nextMessage !== undefined){
            worker.postMessage(nextMessage);
          }
        }
      });
      return worker;
    });
    this.workQueue = [];
  }

  public render = (camera: Camera, screen: Screen, immediate = false) => {
    this.pendingCamera = camera;
    this.pendingScreen = screen;

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
    if (this.pendingCamera === null || this.pendingScreen === null) {
      return;
    }
    const camera = this.pendingCamera;
    const screen = this.pendingScreen;

    this.camera = camera;
    const tileCount = screen.rowCount * screen.columnCount;
    this.workQueue = shuffleTileIndices(tileCount).map(index => ({
      type: "requestTile",
      camera,
      screen,
      tileIndex: index,
    }));

    this.workers.forEach(worker => {
      if (this.workQueue.length > 0){
        const nextMessage = this.workQueue.shift();
        if (nextMessage !== undefined){
          worker.postMessage(nextMessage);
        }
      }
    });
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
    this.context.putImageData(image, tile.x, tile.y);
  };
}
