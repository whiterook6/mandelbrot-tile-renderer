import type { Camera } from "./camera";
import type { Screen, Tile } from "./tile";

export class Compositor {
  private frontCanvas: HTMLCanvasElement;
  private backCanvas: HTMLCanvasElement;
  private frontContext: CanvasRenderingContext2D;
  private backContext: CanvasRenderingContext2D;

  constructor(frontCanvas: HTMLCanvasElement, backCanvas: HTMLCanvasElement) {
    this.frontCanvas = frontCanvas;
    this.backCanvas = backCanvas;
    this.frontCanvas.style.zIndex = "1";
    this.backCanvas.style.zIndex = "0";

    const frontContext = frontCanvas.getContext("2d");
    if (!frontContext) {
      throw new Error("Failed to get front context");
    }
    const backContext = backCanvas.getContext("2d");
    if (!backContext) {
      throw new Error("Failed to get back context");
    }

    if (frontContext.canvas.width !== backContext.canvas.width || frontContext.canvas.height !== backContext.canvas.height) {
      throw new Error("Front and back canvas must have the same size");
    }

    this.frontContext = frontContext;
    this.backContext = backContext;
  }

  public getFrontScreen = (): Screen => {
    return {
      width: this.frontContext.canvas.width,
      height: this.frontContext.canvas.height,
      rowCount: Math.ceil(this.frontContext.canvas.height / 100),
      columnCount: Math.ceil(this.frontContext.canvas.width / 100),
    }
  }

  public drawTile = (image: ImageData, tile: Tile) => {
    this.frontContext.putImageData(image, tile.x, tile.y);
  }

  public blitToBackground = (backCamera: Camera, frontCamera: Camera, screen: Screen) => {
    this.backContext.setTransform(1, 0, 0, 1, 0, 0);
    this.backContext.fillStyle = "black";
    this.backContext.fillRect(0, 0, screen.width, screen.height);

    const halfScreenWidth = screen.width / 2;
    const halfScreenheight = screen.height / 2;
    const cos0 = Math.cos(backCamera.rotation);
    const sin0 = Math.sin(backCamera.rotation);
    const cos1 = Math.cos(frontCamera.rotation);
    const sin1 = Math.sin(frontCamera.rotation);

    const r00 = cos1 * cos0 + sin1 * sin0;
    const r01 = -cos1 * sin0 + sin1 * cos0;
    const r10 = -sin1 * cos0 + cos1 * sin0;
    const r11 = sin1 * sin0 + cos1 * cos0;
    const s = frontCamera.zoom / backCamera.zoom;
    const a = s * r00;
    const c = s * r01;
    const b = s * r10;
    const d = s * r11;
    const dcx = backCamera.worldX - frontCamera.worldX;
    const dcy = backCamera.worldY - frontCamera.worldY;
    const tz1 = frontCamera.zoom * (dcx * cos1 - dcy * sin1);
    const tz2 = frontCamera.zoom * (dcx * sin1 + dcy * cos1);
    const e = halfScreenWidth + tz1 - (a * halfScreenWidth + c * halfScreenheight);
    const f = halfScreenheight + tz2 - (b * halfScreenWidth + d * halfScreenheight);
    this.backContext.setTransform(a, b, c, d, e, f);
    this.backContext.drawImage(this.frontCanvas, 0, 0, screen.width, screen.height);
  }

  public clearForeground = () => {
    this.frontContext.clearRect(0, 0, this.frontContext.canvas.width, this.frontContext.canvas.height);
  }
}