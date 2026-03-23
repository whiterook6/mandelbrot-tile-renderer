export type Screen = {
  width: number;
  height: number;
  rowCount: number;
  columnCount: number;
};

export type Tile = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const getTile = (index: number, screen: Screen) => {
  const tileWidth = screen.width / screen.columnCount;
  const tileHeight = screen.height / screen.rowCount;
  const column = Math.floor(index / screen.rowCount);
  const row = index % screen.rowCount;
  return {
    x: column * tileWidth,
    y: row * tileHeight,
    width: tileWidth,
    height: tileHeight,
  };
};
