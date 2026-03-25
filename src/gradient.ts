export type Gradient = (
  inside: boolean,
  iterationCount: number,
  maxIterations: number,
) => [number, number, number, number];

export const simpleGradient: Gradient = (
  inside,
  iterationCount,
  maxIterations,
) => {
  if (inside) {
    return [255, 255, 255, 255];
  }
  const brightness = Math.floor((255 * iterationCount) / maxIterations);
  return [brightness, brightness, brightness, 255];
};

/** Full-saturation HSV to sRGB, h in [0, 360), s and v in [0, 1]. */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
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
  ];
}

/** Maps escape time to hue around the wheel (red → yellow → green → cyan → blue → magenta). */
export const rainbowGradient: Gradient = (
  inside,
  iterationCount,
  maxIterations,
) => {
  if (inside) {
    return [255, 255, 255, 255];
  }
  if (maxIterations <= 0) {
    return [0, 0, 0, 255];
  }
  const hue = (360 * iterationCount) / maxIterations;
  const [r, g, b] = hsvToRgb(hue, 1, 1);
  return [r, g, b, 255];
};
