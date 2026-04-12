/* global self */

import Decimal from "decimal.js";
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

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
  const { screen, tileIndex, generation } = event.data;
  const camera = {
    worldX: new Decimal(event.data.camera.worldX),
    worldY: new Decimal(event.data.camera.worldY),
    zoom: new Decimal(event.data.camera.zoom),
    rotation: event.data.camera.rotation,
  };
  const tile = getTile(tileIndex, screen);
  const iterations = new Float32Array(tile.width * tile.height);
  const maxIterations = Math.min(
    32_000,
    Math.floor(64 + 24 * Math.log2(parseFloat(event.data.camera.zoom))),
  );

  const cameraController = new CameraController(camera);
  const origin = cameraController.getWorldPosition(screen, {
    screenX: tile.x + 0.5,
    screenY: tile.y + 0.5,
  });

  const { dx, dy } = cameraController.getBasisVectors();

  let i = 0;
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const worldX = origin.worldX.add(dx.worldX.mul(x)).add(dy.worldX.mul(y));
      const worldY = origin.worldY.add(dx.worldY.mul(x)).add(dy.worldY.mul(y));
      iterations[i++] = mandelbrotEscapeSmooth(
        worldX.toNumber(),
        worldY.toNumber(),
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
