import type { Screen } from "./tile";

export type CameraView = {
  worldX: number;
  worldY: number;
  zoom: number;
};

export type Camera = CameraView & {
  generation: number;
};

export type View = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const initialCamera: Camera = {
  worldX: 0,
  worldY: 0,
  zoom: 1,
  generation: 0,
};

export const cameraFromView = (
  view: CameraView,
  generation: number,
): Camera => ({
  ...view,
  generation,
});

export const panView = (
  view: CameraView,
  event: {
    movementX: number;
    movementY: number;
  },
): CameraView => {
  return {
    worldX: view.worldX - event.movementX / view.zoom,
    worldY: view.worldY - event.movementY / view.zoom,
    zoom: view.zoom,
  };
};

export const zoomView = (
  view: CameraView,
  screen: Screen,
  event: {
    cursorX: number;
    cursorY: number;
    deltaY: number;
  },
): CameraView => {
  const k = 0.005;
  const zoomFactor = Math.exp(-event.deltaY * k);
  const newZoom = view.zoom * zoomFactor;

  return {
    worldX:
      view.worldX +
      (event.cursorX - screen.width / 2) * (1 / view.zoom - 1 / newZoom),
    worldY:
      view.worldY +
      (event.cursorY - screen.height / 2) * (1 / view.zoom - 1 / newZoom),
    zoom: newZoom,
  };
};

/**
 * Sets ctx transform so that drawImage(source, 0, 0, w, h) maps source bitmap
 * coordinates (correct for `from`) onto the canvas such that they align with `to`.
 * Caller should save/restore around this and the drawImage call.
 */
export const applyWarpTransform = (
  ctx: CanvasRenderingContext2D,
  from: CameraView,
  to: CameraView,
  screen: Screen,
): void => {
  const w = screen.width;
  const h = screen.height;
  const s = to.zoom / from.zoom;
  const e = (w / 2) * (1 - s) - (to.worldX - from.worldX) * to.zoom;
  const f = (h / 2) * (1 - s) - (to.worldY - from.worldY) * to.zoom;
  ctx.setTransform(s, 0, 0, s, e, f);
};

export const getView = (camera: CameraView, screen: Screen): View => {
  const worldPerPixel = 1 / camera.zoom;
  const worldWidth = screen.width * worldPerPixel;
  const worldHeight = screen.height * worldPerPixel;
  return {
    x: camera.worldX - worldWidth / 2,
    y: camera.worldY - worldHeight / 2,
    width: worldWidth,
    height: worldHeight,
  };
};

export const getWorldPosition = (
  camera: CameraView,
  screen: Screen,
  position: { screenX: number; screenY: number },
): { worldX: number; worldY: number } => {
  const worldPerPixel = 1 / camera.zoom;
  const worldX =
    camera.worldX + (position.screenX - screen.width / 2) * worldPerPixel;
  const worldY =
    camera.worldY + (position.screenY - screen.height / 2) * worldPerPixel;
  return { worldX, worldY };
};

export const getScreenPosition = (
  camera: CameraView,
  screen: Screen,
  position: { worldX: number; worldY: number },
): { screenX: number; screenY: number } => {
  const screenX =
    (position.worldX - camera.worldX) * camera.zoom + screen.width / 2;
  const screenY =
    (position.worldY - camera.worldY) * camera.zoom + screen.height / 2;
  return { screenX, screenY };
};
