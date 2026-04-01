import type { Screen, Tile } from "./tile";

export type RenderTileMessage = {
  type: "requestTile";
  camera: Camera;
  generation: number;
  tileIndex: number;
  screen: Screen;
};

export type RenderedTileMessage = {
  type: "respondTile";
  generation: number;
  /** Smooth escape time per pixel (`Float32Array`); interior pixels use `maxIterations`. */
  iterations: Float32Array;
  maxIterations: number;
  tile: Tile;
};
