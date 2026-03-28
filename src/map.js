import { generateDungeon } from './dungeon.js';

// Tile types
export const FLOOR = '.';
export const WALL = '#';
export const STAIR = '>';

/**
 * Create a procedurally generated dungeon.
 * Returns { width, height, tiles, spawn } where spawn is { x, y }.
 */
export function createMap() {
  const { width, height, tiles, rooms, spawn } = generateDungeon();
  return { width, height, tiles, rooms, spawn };
}

export function getTile(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return WALL;
  return map.tiles[y][x];
}

export function isWalkable(map, x, y) {
  const tile = getTile(map, x, y);
  return tile === FLOOR || tile === STAIR;
}
