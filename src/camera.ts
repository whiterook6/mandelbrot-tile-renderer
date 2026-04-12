import Decimal from "decimal.js";
import type { Screen } from "./tile";

export type Camera = {
  worldX: Decimal;
  worldY: Decimal;
  zoom: Decimal;
  rotation: number;
};

export class CameraController {
  static initialCamera: Camera = {
    worldX: new Decimal(0),
    worldY: new Decimal(0),
    zoom: new Decimal(1),
    rotation: 0,
  };

  static parseCamera({
    worldX,
    worldY,
    zoom,
    rotation,
  }: {
    worldX: string;
    worldY: string;
    zoom: string;
    rotation: string;
  }): Camera {
    return {
      worldX: new Decimal(worldX),
      worldY: new Decimal(worldY),
      zoom: new Decimal(zoom),
      rotation: parseFloat(rotation),
    };
  }

  static stringifyCamera(camera: Camera): string {
    return JSON.stringify({
      worldX: camera.worldX.toString(),
      worldY: camera.worldY.toString(),
      zoom: camera.zoom.toString(),
      rotation: camera.rotation.toString(),
    });
  }

  private camera: Camera;
  constructor(fallback?: Camera) {
    this.camera = fallback ?? CameraController.initialCamera;
  }

  loadCamera(): CameraController {
    if (!localStorage.getItem("camera")) {
      return this;
    }

    let fromLocalStorage;
    try {
      fromLocalStorage = JSON.parse(localStorage.getItem("camera")!);
      this.camera = CameraController.parseCamera(fromLocalStorage);
    } catch (error) {
      console.error("Error parsing camera from localStorage", error);
      this.camera = CameraController.initialCamera;
      this.saveCamera();
    }

    return this;
  }

  setCamera(camera: Camera): CameraController {
    this.camera = {
      ...camera,
    };
    return this;
  }

  getCamera(): Camera {
    return { ...this.camera };
  }

  saveCamera(): CameraController {
    localStorage.setItem(
      "camera",
      CameraController.stringifyCamera(this.camera),
    );
    return this;
  }

  getWorldPosition(
    screen: Screen,
    position: { screenX: number; screenY: number },
  ): { worldX: Decimal; worldY: Decimal } {
    const dx = position.screenX - screen.width / 2;
    const dy = position.screenY - screen.height / 2;
    const { worldX: wx, worldY: wy } = this.screenOffsetToWorldDelta(dx, dy);

    return {
      worldX: this.camera.worldX.add(wx),
      worldY: this.camera.worldY.add(wy),
    };
  }

  /** World offset per +1 screen pixel in X and Y (same as differencing adjacent getWorldPosition calls). */
  getBasisVectors(): {
    dx: { worldX: Decimal; worldY: Decimal };
    dy: { worldX: Decimal; worldY: Decimal };
  } {
    return {
      dx: this.screenOffsetToWorldDelta(1, 0),
      dy: this.screenOffsetToWorldDelta(0, 1),
    };
  }

  // controls

  panCamera(event: { movementX: number; movementY: number }): CameraController {
    const { worldX: dwx, worldY: dwy } = this.screenOffsetToWorldDelta(
      event.movementX,
      event.movementY,
    );

    this.camera = {
      ...this.camera,
      worldX: this.camera.worldX.sub(dwx),
      worldY: this.camera.worldY.sub(dwy),
    };

    return this;
  }

  zoomCamera(
    screen: Screen,
    event: {
      cursorX: number;
      cursorY: number;
      deltaY: number;
    },
  ): CameraController {
    const k = 0.005;
    const zoomFactor = Math.exp(-event.deltaY * k);
    const newZoom = this.camera.zoom.mul(zoomFactor);
    const ONE = new Decimal(1);

    const dx = event.cursorX - screen.width / 2;
    const dy = event.cursorY - screen.height / 2;
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);
    const scale = new Decimal(ONE.div(this.camera.zoom)).sub(ONE.div(newZoom));

    this.camera = {
      ...this.camera,
      worldX: this.camera.worldX.add(scale.mul(dx * cos + dy * sin)),
      worldY: this.camera.worldY.add(scale.mul(-dx * sin + dy * cos)),
      zoom: newZoom,
    };

    return this;
  }

  twistCamera(
    vPrev: { x: number; y: number },
    vCurr: { x: number; y: number },
  ): CameraController {
    const TWIST_EPS = 1e-3;
    const lenPrev = Math.hypot(vPrev.x, vPrev.y);
    const lenCurr = Math.hypot(vCurr.x, vCurr.y);
    if (lenPrev < TWIST_EPS || lenCurr < TWIST_EPS) {
      return this;
    }
    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const dot = vPrev.x * vCurr.x + vPrev.y * vCurr.y;
    const delta = Math.atan2(cross, dot);

    this.camera = {
      ...this.camera,
      rotation: this.camera.rotation + delta,
    };

    return this;
  }

  private screenOffsetToWorldDelta(
    screenDx: number,
    screenDy: number,
  ): { worldX: Decimal; worldY: Decimal } {
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);

    return {
      worldX: new Decimal(screenDx * cos + screenDy * sin).div(
        this.camera.zoom,
      ),
      worldY: new Decimal(-screenDx * sin + screenDy * cos).div(
        this.camera.zoom,
      ),
    };
  }
}
