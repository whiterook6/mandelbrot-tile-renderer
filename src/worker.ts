/* global self */

import { getWorldPosition, type Camera } from "./camera";
import { getTile, type Screen, type Tile } from "./tile";

type RenderTileMessage = {
  type: "requestTile";
  camera: Camera;
  screen: Screen;
  tileIndex: number;
};

type RenderedTileMessage = {
  type: "respondTile";
  generation: number;
  imageData: Uint8ClampedArray;
  tile: Tile;
};

const scope = {
  generation: 0,
};

// get the pixel color at the world position
// inside the mandelbrot set = black
// outside the mandelbrot set = gradient
const mandelbrot = (
  worldX: number,
  worldY: number,
): [number, number, number, number] => {
  const maxIterations = 1000;
  let zx = worldX;
  let zy = worldY;
  for (let i = 0; i < maxIterations; i++) {
    const x2 = zx * zx;
    const y2 = zy * zy;
    if (x2 + y2 > 4) {
      const brightness = Math.floor((255 * i) / maxIterations);
      return [brightness, brightness, brightness, 255];
    }
    const tmp = zx * zx - zy * zy + worldX;
    zy = 2 * zx * zy + worldY;
    zx = tmp;
  }
  return [0, 0, 0, 1];
};

self.addEventListener(
  "message",
  async (event: MessageEvent<RenderTileMessage>) => {
    console.log("received message", event.data);
    const { camera, screen, tileIndex } = event.data;
    if (camera.generation < scope.generation) {
      return;
    }
    scope.generation = camera.generation;
    const tile = getTile(tileIndex, screen);
    const imageData = new Uint8ClampedArray(tile.width * tile.height * 4);

    // Tile (tile.x, tile.y) is in screen space; map each pixel through the camera
    // (same inverse as getScreenPosition). Optional +0.5 samples pixel centers.
    for (let y = 0; y < tile.height; y++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (scope.generation !== camera.generation) {
        return;
      }

      for (let x = 0; x < tile.width; x++) {
        const screenX = tile.x + x + 0.5;
        const screenY = tile.y + y + 0.5;
        const { worldX, worldY } = getWorldPosition(camera, screen, {
          screenX,
          screenY,
        });
        const [r, g, b, a] = mandelbrot(worldX, worldY);
        const index = (y * tile.width + x) * 4;
        imageData[index + 0] = r;
        imageData[index + 1] = g;
        imageData[index + 2] = b;
        imageData[index + 3] = a;
      }
    }

    if (scope.generation === camera.generation) {
      console.log("responding to tile", tileIndex);
      const response: RenderedTileMessage = {
        type: "respondTile",
        generation: camera.generation,
        imageData,
        tile,
      };
      self.postMessage(response);
    }
  },
);
