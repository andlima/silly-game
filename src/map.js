import { generateDungeon } from './dungeon.js';

// Tile types
export const FLOOR = '.';
export const WALL = '#';

/**
 * Create a procedurally generated dungeon.
 * Returns { width, height, tiles, spawn } where spawn is { x, y }.
 */
export function createMap() {
  const { width, height, tiles, spawn } = generateDungeon();
  return { width, height, tiles, spawn };
}

export function getTile(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return WALL;
  return map.tiles[y][x];
}

export function isWalkable(map, x, y) {
  return getTile(map, x, y) === FLOOR;
}
