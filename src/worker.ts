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
  const { camera, screen, tileIndex } = event.data;
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

  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const i = y * tile.width + x;
      let iterationAverage = 0;
      {
        // top left
        const tlX = x - 0.5;
        const tlY = y - 0.5;
        const worldX = origin.worldX + tlX * dx.worldX + tlY * dy.worldX;
        const worldY = origin.worldY + tlX * dx.worldY + tlY * dy.worldY;
        iterationAverage += mandelbrotEscapeSmooth(worldX, worldY, maxIterations);
      }
      {
        // top right
        const trX = x + 0.5;
        const trY = y - 0.5;
        const worldX = origin.worldX + trX * dx.worldX + trY * dy.worldX;
        const worldY = origin.worldY + trX * dx.worldY + trY * dy.worldY;
        iterationAverage += mandelbrotEscapeSmooth(worldX, worldY, maxIterations);
      }
      {
        // bottom left
        const tlX = x - 0.5;
        const tlY = y + 0.5;
        const worldX = origin.worldX + tlX * dx.worldX + tlY * dy.worldX;
        const worldY = origin.worldY + tlX * dx.worldY + tlY * dy.worldY;
        iterationAverage += mandelbrotEscapeSmooth(worldX, worldY, maxIterations);
      }
      {
        // bottom right
        const brX = x + 0.5;
        const brY = y + 0.5;
        const worldX = origin.worldX + brX * dx.worldX + brY * dy.worldX;
        const worldY = origin.worldY + brX * dx.worldY + brY * dy.worldY;
        iterationAverage += mandelbrotEscapeSmooth(worldX, worldY, maxIterations);
      }

      iterations[i] = iterationAverage / 4;
    }
  }

  const response: RenderedTileMessage = {
    type: "respondTile",
    generation: camera.generation,
    iterations,
    maxIterations,
    tile,
  };
  self.postMessage(response, { transfer: [iterations.buffer] });
});
