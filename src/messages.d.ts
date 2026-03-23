import type { Screen, Tile } from "./tile";

export type RenderTileMessage = {
  type: "requestTile";

  generation: number;
  index: number;
  screen: Screen;
};

export type RenderedTileMessage = {
  type: "respondTile";

  generation: number;
  imageData: Float32Array,
  tile: Tile,
}