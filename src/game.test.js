import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLOOR, WALL, STAIR } from './map.js';
import { computeFOV, TORCH_RADIUS } from './fov.js';

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
  const player = { x: 2, y: 2, hp: 30, maxHp: 30, attack: 5, defense: 2, ...overrides.player };

  // Initialize revealed and fov so dispatch/updateFOV won't crash
  const revealed = Array.from({ length: map.height }, () => new Array(map.width).fill(false));
  const fov = computeFOV(map, player.x, player.y, TORCH_RADIUS);
  for (const key of fov.keys()) {
    const [rx, ry] = key.split(',').map(Number);
    if (ry >= 0 && ry < map.height && rx >= 0 && rx < map.width) {
      revealed[ry][rx] = true;
    }
  }

  return {
    map,
    player,
    monsters: overrides.monsters || [],
    items: overrides.items || [],
    inventory: { potions: 0, ...overrides.inventory },
    level: overrides.level || 1,
    messages: overrides.messages || [],
    gameOver: overrides.gameOver || false,
    won: overrides.won || false,
    revealed,
    fov,
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
    // Monster at x=8, y=1, player at x=1, y=5 => Chebyshev = max(7,4) = 7 > 6
    const monster = makeMonster({ x: 8, y: 1 });
    const game = makeGame({ player: { x: 1, y: 5 }, monsters: [monster] });
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

  it('blocks actions except restart when won', () => {
    const game = makeGame({ won: true });
    const next = dispatch(game, { type: 'move', dir: 'n' });
    assert.strictEqual(next, game);
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

describe('items and potions', () => {
  it('auto-picks up potion when walking over it', () => {
    const potion = { x: 3, y: 2, type: 'potion', char: '!', color: '#ff44ff' };
    const game = makeGame({ items: [potion] });
    const next = dispatch(game, { type: 'move', dir: 'e' }); // walk east to 3,2
    assert.equal(next.items.length, 0);
    assert.equal(next.inventory.potions, 1);
    assert.ok(next.messages.some(m => m.includes('pick up')));
  });

  it('usePotion restores HP capped at max', () => {
    const game = makeGame({ player: { hp: 15 }, inventory: { potions: 2 } });
    const next = dispatch(game, { type: 'usePotion' });
    assert.equal(next.player.hp, 25); // 15 + 10
    assert.equal(next.inventory.potions, 1);
    assert.ok(next.messages.some(m => m.includes('restore')));
  });

  it('usePotion caps at maxHp', () => {
    const game = makeGame({ player: { hp: 28 }, inventory: { potions: 1 } });
    const next = dispatch(game, { type: 'usePotion' });
    assert.equal(next.player.hp, 30);
    assert.equal(next.inventory.potions, 0);
  });

  it('usePotion fails with no potions', () => {
    const game = makeGame({ inventory: { potions: 0 } });
    const next = dispatch(game, { type: 'usePotion' });
    assert.equal(next.inventory.potions, 0);
    assert.ok(next.messages.some(m => m.includes('no potions')));
  });

  it('usePotion fails at full health', () => {
    const game = makeGame({ player: { hp: 30 }, inventory: { potions: 1 } });
    const next = dispatch(game, { type: 'usePotion' });
    assert.equal(next.inventory.potions, 1); // not consumed
    assert.ok(next.messages.some(m => m.includes('full health')));
  });
});

describe('stairs and levels', () => {
  it('descend on non-stair tile shows message', () => {
    const game = makeGame();
    const next = dispatch(game, { type: 'descend' });
    assert.ok(next.messages.some(m => m.includes('no stairs')));
  });

  it('descend on stair tile advances to next level', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR; // put stair at player position
    const game = makeGame({ map, level: 1 });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.level, 2);
    assert.ok(next.messages.some(m => m.includes('level 2')));
  });

  it('descend at level 5 triggers win', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({ map, level: 5 });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.won, true);
    assert.ok(next.messages.some(m => m.includes('escape')));
  });

  it('inventory persists across levels', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({ map, level: 1, inventory: { potions: 3 } });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.inventory.potions, 3);
  });

  it('HP persists across levels (no regen)', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({ map, level: 1, player: { hp: 15 } });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.player.hp, 15);
  });
});

