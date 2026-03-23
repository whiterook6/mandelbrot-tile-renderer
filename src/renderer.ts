import { initialCamera, type Camera } from "./camera";
import type { RenderedTileMessage } from "./messages";
import type { Screen } from "./tile";

const RENDER_DEBOUNCE_MS = 250;

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
  private workers: Worker[] = [];
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
          console.log("received message", event.data);
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
    const { generation, imageData, tile } = message;
    if (generation !== this.camera.generation) {
      return;
    }
    const image = new ImageData(tile.width, tile.height);
    image.data.set(imageData);
    this.context.putImageData(image, tile.x, tile.y);
  };
}
