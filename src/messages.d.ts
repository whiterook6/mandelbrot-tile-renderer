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
  imageData: Uint8ClampedArray;
  tile: Tile;
};
