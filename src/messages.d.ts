import type { Screen, Tile } from "./tile";
import type { Camera } from "./camera";

export type RenderTileMessage = {
  type: "requestTile";
  camera: Camera;
  tileIndex: number;
  screen: Screen;
};

export type RenderedTileMessage = {
  type: "respondTile";

  generation: number;
  /** Escape iteration per pixel; interior pixels use `maxIterations`. */
  iterations: Uint16Array;
  maxIterations: number;
  tile: Tile;
};
