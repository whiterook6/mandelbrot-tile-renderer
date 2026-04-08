import type { Screen } from "./tile";

export type Camera = {
  worldX: number;
  worldY: number;
  zoom: number;
  rotation: number;
};

export class CameraController {
  static initialCamera: Camera = {
    worldX: 0,
    worldY: 0,
    zoom: 1,
    rotation: 0,
  };

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
    } catch (error) {
      console.error("Error parsing camera from localStorage", error);
      return this;
    }

    this.camera = {
      ...CameraController.initialCamera,
      ...fromLocalStorage,
      generation: 0,
    };

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
    localStorage.setItem("camera", JSON.stringify(this.camera));
    return this;
  }

  getScreenPosition(
    screen: Screen,
    position: { worldX: number; worldY: number },
  ): { screenX: number; screenY: number } {
    const wx = position.worldX - this.camera.worldX;
    const wy = position.worldY - this.camera.worldY;
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);
    const dx = (wx * cos - wy * sin) * this.camera.zoom;
    const dy = (wx * sin + wy * cos) * this.camera.zoom;

    return {
      screenX: dx + screen.width / 2,
      screenY: dy + screen.height / 2,
    };
  }

  getWorldPosition(
    screen: Screen,
    position: { screenX: number; screenY: number },
  ): { worldX: number; worldY: number } {
    const dx = position.screenX - screen.width / 2;
    const dy = position.screenY - screen.height / 2;
    const { worldX: wx, worldY: wy } = this.screenOffsetToWorldDelta(dx, dy);

    return {
      worldX: this.camera.worldX + wx,
      worldY: this.camera.worldY + wy,
    };
  }

  getWorldBasisVectors(): {
    dx: { worldX: number; worldY: number };
    dy: { worldX: number; worldY: number };
  } {
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);
    const invZ = 1 / this.camera.zoom;
    return {
      dx: {
        worldX: cos * invZ,
        worldY: -sin * invZ,
      },
      dy: {
        worldX: sin * invZ,
        worldY: cos * invZ,
      },
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
      worldX: this.camera.worldX - dwx,
      worldY: this.camera.worldY - dwy,
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
    const newZoom = this.camera.zoom * zoomFactor;

    const dx = event.cursorX - screen.width / 2;
    const dy = event.cursorY - screen.height / 2;
    const scale = 1 / this.camera.zoom - 1 / newZoom;
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);

    this.camera = {
      ...this.camera,
      worldX: this.camera.worldX + (dx * cos + dy * sin) * scale,
      worldY: this.camera.worldY + (-dx * sin + dy * cos) * scale,
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
  ): { worldX: number; worldY: number } {
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);
    const invZ = 1 / this.camera.zoom;
    return {
      worldX: (screenDx * cos + screenDy * sin) * invZ,
      worldY: (-screenDx * sin + screenDy * cos) * invZ,
    };
  }
}
