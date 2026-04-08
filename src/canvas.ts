import type { Screen } from "./tile";

export const getCanvasElement = (id: string): HTMLCanvasElement => {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas with id ${id} not found`);
  }
  return canvas;
};

export const fitCanvasesToLayout = (
  primary: HTMLCanvasElement,
  mirror?: HTMLCanvasElement,
) => {
  const dpr = window.devicePixelRatio || 1;

  const r = () => {
    const w = Math.max(1, Math.floor(primary.clientWidth * dpr));
    const h = Math.max(1, Math.floor(primary.clientHeight * dpr));
    if (primary.width !== w || primary.height !== h) {
      primary.width = w;
      primary.height = h;
    }
    if (mirror && (mirror.width !== w || mirror.height !== h)) {
      mirror.width = w;
      mirror.height = h;
    }
  };

  r();
  window.addEventListener("resize", r);
  return () => {
    window.removeEventListener("resize", r);
  };
};

export const getScreen = (canvas: HTMLCanvasElement): Screen => {
  return {
    width: canvas.width,
    height: canvas.height,
    rowCount: Math.ceil(canvas.height / 100),
    columnCount: Math.ceil(canvas.width / 100),
  };
};
