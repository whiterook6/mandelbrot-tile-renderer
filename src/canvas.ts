import type { Screen } from "./tile";

export const getCanvas = (
  id: string,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas with id ${id} not found`);
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context unavailable");
  }
  return { canvas, context };
};

export const fitCanvasToLayout = (canvas: HTMLCanvasElement) => {
  const dpr = window.devicePixelRatio || 1;

  const r = () => {
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
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
