import { initialCamera, type Camera } from "./camera";
import type { RenderedTileMessage } from "./messages";
import type { Screen } from "./tile";

export class Renderer {
  private context: CanvasRenderingContext2D;
  private workers: Worker[] = [];
  private camera: Camera = { ...initialCamera };

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  public render = (camera: Camera, screen: Screen) => {
    this.camera = camera;
    const tiles = screen.rowCount * screen.columnCount;

    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];

    for (let i = 0; i < tiles; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url));
      this.workers.push(worker);

      worker.addEventListener(
        "message",
        (event: MessageEvent<RenderedTileMessage>) => {
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
