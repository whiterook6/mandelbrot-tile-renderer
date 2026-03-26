/* global self */

import { getWorldPosition } from "./camera";
import type { RenderTileMessage, RenderedTileMessage } from "./messages";
import { getTile } from "./tile";

// Escape iteration `i` when |z| > 4; interior uses `maxIterations`.
const mandelbrotIterations = (
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
      return i;
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
  const iterations = new Uint16Array(tile.width * tile.height);
  const maxIterations = Math.min(
    16000,
    Math.floor(64 + 24 * Math.log2(camera.zoom)),
  );

  const origin = getWorldPosition(camera, screen, {
    screenX: tile.x + 0.5,
    screenY: tile.y + 0.5,
  });
  const right = getWorldPosition(camera, screen, {
    screenX: tile.x + 1.5,
    screenY: tile.y + 0.5,
  });
  const down = getWorldPosition(camera, screen, {
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
      const worldX = origin.worldX + x * dx.worldX + y * dy.worldX;
      const worldY = origin.worldY + x * dx.worldY + y * dy.worldY;
      const i = y * tile.width + x;
      iterations[i] = mandelbrotIterations(worldX, worldY, maxIterations);
    }
  }

  const response: RenderedTileMessage = {
    type: "respondTile",
    generation: camera.generation,
    iterations,
    maxIterations,
    tile,
  };
  self.postMessage(response);
});
