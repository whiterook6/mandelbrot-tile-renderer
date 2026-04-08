import type { Camera } from "./camera";
import type { Screen, Tile } from "./tile";

export class Compositor {
  private frontCanvas: HTMLCanvasElement;
  private frontContext: CanvasRenderingContext2D;
  private backContext: CanvasRenderingContext2D;

  constructor(frontCanvas: HTMLCanvasElement, backCanvas: HTMLCanvasElement) {
    this.frontCanvas = frontCanvas;

    const frontContext = frontCanvas.getContext("2d");
    if (!frontContext) {
      throw new Error("Failed to get front context");
    }
    const backContext = backCanvas.getContext("2d");
    if (!backContext) {
      throw new Error("Failed to get back context");
    }

    if (
      frontContext.canvas.width !== backContext.canvas.width ||
      frontContext.canvas.height !== backContext.canvas.height
    ) {
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
    };
  };

  public drawTile = (image: ImageData, tile: Tile) => {
    this.frontContext.putImageData(image, tile.x, tile.y);
  };

  public blitToBackground = (
    backCamera: Camera,
    frontCamera: Camera,
    screen: Screen,
  ) => {
    this.backContext.setTransform(1, 0, 0, 1, 0, 0);
    this.backContext.fillStyle = "black";
    this.backContext.fillRect(0, 0, screen.width, screen.height);

    const halfScreenWidth = screen.width / 2;
    const halfScreenHeight = screen.height / 2;

    // Maps source (backCamera) screen pixels -> destination (frontCamera) screen pixels.
    // Using the same world->screen convention as CameraController:
    // p = center + zoom * R(theta) * (world - cameraCenter)
    const scale = frontCamera.zoom / backCamera.zoom;
    const deltaRotation = frontCamera.rotation - backCamera.rotation;
    const cosDelta = Math.cos(deltaRotation);
    const sinDelta = Math.sin(deltaRotation);

    const a = scale * cosDelta;
    const b = scale * sinDelta;
    const c = -scale * sinDelta;
    const d = scale * cosDelta;

    const dcx = backCamera.worldX - frontCamera.worldX;
    const dcy = backCamera.worldY - frontCamera.worldY;
    const cosFront = Math.cos(frontCamera.rotation);
    const sinFront = Math.sin(frontCamera.rotation);
    const tx = frontCamera.zoom * (dcx * cosFront - dcy * sinFront);
    const ty = frontCamera.zoom * (dcx * sinFront + dcy * cosFront);

    const e =
      halfScreenWidth + tx - (a * halfScreenWidth + c * halfScreenHeight);
    const f =
      halfScreenHeight + ty - (b * halfScreenWidth + d * halfScreenHeight);
    this.backContext.setTransform(a, b, c, d, e, f);
    this.backContext.drawImage(
      this.frontCanvas,
      0,
      0,
      screen.width,
      screen.height,
    );
  };

  public clearForeground = () => {
    this.frontContext.clearRect(
      0,
      0,
      this.frontContext.canvas.width,
      this.frontContext.canvas.height,
    );
  };

  /** Hides stale foreground pixels so the warped back buffer is fully visible. Pointer events still hit the front canvas. */
  public hideForeground = () => {
    if (this.frontCanvas.style.opacity !== "0") {
      this.frontCanvas.style.opacity = "0";
    }
  };

  public showForeground = () => {
    if (this.frontCanvas.style.opacity === "0") {
      this.frontCanvas.style.removeProperty("opacity");
    }
  };
}
