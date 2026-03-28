import { FLOOR, WALL } from './map.js';

/**
 * Generate a procedural dungeon using a "place random rooms then connect" algorithm.
 * Returns { width, height, tiles, rooms, spawn } where:
 *   - tiles is a 2D array [y][x] of tile characters
 *   - rooms is an array of { x, y, w, h } (floor area, not including walls)
 *   - spawn is { x, y } for the player start position
 */
export function generateDungeon() {
  const width = 80;
  const height = 50;

  // Initialize all walls
  const tiles = [];
  for (let y = 0; y < height; y++) {
    tiles.push(new Array(width).fill(WALL));
  }

  const rooms = [];
  const maxAttempts = 200;
  const minRooms = 5;
  const maxRooms = 10;
  const targetRooms = minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));

  // Place rooms
  for (let i = 0; i < maxAttempts && rooms.length < targetRooms; i++) {
    // Inner floor area: 4-10 tiles
    const w = 4 + Math.floor(Math.random() * 7);
    const h = 4 + Math.floor(Math.random() * 7);

    // Position: need 1-tile wall buffer from map edge and between rooms
    // Room occupies tiles [x..x+w-1] x [y..y+h-1] as floor
    // Need wall border around it, so total footprint is (w+2) x (h+2)
    // Place so that the floor starts at least 1 tile from the edge
    const x = 1 + Math.floor(Math.random() * (width - w - 2));
    const y = 1 + Math.floor(Math.random() * (height - h - 2));

    if (roomFits(rooms, x, y, w, h)) {
      rooms.push({ x, y, w, h });
      carveRoom(tiles, x, y, w, h);
    }
  }

  // Connect rooms in generation order with L-shaped corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);
    carveCorridor(tiles, a, b);
  }

  // Spawn in center of first room
  const spawn = roomCenter(rooms[0]);

  return { width, height, tiles, rooms, spawn };
}

/** Check if a new room (with 1-tile buffer) overlaps any existing room. */
function roomFits(rooms, x, y, w, h) {
  for (const r of rooms) {
    // Check if padded rectangles overlap (1-tile buffer = expand each by 1 on all sides)
    if (
      x - 1 < r.x + r.w + 1 &&
      x + w + 1 > r.x - 1 &&
      y - 1 < r.y + r.h + 1 &&
      y + h + 1 > r.y - 1
    ) {
      return false;
    }
  }
  return true;
}

function roomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveRoom(tiles, x, y, w, h) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles[y + dy][x + dx] = FLOOR;
    }
  }
}

function carveCorridor(tiles, a, b) {
  // L-shaped: randomly choose horizontal-first or vertical-first
  if (Math.random() < 0.5) {
    carveHorizontal(tiles, a.x, b.x, a.y);
    carveVertical(tiles, a.y, b.y, b.x);
  } else {
    carveVertical(tiles, a.y, b.y, a.x);
    carveHorizontal(tiles, a.x, b.x, b.y);
  }
}

function carveHorizontal(tiles, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    tiles[y][x] = FLOOR;
  }
}

function carveVertical(tiles, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    tiles[y][x] = FLOOR;
  }
}
