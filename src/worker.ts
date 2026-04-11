/* global self */

import { CameraController } from "./camera";
import { Mandelbrot } from "./mandelbrot";
import type { RenderTileMessage, RenderedTileMessage } from "./messages";
import { getTile } from "./tile";

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
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

  let orbit = Mandelbrot.calculateOrbit(
    origin.worldX,
    origin.worldY,
    maxIterations
  );
  iterations[0] = orbit.escapedAt;

  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const i = y * tile.width + x;
      if (i === 0) {
        continue;
      }
      const worldXOffset = dx.worldX.mul(x).add(dy.worldX.mul(y));
      const worldYOffset = dx.worldY.mul(x).add(dy.worldY.mul(y));
      const dcx = worldXOffset.toNumber();
      const dcy = worldYOffset.toNumber();

      const perturbIteration = Mandelbrot.perturbEscapeSmooth(
        orbit,
        dcx,
        dcy
      );

      if (perturbIteration === -1){
        orbit = Mandelbrot.calculateOrbit(
          origin.worldX.add(worldXOffset),
          origin.worldY.add(worldYOffset),
          maxIterations
        );
        iterations[i] = orbit.escapedAt;
        continue;
      }

      iterations[i] = perturbIteration;
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
