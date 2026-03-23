/* global self */

import type { RenderedTileMessage, RenderTileMessage } from "./messages";
import { getTile } from "./tile";

const scope = {
  generation: 0
};

self.addEventListener("message", (event: MessageEvent<RenderTileMessage>) => {
  const msg = event.data;
  scope.generation = msg.generation;
  const tile = getTile(msg.index, msg.screen);
  const imageData = new Float32Array(tile.width * tile.height * 4);

  const response: RenderedTileMessage = {
    type: "respondTile",
    generation: msg.generation,
    imageData,
    tile,
  };

  // do math

  if (scope.generation === msg.generation) {
    self.postMessage(response);
  }
});
