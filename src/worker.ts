/* global self */

import { getWorldPosition } from "./camera";
import type { RenderTileMessage, RenderedTileMessage } from "./messages";
import { getTile } from "./tile";

const scope = {
  generation: 0,
};

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

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
  console.log("received message", event.data);
  const { camera, screen, tileIndex } = event.data;
  if (camera.generation < scope.generation) {
    return;
  }
  scope.generation = camera.generation;
  const tile = getTile(tileIndex, screen);
  const iterations = new Uint16Array(tile.width * tile.height);
  const maxIterations = Math.min(
    4000,
    Math.floor(64 + 24 * Math.log2(camera.zoom)),
  );

  // Tile (tile.x, tile.y) is in screen space; map each pixel through the camera
  // (same inverse as getScreenPosition). Optional +0.5 samples pixel centers.
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const screenX = tile.x + x + 0.5;
      const screenY = tile.y + y + 0.5;
      const { worldX, worldY } = getWorldPosition(camera, screen, {
        screenX,
        screenY,
      });
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
