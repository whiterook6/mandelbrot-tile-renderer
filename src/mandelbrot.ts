import Decimal from "decimal.js";

export type Orbit = {
  zxn: number[];
  zyn: number[];
  escapedAt: number;
}

export const Mandelbrot = {
  ZERO: new Decimal(0),
  ONE: new Decimal(1),
  TWO: new Decimal(2),
  FOUR: new Decimal(4),

  calculateOrbit: (
    cx: Decimal,
    cy: Decimal,
    maxIterations: number
  ): Orbit => {
    let zx = Mandelbrot.ZERO;
    let zy = Mandelbrot.ZERO;
    let escapedAt = maxIterations;

    const zxn = new Array<number>(maxIterations);
    const zyn = new Array<number>(maxIterations);

    for (let i = 0; i < maxIterations; i++) {
      zxn[i] = zx.toNumber();
      zyn[i] = zy.toNumber();

      const zx2 = zx.mul(zx);
      const zy2 = zy.mul(zy);

      const newZx = zx2.minus(zy2).plus(cx);
      const newZy = zx.mul(zy).mul(Mandelbrot.TWO).plus(cy);

      if (zx2.plus(zy2).gt(Mandelbrot.FOUR) && escapedAt === maxIterations) {
        escapedAt = i;
      }

      zx = newZx;
      zy = newZy;
    }

    return {
      zxn,
      zyn,
      escapedAt,
    }
  },

  perturbEscapeSmooth: (
    orbit: Orbit,    // reference orbit (imag)
    dcx: number,     // delta from reference point
    dcy: number,
  ): number => {
    let dzx = 0;
    let dzy = 0;
    const { zxn, zyn } = orbit;
    const STABILITY_WARMUP_ITERATIONS = 4;
    const STABILITY_RELATIVE_EPSILON = 1e-3;
  
    const maxIterations = orbit.zxn.length;
    for (let i = 0; i < maxIterations; i++) {
      const Zx = zxn[i];
      const Zy = zyn[i];
  
      // dz = 2*Z*dz + dz^2 + dc
  
      // 2 * Z * dz
      const ax = 2 * (Zx * dzx - Zy * dzy);
      const ay = 2 * (Zx * dzy + Zy * dzx);
  
      // dz^2
      const bx = dzx * dzx - dzy * dzy;
      const by = 2 * dzx * dzy;
  
      // next dz
      dzx = ax + bx + dcx;
      dzy = ay + by + dcy;
  
      // reconstruct z = Z + dz
      const zx = Zx + dzx;
      const zy = Zy + dzy;
  
      const mag2 = zx * zx + zy * zy;
  
      if (mag2 > 4) {
        const r = Math.sqrt(mag2);
        return i + 1 - Math.log(Math.log(r)) / Math.LN2;
      }
  
      // Stability check:
      // - Skip the first few iterations where reference Z starts near zero.
      // - Scale the threshold by reconstructed |z| to avoid immediate false
      //   fallback at low zoom where dc is not tiny relative to |Z|.
      const dzMag2 = dzx * dzx + dzy * dzy;
      const zMag2 = zx * zx + zy * zy;
  
      if (
        i >= STABILITY_WARMUP_ITERATIONS &&
        dzMag2 > STABILITY_RELATIVE_EPSILON * (zMag2 + 1)
      ) {
        return -1; // fallback required
      }
    }
  
    return maxIterations;
  },

  escapeSmooth: (
    cx: number,
    cy: number,
    maxIterations: number
  ): number => {
    let zx = 0;
    let zy = 0;

    for (let i = 0; i < maxIterations; i++) {
      const zx2 = zx * zx;
      const zy2 = zy * zy;
      const mag2 = zx2 + zy2;

      if (mag2 > 4) {
        const r = Math.sqrt(mag2);
        return i + 1 - Math.log(Math.log(r)) / Math.LN2;
      }

      const nextZx = zx2 - zy2 + cx;
      const nextZy = 2 * zx * zy + cy;
      zx = nextZx;
      zy = nextZy;
    }

    return maxIterations;
  },
}