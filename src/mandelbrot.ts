import type Decimal from "decimal.js";
import { Double } from "double.js";

export const Mandelbrot = {
  escape: (worldX: Decimal, worldY: Decimal, maxIterations: number): number => {
    const cx = worldX.toNumber();
    const cy = worldY.toNumber();
    let zx = cx;
    let zy = cy;
    for (let i = 0; i < maxIterations; i++) {
      const x2 = zx * zx;
      const y2 = zy * zy;
      if (x2 + y2 > 4) {
        const r = Math.sqrt(x2 + y2);
        return i + 1 - Math.log(Math.log(r)) / Math.LN2;
      }
      const tmp = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy;
      zx = tmp;
    }
    return maxIterations;
  },

  escapeDouble: (worldX: Decimal, worldY: Decimal, maxIterations: number): number => {
    const cx = new Double(worldX.toString());
    const cy = new Double(worldY.toString());
    let zx = new Double(cx);
    let zy = new Double(cy);

    for (let i = 0; i < maxIterations; i++) {
      const zx2 = zx.mul(zx);
      const zy2 = zy.mul(zy);
      if (zx2.add(zy2).gt(4)) {
        const r = zx2.add(zy2).sqrt().toNumber();
        return i + 1 - Math.log(Math.log(r)) / Math.LN2;
      }
      const tmp = zx2.sub(zy2).add(cx);
      zy = zy.mul(2).mul(zx).add(cy);
      zx = tmp;
    }
    return maxIterations;
  },
}