import Decimal from "decimal.js";
import type { Screen } from "./tile";

export type Camera = {
  worldX: Decimal;
  worldY: Decimal;
  zoom: Decimal;
  rotation: number;
};

/** Structured-clone-safe form for `postMessage` (e.g. to workers). */
export type SerializedCamera = {
  worldX: string;
  worldY: string;
  zoom: string;
  rotation: string;
};

export class CameraController {
  static initialCamera: Camera = {
    worldX: new Decimal(0),
    worldY: new Decimal(0),
    zoom: new Decimal(1),
    rotation: 0,
  };

  static deserializeCamera(data: SerializedCamera): Camera {
    return {
      worldX: new Decimal(data.worldX),
      worldY: new Decimal(data.worldY),
      zoom: new Decimal(data.zoom),
      rotation: parseFloat(data.rotation),
    };
  }

  static serializeCamera(camera: Camera): SerializedCamera {
    return {
      worldX: camera.worldX.toString(),
      worldY: camera.worldY.toString(),
      zoom: camera.zoom.toString(),
      rotation: camera.rotation.toFixed(10),
    };
  }

  private camera: Camera;
  constructor(fallback?: Camera) {
    this.camera = fallback ?? CameraController.initialCamera;
  }

  loadCamera(): CameraController {
    const raw = localStorage.getItem("camera");
    if (!raw) {
      return this;
    }

    let parsed: SerializedCamera;
    try {
      parsed = JSON.parse(raw) as SerializedCamera;
    } catch (error) {
      console.error("Error parsing camera from localStorage", error);
      return this;
    }

    if (!parsed.worldX || !parsed.worldY || !parsed.zoom || !parsed.rotation) {
      return this;
    }

    this.camera = CameraController.deserializeCamera(parsed);
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
    const serialized = CameraController.serializeCamera(this.camera);
    localStorage.setItem("camera", JSON.stringify(serialized));
    return this;
  }

  getWorldPosition(
    screen: Screen,
    position: {
      screenX: number;
      screenY: number;
    },
  ): { worldX: Decimal; worldY: Decimal } {
    const dx = position.screenX - screen.width / 2;
    const dy = position.screenY - screen.height / 2;
    const { worldX: wx, worldY: wy } = this.screenOffsetToWorldDelta(dx, dy);

    return {
      worldX: this.camera.worldX.add(wx),
      worldY: this.camera.worldY.add(wy),
    };
  }

  getWorldBasisVectors(): {
    dx: { worldX: Decimal; worldY: Decimal };
    dy: { worldX: Decimal; worldY: Decimal };
  } {
    const cos = Decimal.cos(this.camera.rotation);
    const sin = Decimal.sin(this.camera.rotation);

    return {
      dx: {
        worldX: cos.div(this.camera.zoom),
        worldY: sin.div(this.camera.zoom).neg(),
      },
      dy: {
        worldX: sin.div(this.camera.zoom),
        worldY: cos.div(this.camera.zoom),
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
      worldX: this.camera.worldX.minus(dwx),
      worldY: this.camera.worldY.minus(dwy),
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

    const dx = event.cursorX - screen.width / 2;
    const dy = event.cursorY - screen.height / 2;
    const one = new Decimal(1);
    const oneOverZoom = one.div(this.camera.zoom);
    const oneOverNewZoom = one.div(newZoom);
    const scale = oneOverZoom.minus(oneOverNewZoom);
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);

    this.camera = {
      ...this.camera,
      worldX: this.camera.worldX.add(
        new Decimal(dx * cos + dy * sin).mul(scale),
      ),
      worldY: this.camera.worldY.add(
        new Decimal(-dx * sin + dy * cos).mul(scale),
      ),
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
