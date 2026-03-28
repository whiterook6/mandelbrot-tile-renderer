import { Renderer } from "./renderer";

export type Gradient = {
  label: string,
  fn: (
    inside: boolean,
    iterationCount: number,
    maxIterations: number,
  ) => [number, number, number, number]
};

const gradients: Gradient[] = [{
  label: "Rainbow",
  fn: (inside: boolean, iterationCount: number, maxIterations: number): [number, number, number, number] => {
    if (inside) {
      return [255, 255, 255, 255];
    }
    const hue = (iterationCount / maxIterations) * 360;
    const saturation = 1;
    const value = 1;
    const c = value * saturation;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value - c;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (hue < 60) {
      rp = c;
      gp = x;
    } else if (hue < 120) {
      rp = x;
      gp = c;
    } else if (hue < 180) {
      gp = c;
      bp = x;
    } else if (hue < 240) {
      gp = x;
      bp = c;
    } else if (hue < 300) {
      rp = x;
      bp = c;
    } else {
      rp = c;
      bp = x;
    }
    return [
      Math.round((rp + m) * 255),
      Math.round((gp + m) * 255),
      Math.round((bp + m) * 255),
      255,
    ];
  }
}, {
  label: "Black & white",
  fn: (inside: boolean, iterationCount: number, maxIterations: number): [number, number, number, number] => {
    if (inside) {
      return [255, 255, 255, 255];
    }
    const g = Math.round((iterationCount / maxIterations) * 255);
    return [g, g, g, 255];
  }
}]

/** Samples escape-time colors with the same fn as the renderer (outside points only). */
const PREVIEW_STEPS = 256;

const rgbaToCss = ([r, g, b, a]: [number, number, number, number]): string =>
  `rgba(${r},${g},${b},${a / 255})`;

export function gradientPreviewBackground(gradient: Gradient): string {
  const max = PREVIEW_STEPS;
  const parts: string[] = [];
  for (let i = 0; i < max; i++) {
    const pct = (i / (max - 1)) * 100;
    parts.push(`${rgbaToCss(gradient.fn(false, i, max))} ${pct}%`);
  }
  return `linear-gradient(to right, ${parts.join(", ")})`;
}

export const GradientController = {
  selector: document.getElementById("gradient-select") as HTMLSelectElement,
  preview: document.getElementById("gradient-preview") as HTMLDivElement,
  gradients,
  currentGradient: gradients[0],
  setGradient: (label: string) => {
    const gradient = gradients.find(g => g.label === label);
    if (gradient) {
      GradientController.currentGradient = gradient;
      GradientController.applyPreviewGradient();
    }
  },
  applyPreviewGradient: () => {
    GradientController.preview.style.background = gradientPreviewBackground(
      GradientController.currentGradient,
    );
  },
  init: (renderer: Renderer) => {
    GradientController.selector.innerHTML = "";
    GradientController.gradients.forEach(gradient => {
      const option = document.createElement("option");
      option.value = gradient.label;
      option.textContent = gradient.label;
      GradientController.selector.appendChild(option);
    });
    GradientController.selector.value = GradientController.currentGradient.label;
    GradientController.applyPreviewGradient();
    GradientController.selector.onchange = () => {
      if (GradientController.currentGradient.label === GradientController.selector.value) {
        return;
      }
      GradientController.setGradient(GradientController.selector.value);
      renderer.rerender();
    };
  }
}

