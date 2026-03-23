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
  const column = Math.floor(index / screen.rowCount);
  const row = index % screen.rowCount;
  const left = Math.floor((column * screen.width) / screen.columnCount);
  const right = Math.floor(((column + 1) * screen.width) / screen.columnCount);
  const top = Math.floor((row * screen.height) / screen.rowCount);
  const bottom = Math.floor(((row + 1) * screen.height) / screen.rowCount);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};
