import { createMap, isWalkable } from './map.js';

export { FLOOR, WALL } from './map.js';

const DIRECTIONS = {
  n:  { dx:  0, dy: -1 },
  s:  { dx:  0, dy:  1 },
  e:  { dx:  1, dy:  0 },
  w:  { dx: -1, dy:  0 },
};

export function createGame() {
  const map = createMap();
  // Spawn player in the center of the room
  const player = {
    x: Math.floor(map.width / 2),
    y: Math.floor(map.height / 2),
  };
  return { map, player };
}

export function dispatch(game, action) {
  switch (action.type) {
    case 'move':
      return handleMove(game, action.dir);
    default:
      return game;
  }
}

function handleMove(game, dir) {
  const delta = DIRECTIONS[dir];
  if (!delta) return game;

  const nx = game.player.x + delta.dx;
  const ny = game.player.y + delta.dy;

  if (!isWalkable(game.map, nx, ny)) return game;

  return {
    ...game,
    player: { ...game.player, x: nx, y: ny },
  };
}

/**
 * Return a 2D slice of the map centered on the player, sized viewW × viewH.
 * Each cell is { tile, isPlayer }.
 */
export function getVisibleTiles(game, viewW, viewH) {
  const { map, player } = game;

  // Camera origin (top-left of viewport in map coords)
  let camX = player.x - Math.floor(viewW / 2);
  let camY = player.y - Math.floor(viewH / 2);

  // Clamp camera so it doesn't scroll past map edges
  camX = Math.max(0, Math.min(camX, map.width - viewW));
  camY = Math.max(0, Math.min(camY, map.height - viewH));

  const result = [];
  for (let vy = 0; vy < viewH; vy++) {
    const row = [];
    for (let vx = 0; vx < viewW; vx++) {
      const mx = camX + vx;
      const my = camY + vy;
      const inBounds = mx >= 0 && mx < map.width && my >= 0 && my < map.height;
      const tile = inBounds ? map.tiles[my][mx] : ' ';
      row.push({
        tile,
        isPlayer: mx === player.x && my === player.y,
      });
    }
    result.push(row);
  }
  return result;
}
