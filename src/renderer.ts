import { initialCamera, type Camera } from "./camera";
import type { RenderedTileMessage } from "./messages";
import type { Screen } from "./tile";

const RENDER_DEBOUNCE_MS = 500;

export class Renderer {
  private context: CanvasRenderingContext2D;
  private workers: Worker[] = [];
  private camera: Camera = { ...initialCamera };
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCamera: Camera | null = null;
  private pendingScreen: Screen | null = null;

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
    const tiles = screen.rowCount * screen.columnCount;

    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];

    for (let i = 0; i < tiles; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
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
          this.workers.splice(this.workers.indexOf(worker), 1);
          worker.terminate();
        },
      );

      worker.postMessage({
        type: "requestTile",
        camera,
        screen,
        tileIndex: i,
      });
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
