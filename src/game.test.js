import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLOOR, WALL } from './map.js';

// Helper to create a minimal map for testing (no randomness needed)
function makeMap(width, height, floorPositions, rooms) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(WALL);
    }
    tiles.push(row);
  }
  for (const [x, y] of floorPositions) {
    tiles[y][x] = FLOOR;
  }
  return {
    width,
    height,
    tiles,
    rooms: rooms || [{ x: 1, y: 1, w: 3, h: 3 }],
    spawn: floorPositions[0] ? { x: floorPositions[0][0], y: floorPositions[0][1] } : { x: 1, y: 1 },
  };
}

// Helper to build a game state directly (bypassing createGame's randomness)
function makeGame(overrides = {}) {
  const floor = [];
  for (let y = 1; y <= 5; y++)
    for (let x = 1; x <= 8; x++)
      floor.push([x, y]);

  const map = overrides.map || makeMap(10, 7, floor);
  return {
    map,
    player: { x: 2, y: 2, hp: 30, maxHp: 30, attack: 5, defense: 2, ...overrides.player },
    monsters: overrides.monsters || [],
    messages: overrides.messages || [],
    gameOver: overrides.gameOver || false,
  };
}

function makeMonster(overrides = {}) {
  return {
    x: 4, y: 2, type: 'rat', name: 'Rat', char: 'r', color: '#cc6633',
    hp: 5, maxHp: 5, attack: 2, defense: 0,
    ...overrides,
  };
}

// We import dispatch dynamically to use the same ESM module
const { dispatch, createGame } = await import('./game.js');

describe('playerAttack', () => {
  it('deals damage equal to player attack minus monster defense', () => {
    const monster = makeMonster({ x: 3, y: 2, defense: 0 }); // player attack 5, defense 0 => 5 damage
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' }); // move east into monster
    assert.equal(next.monsters.length, 0); // 5 hp - 5 damage = 0 => removed
    assert.ok(next.messages.some(m => m.includes('hit the Rat for 5 damage')));
    assert.ok(next.messages.some(m => m.includes('defeated')));
  });

  it('reduces monster HP without killing when damage < hp', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 10, maxHp: 10, defense: 1 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.monsters.length, 1);
    assert.equal(next.monsters[0].hp, 6); // 10 - (5-1) = 6
  });

  it('deals 0 damage when defense >= attack', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 5, defense: 10 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.monsters[0].hp, 5);
    assert.ok(next.messages.some(m => m.includes('for 0 damage')));
  });
});

describe('runMonsterTurns', () => {
  it('adjacent monster attacks the player', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    // Wait so monsters get a turn
    const next = dispatch(game, { type: 'wait' });
    const expectedDamage = Math.max(0, 4 - 2); // monster attack - player defense
    assert.equal(next.player.hp, 30 - expectedDamage);
    assert.ok(next.messages.some(m => m.includes('hits you for 2 damage')));
  });

  it('monster moves toward player when within range 6', () => {
    // Monster at x=7, player at x=2 (Chebyshev dist = 5, within 6)
    const monster = makeMonster({ x: 7, y: 2 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.ok(next.monsters[0].x < 7); // moved closer
  });

  it('monster idles when beyond range 6', () => {
    // Monster at x=8, y=5, player at x=2, y=2 => Chebyshev dist = max(6,3) = 6
    // Exactly 6 is within range, so push further
    const monster = makeMonster({ x: 8, y: 1 });
    const game = makeGame({ player: { x: 1, y: 5 }, monsters: [monster] });
    // Chebyshev = max(7,4) = 7 > 6
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.monsters[0].x, 8);
    assert.equal(next.monsters[0].y, 1);
  });

  it('player death sets gameOver', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 50 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.player.hp, 0);
    assert.equal(next.gameOver, true);
  });
});

describe('tryMonsterMove', () => {
  it('monster does not walk through walls', () => {
    // Create a map where the only path is blocked by wall
    const floor = [[1, 1], [2, 1], [4, 1], [5, 1]]; // gap at x=3
    const map = makeMap(7, 3, floor);
    const monster = makeMonster({ x: 4, y: 1 });
    const game = makeGame({ map, player: { x: 1, y: 1 }, monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    // Monster can't move toward player because x=3 is a wall
    assert.equal(next.monsters[0].x, 4);
  });

  it('monster does not walk through another monster', () => {
    const m1 = makeMonster({ x: 4, y: 2 });
    const m2 = makeMonster({ x: 3, y: 2, type: 'goblin', name: 'Goblin' });
    const game = makeGame({ monsters: [m1, m2] });
    const next = dispatch(game, { type: 'wait' });
    // m1 tries to move to x=3 but m2 is there; should try fallback or stay
    assert.notDeepStrictEqual(
      [next.monsters[0].x, next.monsters[0].y],
      [next.monsters[1].x, next.monsters[1].y],
    );
  });
});

describe('dispatch', () => {
  it('blocks actions except restart when game over', () => {
    const game = makeGame({ gameOver: true });
    const next = dispatch(game, { type: 'move', dir: 'n' });
    assert.strictEqual(next, game); // unchanged reference
  });

  it('restart resets the game state', () => {
    const game = makeGame({ gameOver: true, player: { hp: 0 } });
    const next = dispatch(game, { type: 'restart' });
    assert.equal(next.gameOver, false);
    assert.ok(next.player.hp > 0);
  });

  it('wait triggers monster turns', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 3 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.ok(next.messages.length > 0);
  });

  it('wall bump triggers monster turns', () => {
    // Player at 2,2 — north at 2,1 should be floor, so use a map where 2,1 is wall
    const floor = [];
    for (let y = 2; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor);
    const monster = makeMonster({ x: 3, y: 2, attack: 4 });
    const game = makeGame({ map, monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'n' }); // bump into wall at y=1
    // Monster should still get a turn
    assert.ok(next.messages.some(m => m.includes('hits you')));
  });
});

describe('spawnMonsters', () => {
  it('createGame spawns monsters only in rooms 1..N, not room 0', () => {
    const game = createGame();
    const room0 = game.map.rooms[0];
    for (const m of game.monsters) {
      const inRoom0 = m.x >= room0.x && m.x < room0.x + room0.w &&
                       m.y >= room0.y && m.y < room0.y + room0.h;
      assert.equal(inRoom0, false, `Monster at (${m.x},${m.y}) should not be in starting room`);
    }
    assert.ok(game.monsters.length > 0, 'Should spawn at least some monsters');
  });
});

describe('message log', () => {
  it('keeps at most 5 messages', () => {
    const game = makeGame({ messages: ['a', 'b', 'c', 'd'] });
    // Attack a monster to generate 2 messages (hit + defeated), then monsters attack too
    const monster = makeMonster({ x: 3, y: 2 });
    const g = { ...game, monsters: [monster] };
    const next = dispatch(g, { type: 'move', dir: 'e' });
    assert.ok(next.messages.length <= 5);
  });
});
