// Tile types
export const FLOOR = '.';
export const WALL = '#';

/**
 * Create a hardcoded starter room — rectangular with walls on all sides.
 * Returns a 2D array [y][x] of tile characters.
 */
export function createMap() {
  const width = 40;
  const height = 20;
  const tiles = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push(WALL);
      } else {
        row.push(FLOOR);
      }
    }
    tiles.push(row);
  }

  return { width, height, tiles };
}

export function getTile(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return WALL;
  return map.tiles[y][x];
}

export function isWalkable(map, x, y) {
  return getTile(map, x, y) === FLOOR;
}
