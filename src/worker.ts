/* global self */

import { CameraController } from "./camera";
import type { RenderTileMessage, RenderedTileMessage } from "./messages";
import { getTile } from "./tile";

// Smooth escape time when |z|² > 4: ν = n + 1 − ln(ln|z|) / ln 2 (continuous iteration).
// Interior uses `maxIterations`.
const mandelbrotEscapeSmooth = (
  worldX: number,
  worldY: number,
  maxIterations: number,
): number => {
  let zx = worldX;
  let zy = worldY;
  for (let i = 0; i < maxIterations; i++) {
    const x2 = zx * zx;
    const y2 = zy * zy;
    if (x2 + y2 > 4) {
      const r = Math.sqrt(x2 + y2);
      return i + 1 - Math.log(Math.log(r)) / Math.LN2;
    }
    const tmp = zx * zx - zy * zy + worldX;
    zy = 2 * zx * zy + worldY;
    zx = tmp;
  }
  return maxIterations;
};

// const juliaIterations = (
//   worldX: number,
//   worldY: number,
//   maxIterations: number,
// ): number => {
//   // z starts at the pixel
//   let zx = worldX;
//   let zy = worldY;

//   // fixed constant c
//   const cx = -0.835;
//   const cy = 0.312;

//   for (let i = 0; i < maxIterations; i++) {
//     const x2 = zx * zx;
//     const y2 = zy * zy;

//     if (x2 + y2 > 4) {
//       return i;
//     }

//     const tmp = x2 - y2 + cx;
//     zy = 2 * zx * zy + cy;
//     zx = tmp;
//   }

//   return maxIterations;
// };

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
  const { camera, screen, tileIndex, generation } = event.data;
  const tile = getTile(tileIndex, screen);
  const iterations = new Float32Array(tile.width * tile.height);
  const maxIterations = Math.min(
    16000,
    Math.floor(64 + 24 * Math.log2(camera.zoom)),
  );

  const cameraController = new CameraController(camera);
  const origin = cameraController.getWorldPosition(screen, {
    screenX: tile.x + 0.5,
    screenY: tile.y + 0.5,
  });

  // build a "basis matrix" aka delta-right and delta-down vectors
  // to make looping simpler
  const right = cameraController.getWorldPosition(screen, {
    screenX: tile.x + 1.5,
    screenY: tile.y + 0.5,
  });
  const down = cameraController.getWorldPosition(screen, {
    screenX: tile.x + 0.5,
    screenY: tile.y + 1.5,
  });
  const dx = {
    worldX: right.worldX - origin.worldX,
    worldY: right.worldY - origin.worldY,
  };
  const dy = {
    worldX: down.worldX - origin.worldX,
    worldY: down.worldY - origin.worldY,
  };

  // render the border first. If the whole border is interior, we can skip the rest of the tile.
  let borderInterior = true;

  // top row: y = 0;
  {
    for (let x = 0; x < tile.width; x++) {
      const i = 0 * tile.width + x;
      const worldX = origin.worldX + x * dx.worldX;
      const worldY = origin.worldY;
      const iteration = mandelbrotEscapeSmooth(
        worldX,
        worldY,
        maxIterations,
      );

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
      const worldX = origin.worldX;
      const worldY = origin.worldY + y * dy.worldY;
      const iteration = mandelbrotEscapeSmooth(
        worldX,
        worldY,
        maxIterations,
      );

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  // bottom row: y = tile.height - 1;
  {
    for (let x = 0; x < tile.width; x++) {
      const i = (tile.height - 1) * tile.width + x;
      const worldX = origin.worldX + x * dx.worldX;
      const worldY = origin.worldY + (tile.height - 1) * dy.worldY;
    
      const iteration = mandelbrotEscapeSmooth(
        worldX,
        worldY,
        maxIterations,
      );

      if (iteration < maxIterations) {
        borderInterior = false;
      }

      iterations[i] = iteration;
    }
  }

  // right column: x = tile.width - 1;
  {
    for (let y = 0; y < tile.height; y++) {
      const i = y * tile.width + (tile.width - 1);
      const worldX = origin.worldX + (tile.width - 1) * dx.worldX;
      const worldY = origin.worldY + y * dy.worldY;

      const iteration = mandelbrotEscapeSmooth(
        worldX,
        worldY,
        maxIterations,
      );

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
    self.postMessage(response, { transfer: [iterations.buffer] });
    return;
  }

  for (let y = 1; y < tile.height - 1; y++) {
    for (let x = 1; x < tile.width - 1; x++) {
      const i = y * tile.width + x;
      const worldX = origin.worldX + x * dx.worldX + y * dy.worldX;
      const worldY = origin.worldY + x * dx.worldY + y * dy.worldY;
      iterations[i] = mandelbrotEscapeSmooth(
        worldX,
        worldY,
        maxIterations,
      );
    }
  }

  const response: RenderedTileMessage = {
    type: "respondTile",
    generation,
    iterations,
    maxIterations,
    tile,
  };
  self.postMessage(response, { transfer: [iterations.buffer] });
});
