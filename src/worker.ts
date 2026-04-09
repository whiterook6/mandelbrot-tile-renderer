/* global self */

import { CameraController } from "./camera";
import type { RenderTileMessage, RenderedTileMessage } from "./messages";
import { getTile } from "./tile";
import Decimal from "decimal.js";

const TWO = new Decimal(2);
const FOUR = new Decimal(4);
const ZERO = new Decimal(0);

const mandelbrotEscapeSmooth = (
  cx: Decimal, // constant c (world position)
  cy: Decimal,
  maxIterations: number,
): number => {
  // z starts at 0 for Mandelbrot
  let zx = ZERO;
  let zy = ZERO;

  for (let i = 0; i < maxIterations; i++) {
    const zx2 = zx.mul(zx);
    const zy2 = zy.mul(zy);

    const mag2 = zx2.plus(zy2);

    // escape check
    if (mag2.gt(FOUR)) {
      const r = Math.sqrt(mag2.toNumber());
      return i + 1 - Math.log(Math.log(r)) / Math.LN2;
    }

    // z = z^2 + c
    const newZx = zx2.minus(zy2).plus(cx);
    const newZy = zx.mul(zy).mul(TWO).plus(cy);

    zx = newZx;
    zy = newZy;
  }

  return maxIterations;
};

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
  const t0 = performance.now();
  const { camera: cameraWire, screen, tileIndex, generation } = event.data;
  const camera = CameraController.deserializeCamera(cameraWire);
  const tile = getTile(tileIndex, screen);
  const iterations = new Float32Array(tile.width * tile.height);
  const maxIterations = Math.min(
    16000,
    Math.floor(64 + 24 * Math.log2(camera.zoom.toNumber())),
  );

  const cameraController = new CameraController(camera);
  const origin = cameraController.getWorldPosition(screen, {
    screenX: tile.x + 0.5,
    screenY: tile.y + 0.5,
  });

  // Build a "basis matrix" aka delta-right and delta-down vectors.
  // Compute directly from camera transform to avoid precision loss from
  // subtracting nearly equal world coordinates at high zoom.
  const { dx, dy } = cameraController.getWorldBasisVectors();

  // render the border first. If the whole border is interior, we can skip the rest of the tile.
  let borderInterior = true;

  // top row: y = 0;
  {
    for (let x = 0; x < tile.width; x++) {
      const i = 0 * tile.width + x;
      const worldX = origin.worldX.add(dx.worldX.mul(x));
      const worldY = origin.worldY.add(dx.worldY.mul(x));
      const iteration = mandelbrotEscapeSmooth(worldX, worldY, maxIterations);

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  // left column: x = 0;
  {
    for (let y = 0; y < tile.height; y++) {
      const i = y * tile.width + 0;
      const worldX = origin.worldX.add(dy.worldX.mul(y));
      const worldY = origin.worldY.add(dy.worldY.mul(y));
      const iteration = mandelbrotEscapeSmooth(worldX, worldY, maxIterations);

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  // bottom row: y = tile.height - 1;
  {
    const yb = tile.height - 1;
    for (let x = 0; x < tile.width; x++) {
      const i = yb * tile.width + x;
      const worldX = origin.worldX.add(dx.worldX.mul(x)).add(dy.worldX.mul(yb));
      const worldY = origin.worldY.add(dx.worldY.mul(x)).add(dy.worldY.mul(yb));

      const iteration = mandelbrotEscapeSmooth(worldX, worldY, maxIterations);

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  // right column: x = tile.width - 1;
  {
    const xr = tile.width - 1;
    for (let y = 0; y < tile.height; y++) {
      const i = y * tile.width + xr;
      const worldX = origin.worldX.add(dx.worldX.mul(xr)).add(dy.worldX.mul(y));
      const worldY = origin.worldY.add(dx.worldY.mul(xr)).add(dy.worldY.mul(y));

      const iteration = mandelbrotEscapeSmooth(worldX, worldY, maxIterations);

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  if (borderInterior) {
    for (let i = 0; i < tile.width * tile.height; i++) {
      iterations[i] = maxIterations;
    }
    const response: RenderedTileMessage = {
      type: "respondTile",
      generation,
      iterations,
      maxIterations,
      tile,
    };
    console.log(
      "[tile worker] gen",
      generation,
      "tile",
      tileIndex,
      `${tile.width}×${tile.height}`,
      "maxIter",
      maxIterations,
      "interior-skip",
      `${(performance.now() - t0).toFixed(1)}ms`,
    );
    self.postMessage(response, { transfer: [iterations.buffer] });
    return;
  }

  for (let y = 1; y < tile.height - 1; y++) {
    for (let x = 1; x < tile.width - 1; x++) {
      const i = y * tile.width + x;
      const worldX = origin.worldX.add(dx.worldX.mul(x)).add(dy.worldX.mul(y));
      const worldY = origin.worldY.add(dx.worldY.mul(x)).add(dy.worldY.mul(y));
      iterations[i] = mandelbrotEscapeSmooth(worldX, worldY, maxIterations);
    }
  }

  const response: RenderedTileMessage = {
    type: "respondTile",
    generation,
    iterations,
    maxIterations,
    tile,
  };
  console.log(
    "[tile worker] gen",
    generation,
    "tile",
    tileIndex,
    `${tile.width}×${tile.height}`,
    "maxIter",
    maxIterations,
    "full",
    `${(performance.now() - t0).toFixed(1)}ms`,
  );
  self.postMessage(response, { transfer: [iterations.buffer] });
});
