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

const cellContainingPixel = (
  px: number,
  py: number,
  screen: Screen,
): { column: number; row: number } => {
  let column = 0;
  for (let c = 0; c < screen.columnCount; c++) {
    const left = Math.floor((c * screen.width) / screen.columnCount);
    const right = Math.floor(((c + 1) * screen.width) / screen.columnCount);
    if (px >= left && px < right) {
      column = c;
      break;
    }
  }
  let row = 0;
  for (let r = 0; r < screen.rowCount; r++) {
    const top = Math.floor((r * screen.height) / screen.rowCount);
    const bottom = Math.floor(((r + 1) * screen.height) / screen.rowCount);
    if (py >= top && py < bottom) {
      row = r;
      break;
    }
  }
  return { column, row };
};

/**
 * Tile indices in a square spiral outward from the cell that contains the
 * screen center, using the same column/row layout as {@link getTile}.
 */
export const spiralTileIndicesFromScreenCenter = (screen: Screen): number[] => {
  const { column: col0, row: row0 } = cellContainingPixel(
    screen.width / 2,
    screen.height / 2,
    screen,
  );
  const { columnCount, rowCount } = screen;
  const seen = new Set<number>();
  const out: number[] = [];

  const emit = (col: number, row: number) => {
    if (col < 0 || col >= columnCount || row < 0 || row >= rowCount) {
      return;
    }
    const idx = col * rowCount + row;
    if (seen.has(idx)) {
      return;
    }
    seen.add(idx);
    out.push(idx);
  };

  emit(col0, row0);
  for (let k = 1; ; k++) {
    const before = out.length;
    for (let col = col0 - k; col <= col0 + k; col++) {
      emit(col, row0 - k);
    }
    for (let row = row0 - k + 1; row <= row0 + k; row++) {
      emit(col0 + k, row);
    }
    for (let col = col0 + k - 1; col >= col0 - k; col--) {
      emit(col, row0 + k);
    }
    for (let row = row0 + k - 1; row >= row0 - k + 1; row--) {
      emit(col0 - k, row);
    }
    if (out.length === before) {
      break;
    }
  }

  return out;
};