describe('createGame structure', () => {
  it('creates game with all required fields', () => {
    const game = createGame();
    assert.ok(game.map);
    assert.ok(game.player);
    assert.ok(Array.isArray(game.monsters));
    assert.ok(Array.isArray(game.items));
    assert.ok(game.inventory);
    assert.equal(typeof game.level, 'number');
    assert.equal(game.level, 1);
    assert.equal(game.won, false);
    assert.equal(game.gameOver, false);
  });

  it('places a stair tile on the map', () => {
    const game = createGame();
    let hasStair = false;
    for (let y = 0; y < game.map.height; y++) {
      for (let x = 0; x < game.map.width; x++) {
        if (game.map.tiles[y][x] === '>') hasStair = true;
      }
    }
    assert.ok(hasStair, 'Map should contain a stair tile');
  });

  it('spawns 1-2 potions on the map', () => {
    const game = createGame();
    assert.ok(game.items.length >= 1 && game.items.length <= 2,
      `Expected 1-2 potions, got ${game.items.length}`);
    for (const item of game.items) {
      assert.equal(item.type, 'potion');
      assert.equal(item.char, '!');
    }
  });
});

// We import getVisibleTiles dynamically
const { getVisibleTiles } = await import('./game.js');

describe('computeFOV', () => {
  it('blocks visibility through walls', () => {
    // Two separate rooms with thick wall barrier between them
    const floor = [];
    // Left room: x=1-3, y=1-3
    for (let y = 1; y <= 3; y++)
      for (let x = 1; x <= 3; x++)
        floor.push([x, y]);
    // Right room: x=15-17, y=1-3
    for (let y = 1; y <= 3; y++)
      for (let x = 15; x <= 17; x++)
        floor.push([x, y]);
    const map = makeMap(20, 5, floor);
    const fov = computeFOV(map, 2, 2, 8);
    assert.ok(fov.has('2,2'), 'Player position should be visible');
    assert.ok(fov.has('3,2'), 'Adjacent open tile should be visible');
    assert.ok(!fov.has('15,2'), 'Tile in far room should not be visible');
    assert.ok(!fov.has('16,2'), 'Tile in far room should not be visible');
  });

  it('brightness is 1.0 at origin and >= 0.3 at edge', () => {
    const floor = [];
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        floor.push([x, y]);
    const map = makeMap(20, 20, floor);
    const fov = computeFOV(map, 10, 10, 8);
    assert.equal(fov.get('10,10'), 1.0);
    for (const [, b] of fov) {
      assert.ok(b >= 0.3 && b <= 1.0, `Brightness ${b} out of range [0.3, 1.0]`);
    }
  });
});

describe('FOV integration', () => {
  it('revealed tiles persist after player moves away', () => {
    const game = makeGame();
    // Player starts at 2,2 — tiles near 2,2 are revealed
    assert.ok(game.revealed[2][2], 'Starting position should be revealed');
    // Move south twice
    const g1 = dispatch(game, { type: 'move', dir: 's' });
    const g2 = dispatch(g1, { type: 'move', dir: 's' });
    // Original position should still be revealed
    assert.ok(g2.revealed[2][2], 'Previously visited tile should remain revealed');
  });

  it('revealed resets on new level', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({ map, level: 1 });
    // Mark some tiles as revealed
    assert.ok(game.revealed[2][2], 'Current level tile should be revealed');
    const next = dispatch(game, { type: 'descend' });
    // New level should have fresh revealed array — old positions not necessarily revealed
    assert.ok(next.revealed, 'New level should have a revealed array');
    assert.equal(next.level, 2);
  });

  it('getVisibleTiles excludes monsters and items from non-visible cells', () => {
    // Two rooms separated by thick walls; monster in far room
    const floor = [];
    for (let y = 1; y <= 3; y++)
      for (let x = 1; x <= 3; x++)
        floor.push([x, y]);
    for (let y = 1; y <= 3; y++)
      for (let x = 15; x <= 17; x++)
        floor.push([x, y]);
    const map = makeMap(20, 5, floor);
    const monster = makeMonster({ x: 16, y: 2 });
    const game = makeGame({ map, player: { x: 2, y: 2 }, monsters: [monster] });
    assert.ok(!game.fov.has('16,2'), 'Monster position should not be in FOV');
    const tiles = getVisibleTiles(game, 20, 5);
    const cell = tiles[2][16];
    assert.equal(cell.monster, null, 'Monster in non-visible cell should be null');
  });

  it('getVisibleTiles includes visibility and brightness fields', () => {
    const game = makeGame();
    const tiles = getVisibleTiles(game, 10, 7);
    // Player cell should be visible with brightness 1.0
    const playerCell = tiles.find(row => row.find(c => c.isPlayer))
      ?.find(c => c.isPlayer);
    assert.ok(playerCell, 'Should find player cell');
    assert.equal(playerCell.visibility, 'visible');
    assert.equal(playerCell.brightness, 1.0);
  });
});
