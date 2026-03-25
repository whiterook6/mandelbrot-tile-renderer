import type { Screen } from "./tile";

export type Camera = {
  worldX: number;
  worldY: number;
  zoom: number;
  /** Counter-clockwise rotation of the view on screen, radians. */
  rotation: number;
  generation: number;
};

export const initialCamera: Camera = {
  worldX: 0,
  worldY: 0,
  zoom: 1,
  rotation: 0,
  generation: 0,
};

const cosSin = (rotation: number) => ({
  cos: Math.cos(rotation),
  sin: Math.sin(rotation),
});

/** Screen offset from pivot → world offset from camera (before adding camera). */
export const screenOffsetToWorldDelta = (
  camera: Camera,
  screenDx: number,
  screenDy: number,
): { worldX: number; worldY: number } => {
  const { cos, sin } = cosSin(camera.rotation);
  const invZ = 1 / camera.zoom;
  return {
    worldX: (screenDx * cos + screenDy * sin) * invZ,
    worldY: (-screenDx * sin + screenDy * cos) * invZ,
  };
};

export const panCamera = (
  camera: Camera,
  event: {
    movementX: number;
    movementY: number;
  },
): Camera => {
  const { worldX: dwx, worldY: dwy } = screenOffsetToWorldDelta(
    camera,
    event.movementX,
    event.movementY,
  );

  return {
    ...camera,
    worldX: camera.worldX - dwx,
    worldY: camera.worldY - dwy,
    generation: camera.generation + 1,
  };
};

export const zoomCamera = (
  camera: Camera,
  screen: Screen,
  event: {
    cursorX: number;
    cursorY: number;
    deltaY: number;
  },
): Camera => {
  const k = 0.005;
  const zoomFactor = Math.exp(-event.deltaY * k);
  const newZoom = camera.zoom * zoomFactor;

  const dx = event.cursorX - screen.width / 2;
  const dy = event.cursorY - screen.height / 2;
  const scale = 1 / camera.zoom - 1 / newZoom;
  const { cos, sin } = cosSin(camera.rotation);

  return {
    ...camera,
    worldX: camera.worldX + (dx * cos + dy * sin) * scale,
    worldY: camera.worldY + (-dx * sin + dy * cos) * scale,
    zoom: newZoom,
    generation: camera.generation + 1,
  };
};

const TWIST_EPS = 1e-3;

export const twistCamera = (
  camera: Camera,
  vPrev: { x: number; y: number },
  vCurr: { x: number; y: number },
): Camera => {
  const lenPrev = Math.hypot(vPrev.x, vPrev.y);
  const lenCurr = Math.hypot(vCurr.x, vCurr.y);
  if (lenPrev < TWIST_EPS || lenCurr < TWIST_EPS) {
    return camera;
  }
  const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
  const dot = vPrev.x * vCurr.x + vPrev.y * vCurr.y;
  const delta = Math.atan2(cross, dot);

  return {
    ...camera,
    rotation: camera.rotation + delta,
    generation: camera.generation + 1,
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeCamera = (fallback: Camera, stored: unknown): Camera => {
  if (!isPlainObject(stored)) {
    return { ...fallback, generation: 0 };
  }

  const pick = (key: keyof Camera): number => {
    const v = stored[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    return fallback[key];
  };

  let zoom = pick("zoom");
  if (zoom <= 0) {
    zoom = fallback.zoom;
  }

  return {
    worldX: pick("worldX"),
    worldY: pick("worldY"),
    zoom,
    rotation: pick("rotation"),
    generation: 0,
  };
};

export const getWorldPosition = (
  camera: Camera,
  screen: Screen,
  position: { screenX: number; screenY: number },
): { worldX: number; worldY: number } => {
  const dx = position.screenX - screen.width / 2;
  const dy = position.screenY - screen.height / 2;
  const { worldX: wx, worldY: wy } = screenOffsetToWorldDelta(camera, dx, dy);
  return {
    worldX: camera.worldX + wx,
    worldY: camera.worldY + wy,
  };
};

export const getScreenPosition = (
  camera: Camera,
  screen: Screen,
  position: { worldX: number; worldY: number },
): { screenX: number; screenY: number } => {
  const wx = position.worldX - camera.worldX;
  const wy = position.worldY - camera.worldY;
  const { cos, sin } = cosSin(camera.rotation);
  const dx = (wx * cos - wy * sin) * camera.zoom;
  const dy = (wx * sin + wy * cos) * camera.zoom;
  return {
    screenX: dx + screen.width / 2,
    screenY: dy + screen.height / 2,
  };
};
