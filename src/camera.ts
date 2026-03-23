import type { Screen } from "./tile";

export type Camera = {
  worldX: number;
  worldY: number;
  zoom: number;
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

export const panCamera = (
  camera: Camera,
  event: {
    movementX: number;
    movementY: number;
  },
): Camera => {
  const deltaX = event.movementX;
  const deltaY = event.movementY;

  return {
    worldX: camera.worldX - deltaX / camera.zoom,
    worldY: camera.worldY - deltaY / camera.zoom,
    zoom: camera.zoom,
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

  return {
    worldX:
      camera.worldX +
      (event.cursorX - screen.width / 2) * (1 / camera.zoom - 1 / newZoom),
    worldY:
      camera.worldY +
      (event.cursorY - screen.height / 2) * (1 / camera.zoom - 1 / newZoom),
    zoom: newZoom,
    generation: camera.generation + 1,
  };
};

export const getView = (camera: Camera, screen: Screen): View => {
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
  camera: Camera,
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
  camera: Camera,
  screen: Screen,
  position: { worldX: number; worldY: number },
): { screenX: number; screenY: number } => {
  const screenX =
    (position.worldX - camera.worldX) * camera.zoom + screen.width / 2;
  const screenY =
    (position.worldY - camera.worldY) * camera.zoom + screen.height / 2;
  return { screenX, screenY };
};
