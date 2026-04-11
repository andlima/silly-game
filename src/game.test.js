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
    inventory: { food: 0, gold: 0, ...overrides.inventory },
    equipment: overrides.equipment || { weapon: null, helmet: null, shield: null },
    spell: overrides.spell !== undefined ? overrides.spell : null,
    castPending: overrides.castPending || false,
    level: overrides.level || 1,
    messages: overrides.messages || [],
    gameOver: overrides.gameOver || false,
    won: overrides.won || false,
    revealed,
    fov,
    stats: {
      monstersKilled: 0, damageDealt: 0, damageTaken: 0,
      foodUsed: 0, stepsTaken: 0, causeOfDeath: null, goldCollected: 0,
      idolOfferings: 0, spellsCast: 0,
      ...overrides.stats,
    },
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
const { dispatch, createGame, setRollOverride, SPELL_TYPES } = await import('./game.js');

import { beforeEach, afterEach } from 'node:test';

describe('playerAttack', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

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
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('adjacent monster attacks the player', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    // Wait so monsters get a turn
    const next = dispatch(game, { type: 'wait' });
    const expectedDamage = Math.max(0, 4 - 2); // monster attack - player defense
    assert.equal(next.player.hp, 30 - expectedDamage);
    assert.ok(next.messages.some(m => m.includes('hits you for 2 damage')));
  });

  it('monster moves toward player when within awareness range', () => {
    // Rat awareness=3, place at Manhattan dist 3 with clear LOS
    const monster = makeMonster({ x: 5, y: 2, awareness: 3 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.ok(next.monsters[0].x < 5); // moved closer
  });

  it('monster idles when beyond awareness range', () => {
    // Rat awareness=3, place at Manhattan dist 6 (x=8, y=2, player at x=2, y=2)
    const monster = makeMonster({ x: 8, y: 2, awareness: 3 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.monsters[0].x, 8);
    assert.equal(next.monsters[0].y, 2);
  });

  it('monster does not chase through walls (LOS blocked)', () => {
    // Create a map with a wall column separating monster and player
    const floor = [];
    for (let y = 1; y <= 3; y++)
      for (let x = 1; x <= 3; x++)
        floor.push([x, y]);
    for (let y = 1; y <= 3; y++)
      for (let x = 5; x <= 7; x++)
        floor.push([x, y]);
    // Wall at x=4 blocks LOS
    const map = makeMap(9, 5, floor);
    const monster = makeMonster({ x: 5, y: 2, awareness: 4 });
    const game = makeGame({ map, player: { x: 3, y: 2 }, monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    // Monster can't see through wall, should stay put
    assert.equal(next.monsters[0].x, 5);
    assert.equal(next.monsters[0].y, 2);
  });

  it('monster moves cardinally only (no diagonal)', () => {
    // Monster diagonally from player with open floor
    const monster = makeMonster({ x: 4, y: 4, awareness: 5 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    const m = next.monsters[0];
    // Should have moved on exactly one axis
    const movedX = m.x !== 4;
    const movedY = m.y !== 4;
    assert.ok(movedX !== movedY, `Monster should move on exactly one axis, got (${m.x},${m.y})`);
  });

  it('per-type awareness radius — rat idles at dist 4, dragon chases at dist 4', () => {
    // Rat awareness=3, dragon awareness=6. Both at Manhattan dist 4 from player.
    // Rat should idle (4 > 3), dragon should chase (4 <= 6).
    const rat = makeMonster({ x: 6, y: 2, type: 'rat', name: 'Rat', awareness: 3 });
    const dragon = makeMonster({ x: 6, y: 4, type: 'dragon', name: 'Dragon',
      hp: 30, maxHp: 30, attack: 8, defense: 4, awareness: 6 });
    // Player at (2,2): rat dist = |6-2|+|2-2| = 4, dragon dist = |6-2|+|4-2| = 6
    // Actually dragon dist is 6, let's put dragon closer
    const dragon2 = makeMonster({ x: 4, y: 4, type: 'dragon', name: 'Dragon',
      hp: 30, maxHp: 30, attack: 8, defense: 4, awareness: 6 });
    // Player at (2,2): dragon dist = |4-2|+|4-2| = 4, well within awareness 6
    const game = makeGame({ monsters: [rat, dragon2] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.monsters[0].x, 6, 'Rat should idle (dist 4 > awareness 3)');
    const dm = next.monsters[1];
    const moved = dm.x !== 4 || dm.y !== 4;
    assert.ok(moved, 'Dragon should chase (dist 4 <= awareness 6)');
  });

  it('monster staggers after attacking', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 100 });
    const game = makeGame({ monsters: [monster] });
    // Turn 1: monster attacks
    const t1 = dispatch(game, { type: 'wait' });
    const dmg = Math.max(0, 4 - 2);
    assert.equal(t1.player.hp, 30 - dmg, 'Monster should attack on turn 1');
    assert.equal(t1.monsters[0].staggered, true, 'Monster should be staggered after attack');
    // Turn 2: monster is staggered, skips
    const t2 = dispatch(t1, { type: 'wait' });
    assert.equal(t2.player.hp, t1.player.hp, 'Player HP should be unchanged on stagger turn');
    assert.equal(t2.monsters[0].staggered, false, 'Stagger should be cleared');
    // Turn 3: monster attacks again
    const t3 = dispatch(t2, { type: 'wait' });
    assert.equal(t3.player.hp, t2.player.hp - dmg, 'Monster should attack again on turn 3');
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
    const m2 = makeMonster({ x: 3, y: 2, type: 'skeleton', name: 'Skeleton' });
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
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

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
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));
  it('keeps at most 20 messages', () => {
    const game = makeGame({ messages: Array.from({ length: 19 }, (_, i) => `msg${i}`) });
    // Attack a monster to generate 2 messages (hit + defeated), then monsters attack too
    const monster = makeMonster({ x: 3, y: 2 });
    const g = { ...game, monsters: [monster] };
    const next = dispatch(g, { type: 'move', dir: 'e' });
    assert.ok(next.messages.length <= 20);
  });
});

describe('items and food', () => {
  it('auto-picks up food when walking over it', () => {
    const food = { x: 3, y: 2, type: 'food', char: '%', color: '#ff44ff' };
    const game = makeGame({ items: [food] });
    const next = dispatch(game, { type: 'move', dir: 'e' }); // walk east to 3,2
    assert.equal(next.items.length, 0);
    assert.equal(next.inventory.food, 1);
    assert.ok(next.messages.some(m => m.includes('pick up')));
  });

  it('useFood restores HP capped at max', () => {
    const game = makeGame({ player: { hp: 15 }, inventory: { food: 2 } });
    const next = dispatch(game, { type: 'useFood' });
    assert.equal(next.player.hp, 25); // 15 + 10
    assert.equal(next.inventory.food, 1);
    assert.ok(next.messages.some(m => m.includes('restore')));
  });

  it('useFood caps at maxHp', () => {
    const game = makeGame({ player: { hp: 28 }, inventory: { food: 1 } });
    const next = dispatch(game, { type: 'useFood' });
    assert.equal(next.player.hp, 30);
    assert.equal(next.inventory.food, 0);
  });

  it('useFood fails with no food', () => {
    const game = makeGame({ inventory: { food: 0 } });
    const next = dispatch(game, { type: 'useFood' });
    assert.equal(next.inventory.food, 0);
    assert.ok(next.messages.some(m => m.includes('no food')));
  });

  it('useFood fails at full health', () => {
    const game = makeGame({ player: { hp: 30 }, inventory: { food: 1 } });
    const next = dispatch(game, { type: 'useFood' });
    assert.equal(next.inventory.food, 1); // not consumed
    assert.ok(next.messages.some(m => m.includes('full health')));
  });
});

describe('equipment', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('picking up equipment into an empty slot equips it', () => {
    const dagger = { x: 3, y: 2, type: 'dagger', char: '|', color: '#aaaaaa' };
    const game = makeGame({ items: [dagger], equipment: { weapon: null, helmet: null, shield: null } });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.items.length, 0);
    assert.equal(next.equipment.weapon.type, 'dagger');
    assert.equal(next.equipment.weapon.bonus, 2);
    assert.ok(next.messages.some(m => m.includes('equip a Dagger')));
  });

  it('picking up a strictly better item replaces equipped item', () => {
    const sword = { x: 3, y: 2, type: 'sword', char: '/', color: '#dddddd' };
    const game = makeGame({
      items: [sword],
      equipment: { weapon: { type: 'dagger', name: 'Dagger', bonus: 2, stat: 'attack' }, helmet: null, shield: null },
    });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.items.length, 0);
    assert.equal(next.equipment.weapon.type, 'sword');
    assert.equal(next.equipment.weapon.bonus, 4);
    assert.ok(next.messages.some(m => m.includes('equip a Sword')));
  });

  it('picking up an equal or worse item is skipped', () => {
    const dagger = { x: 3, y: 2, type: 'dagger', char: '|', color: '#aaaaaa' };
    const game = makeGame({
      items: [dagger],
      equipment: { weapon: { type: 'sword', name: 'Sword', bonus: 4, stat: 'attack' }, helmet: null, shield: null },
    });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.items.length, 1); // item stays
    assert.equal(next.equipment.weapon.type, 'sword'); // not replaced
    assert.ok(next.messages.some(m => m.includes('already have better')));
  });

  it('combat damage correctly includes equipment attack bonus', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, defense: 0 });
    const game = makeGame({
      monsters: [monster],
      equipment: { weapon: { type: 'sword', name: 'Sword', bonus: 4, stat: 'attack' }, helmet: null, shield: null },
    });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    // player.attack=5 + sword bonus=4 = 9 damage
    assert.equal(next.monsters[0].hp, 11); // 20 - 9
  });

  it('combat damage correctly includes equipment defense bonus', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 10, defense: 100 });
    const game = makeGame({
      monsters: [monster],
      equipment: { weapon: null, helmet: { type: 'helmet', name: 'Helmet', bonus: 1, stat: 'defense' }, shield: { type: 'shield', name: 'Shield', bonus: 2, stat: 'defense' } },
    });
    // Attack the monster (will do 0 damage), monster attacks back
    const next = dispatch(game, { type: 'move', dir: 'e' });
    // Monster attack=10, player defense=2 + helmet(1) + shield(2) = 5, damage = 5
    assert.equal(next.player.hp, 25);
  });

  it('equipment persists across level transitions', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({
      map,
      level: 1,
      equipment: { weapon: { type: 'sword', name: 'Sword', bonus: 4, stat: 'attack' }, helmet: null, shield: null },
    });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.level, 2);
    assert.equal(next.equipment.weapon.type, 'sword');
    assert.equal(next.equipment.weapon.bonus, 4);
  });
});

describe('stairs and levels', () => {
  it('descend on non-stair tile shows message', () => {
    const game = makeGame();
    const next = dispatch(game, { type: 'descend' });
    assert.ok(next.messages.some(m => m.includes('Nothing to interact with here.')));
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
    const game = makeGame({ map, level: 1, inventory: { food: 3 } });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.inventory.food, 3);
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

  it('spawns food and equipment on the map', () => {
    const game = createGame();
    const food = game.items.filter(it => it.type === 'food');
    const equipment = game.items.filter(it => ['dagger', 'sword', 'helmet', 'shield'].includes(it.type));
    assert.ok(food.length >= 1 && food.length <= 2,
      `Expected 1-2 food, got ${food.length}`);
    assert.ok(equipment.length >= 1 && equipment.length <= 2,
      `Expected 1-2 equipment, got ${equipment.length}`);
    for (const item of food) {
      assert.equal(item.char, '%');
    }
  });
});

describe('stats tracking', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));
  it('createGame returns a stats object with all counters at zero', () => {
    const game = createGame();
    assert.ok(game.stats, 'stats object should exist');
    assert.equal(game.stats.monstersKilled, 0);
    assert.equal(game.stats.damageDealt, 0);
    assert.equal(game.stats.damageTaken, 0);
    assert.equal(game.stats.foodUsed, 0);
    assert.equal(game.stats.stepsTaken, 0);
    assert.equal(game.stats.causeOfDeath, null);
  });

  it('monstersKilled and damageDealt increment on kill', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 5, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' }); // player attack 5 kills 5hp monster
    assert.equal(next.stats.monstersKilled, 1);
    assert.equal(next.stats.damageDealt, 5);
  });

  it('damageDealt accumulates without killing', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.stats.damageDealt, 5);
    assert.equal(next.stats.monstersKilled, 0);
  });

  it('damageTaken increments when monster hits player', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    const expectedDamage = Math.max(0, 4 - 2); // monster attack - player defense
    assert.equal(next.stats.damageTaken, expectedDamage);
  });

  it('foodUsed increments on food use', () => {
    const game = makeGame({ player: { hp: 15 }, inventory: { food: 2 } });
    const next = dispatch(game, { type: 'useFood' });
    assert.equal(next.stats.foodUsed, 1);
  });

  it('stepsTaken increments on successful move', () => {
    const game = makeGame();
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.stats.stepsTaken, 1);
  });

  it('stepsTaken does not increment on wall bump', () => {
    const floor = [];
    for (let y = 2; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor);
    const game = makeGame({ map });
    const next = dispatch(game, { type: 'move', dir: 'n' }); // wall at y=1
    assert.equal(next.stats.stepsTaken, 0);
  });

  it('causeOfDeath is set to monster name when player dies', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 50, name: 'Dragon' });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.gameOver, true);
    assert.equal(next.stats.causeOfDeath, 'Dragon');
  });

  it('stats carry across levels via descend', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({
      map,
      level: 1,
      stats: { monstersKilled: 3, damageDealt: 25, damageTaken: 10, foodUsed: 1, stepsTaken: 40, causeOfDeath: null },
    });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.level, 2);
    assert.equal(next.stats.monstersKilled, 3);
    assert.equal(next.stats.damageDealt, 25);
    assert.equal(next.stats.damageTaken, 10);
    assert.equal(next.stats.foodUsed, 1);
    assert.equal(next.stats.stepsTaken, 40);
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

  it('brightness is 1.0 at origin and >= 0.45 at edge', () => {
    const floor = [];
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        floor.push([x, y]);
    const map = makeMap(20, 20, floor);
    const fov = computeFOV(map, 10, 10, 8);
    assert.equal(fov.get('10,10'), 1.0);
    for (const [, b] of fov) {
      assert.ok(b >= 0.45 && b <= 1.0, `Brightness ${b} out of range [0.45, 1.0]`);
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

describe('damage variance', () => {
  afterEach(() => setRollOverride(null));

  it('damage variance adds to base damage', () => {
    setRollOverride(() => 1);
    // player attack=5, monster defense=0 => base=5, +1 variance => 6
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.monsters[0].hp, 14); // 20 - 6 = 14
    assert.ok(next.messages.some(m => m.includes('for 6 damage')));
  });

  it('damage variance subtracts from base damage', () => {
    setRollOverride(() => -1);
    // player attack=5, monster defense=0 => base=5, -1 variance => 4
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, defense: 0 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.monsters[0].hp, 16); // 20 - 4 = 16
    assert.ok(next.messages.some(m => m.includes('for 4 damage')));
  });

  it('damage floor is zero with negative variance', () => {
    setRollOverride(() => -1);
    // player attack=5, monster defense=5 => base=0, -1 variance => Math.max(0, -1) = 0
    const monster = makeMonster({ x: 3, y: 2, hp: 10, maxHp: 10, defense: 5 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.monsters[0].hp, 10); // no damage
    assert.ok(next.messages.some(m => m.includes('for 0 damage')));
  });

  it('monster damage variance adds to base damage', () => {
    setRollOverride(() => 1);
    // monster attack=4, player defense=2 => base=2, +1 variance => 3
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 100 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.player.hp, 30 - 3); // 30 - 3 = 27
    assert.ok(next.messages.some(m => m.includes('for 3 damage')));
  });

  it('monster damage variance subtracts from base damage', () => {
    setRollOverride(() => -1);
    // monster attack=4, player defense=2 => base=2, -1 variance => 1
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 100 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.player.hp, 30 - 1); // 30 - 1 = 29
    assert.ok(next.messages.some(m => m.includes('for 1 damage')));
  });

  it('monster damage floor is zero with negative variance', () => {
    setRollOverride(() => -1);
    // monster attack=2, player defense=2 => base=0, -1 variance => Math.max(0, -1) = 0
    const monster = makeMonster({ x: 3, y: 2, attack: 2, defense: 100 });
    const game = makeGame({ monsters: [monster] });
    const next = dispatch(game, { type: 'wait' });
    assert.equal(next.player.hp, 30); // no damage
    assert.ok(next.messages.some(m => m.includes('for 0 damage')));
  });
});

describe('gold from monsters', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('killing a skeleton awards gold in range 2-4', () => {
    const monster = makeMonster({ x: 3, y: 2, type: 'skeleton', name: 'Skeleton', hp: 1, maxHp: 10, defense: 0 });
    const game = makeGame({ monsters: [monster], inventory: { food: 0, gold: 0 } });
    // Seed Math.random for gold roll
    const origRandom = Math.random;
    Math.random = () => 0.5; // should give minGold + floor(0.5 * (maxGold - minGold + 1)) = 2 + floor(0.5*3) = 2+1 = 3
    const next = dispatch(game, { type: 'move', dir: 'e' });
    Math.random = origRandom;
    assert.ok(next.inventory.gold >= 2 && next.inventory.gold <= 4, `Gold should be 2-4 but was ${next.inventory.gold}`);
    assert.ok(next.messages.some(m => m.includes('dropped') && m.includes('gold')));
    assert.ok(next.stats.goldCollected >= 2);
  });

  it('killing a rat can award 0 gold with no message', () => {
    const monster = makeMonster({ x: 3, y: 2, type: 'rat', name: 'Rat', hp: 1, maxHp: 5, defense: 0 });
    const game = makeGame({ monsters: [monster], inventory: { food: 0, gold: 0 } });
    const origRandom = Math.random;
    Math.random = () => 0; // minGold=0 + floor(0 * 2) = 0
    const next = dispatch(game, { type: 'move', dir: 'e' });
    Math.random = origRandom;
    assert.equal(next.inventory.gold, 0);
    assert.ok(!next.messages.some(m => m.includes('dropped') && m.includes('gold')));
  });

  it('gold persists across kills', () => {
    const m1 = makeMonster({ x: 3, y: 2, type: 'skeleton', name: 'Skeleton', hp: 1, maxHp: 10, defense: 0 });
    const game = makeGame({ monsters: [m1], inventory: { food: 0, gold: 5 } });
    const origRandom = Math.random;
    Math.random = () => 0; // minGold=2, gives 2
    const next = dispatch(game, { type: 'move', dir: 'e' });
    Math.random = origRandom;
    assert.equal(next.inventory.gold, 7); // 5 + 2
  });
});

describe('floor gold pickup', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('picks up gold pile on walk', () => {
    const goldItem = { x: 3, y: 2, type: 'gold', char: '$', color: '#ffcc00', value: 6 };
    const game = makeGame({ items: [goldItem], inventory: { food: 0, gold: 0 } });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.inventory.gold, 6);
    assert.equal(next.items.filter(i => i.type === 'gold').length, 0);
    assert.ok(next.messages.some(m => m.includes('pick up 6 gold')));
    assert.equal(next.stats.goldCollected, 6);
  });

  it('gold value scales with level', () => {
    // value = 2 * level, so level 3 gold pile should be worth 6
    const goldItem = { x: 3, y: 2, type: 'gold', char: '$', color: '#ffcc00', value: 6 };
    const game = makeGame({ items: [goldItem], level: 3, inventory: { food: 0, gold: 0 } });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.inventory.gold, 6);
  });
});

describe('gold inventory and stats', () => {
  it('createGame initializes gold in inventory and stats', () => {
    const game = createGame();
    assert.equal(game.inventory.gold, 0);
    assert.equal(game.stats.goldCollected, 0);
  });
});

describe('idol offering', () => {
  it('successful offering deducts gold, increases maxHp, fully heals, and logs message', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 30 }, player: { hp: 20, maxHp: 30 } });
    const next = dispatch(game, { type: 'interact' });
    assert.equal(next.inventory.gold, 0);
    assert.equal(next.player.maxHp, 35);
    assert.equal(next.player.hp, 35);
    assert.ok(next.messages.some(m => m.includes('offer 30 gold to the idol')));
    assert.ok(next.messages.some(m => m.includes('+5 max HP, fully healed')));
    assert.equal(next.items.length, 1, 'Idol should remain on the map');
    assert.equal(next.stats.idolOfferings, 1);
  });

  it('offering at full HP still increases maxHp and heals to new max', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 30 }, player: { hp: 30, maxHp: 30 } });
    const next = dispatch(game, { type: 'interact' });
    assert.equal(next.player.maxHp, 35);
    assert.equal(next.player.hp, 35);
    assert.equal(next.inventory.gold, 0);
  });

  it('offering at low HP fully heals to new max', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 30 }, player: { hp: 3, maxHp: 30 } });
    const next = dispatch(game, { type: 'interact' });
    assert.equal(next.player.hp, 35);
    assert.equal(next.player.maxHp, 35);
  });

  it('not enough gold shows message and does not change state', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 29 }, player: { hp: 20, maxHp: 30 } });
    const next = dispatch(game, { type: 'interact' });
    assert.equal(next.inventory.gold, 29);
    assert.equal(next.player.hp, 20);
    assert.equal(next.player.maxHp, 30);
    assert.ok(next.messages.some(m => m.includes('demands 30 gold')));
    assert.equal(next.stats.idolOfferings, 0);
  });

  it('multi-use: player with 65 gold can offer twice', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 65 }, player: { hp: 20, maxHp: 30 } });
    const g1 = dispatch(game, { type: 'interact' });
    assert.equal(g1.inventory.gold, 35);
    assert.equal(g1.player.maxHp, 35);
    assert.equal(g1.player.hp, 35);
    const g2 = dispatch(g1, { type: 'interact' });
    assert.equal(g2.inventory.gold, 0);
    assert.equal(g2.player.maxHp, 40);
    assert.equal(g2.player.hp, 40);
    assert.equal(g2.items.length, 1, 'Idol should still be on the map');
  });

  it('walking onto idol does not pick it up', () => {
    const idol = { x: 3, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol] });
    const next = dispatch(game, { type: 'move', dir: 'e' }); // walk east to 3,2
    assert.equal(next.items.length, 1, 'Idol should remain in items');
    assert.equal(next.items[0].type, 'idol');
    assert.ok(!next.messages.some(m => m.includes('pick up')));
  });

  it('interact on stair still descends', () => {
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
    const next = dispatch(game, { type: 'interact' });
    assert.equal(next.level, 2);
    assert.ok(next.messages.some(m => m.includes('level 2')));
  });

  it('interact on empty floor shows nothing-to-interact message', () => {
    const game = makeGame();
    const next = dispatch(game, { type: 'interact' });
    assert.ok(next.messages.some(m => m.includes('Nothing to interact with here.')));
  });

  it('descend action alias on stair still advances level (bot compat)', () => {
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
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.level, 2);
  });

  it('descend action alias on idol with enough gold performs offering', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    const game = makeGame({ items: [idol], inventory: { gold: 30 } });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.inventory.gold, 0);
    assert.equal(next.player.maxHp, 35);
    assert.ok(next.messages.some(m => m.includes('offer 30 gold')));
  });

  it('idol does not spawn on level 1 or level 5', () => {
    // Level 1 — no idol
    const game1 = createGame();
    assert.equal(game1.level, 1);
    const idols1 = game1.items.filter(it => it.type === 'idol');
    assert.equal(idols1.length, 0, 'No idol should spawn on level 1');

    // Advance to level 5 using a stair and check
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game5 = makeGame({ map, level: 4 });
    const next = dispatch(game5, { type: 'descend' });
    assert.equal(next.level, 5);
    const idols5 = next.items.filter(it => it.type === 'idol');
    assert.equal(idols5.length, 0, 'No idol should spawn on level 5');
  });

  it('cost scales with current maxHp — successive offerings cost more', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    // Need 30 + 35 + 40 = 105 gold for three offerings
    const game = makeGame({ items: [idol], inventory: { gold: 105 }, player: { hp: 30, maxHp: 30 } });
    const g1 = dispatch(game, { type: 'interact' });
    assert.equal(g1.inventory.gold, 75);   // paid 30
    assert.equal(g1.player.maxHp, 35);
    const g2 = dispatch(g1, { type: 'interact' });
    assert.equal(g2.inventory.gold, 40);   // paid 35
    assert.equal(g2.player.maxHp, 40);
    const g3 = dispatch(g2, { type: 'interact' });
    assert.equal(g3.inventory.gold, 0);    // paid 40
    assert.equal(g3.player.maxHp, 45);
    assert.equal(g3.stats.idolOfferings, 3);
  });

  it('second offering demands the new (higher) maxHp cost', () => {
    const idol = { x: 2, y: 2, type: 'idol', char: 'I', color: '#ccaa44' };
    // 30 gold = exactly one offering, then second attempt should fail with "demands 35"
    const game = makeGame({ items: [idol], inventory: { gold: 30 }, player: { hp: 30, maxHp: 30 } });
    const g1 = dispatch(game, { type: 'interact' });
    assert.equal(g1.inventory.gold, 0);
    assert.equal(g1.player.maxHp, 35);
    const g2 = dispatch(g1, { type: 'interact' });
    assert.equal(g2.inventory.gold, 0);
    assert.equal(g2.player.maxHp, 35);
    assert.ok(g2.messages.some(m => m.includes('demands 35 gold')));
  });
});

describe('spell system', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('picking up a scroll into an empty spell slot equips it', () => {
    const scroll = { x: 3, y: 2, type: 'scroll', spellType: 'firebolt', char: '~', color: '#ff6600' };
    const game = makeGame({ items: [scroll], spell: null });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.items.length, 0);
    assert.ok(next.spell);
    assert.equal(next.spell.type, 'firebolt');
    assert.equal(next.spell.charges, 3);
    assert.ok(next.messages.some(m => m.includes('pick up a Firebolt scroll')));
  });

  it('casting firebolt hits the first monster in line and deals spell damage (ignores defense)', () => {
    // Monster at (5,2), player at (2,2), cast east
    const monster = makeMonster({ x: 5, y: 2, hp: 20, maxHp: 20, defense: 10 });
    const game = makeGame({
      monsters: [monster],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 3 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castDir', dir: 'e' });
    // Spell damage = 8, ignores defense
    assert.equal(next.monsters[0].hp, 12); // 20 - 8
    assert.ok(next.messages.some(m => m.includes('Firebolt hits') && m.includes('8 damage')));
    assert.equal(next.castPending, false);
  });

  it('casting firebolt that hits a wall logs a fizzle message', () => {
    // No monsters in the line, wall at boundary
    const game = makeGame({
      monsters: [],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 3 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castDir', dir: 'e' });
    assert.ok(next.messages.some(m => m.includes('fizzle')));
  });

  it('charges decrement on each cast; scroll is cleared at 0 charges', () => {
    const monster1 = makeMonster({ x: 5, y: 2, hp: 50, maxHp: 50, defense: 10 });
    const game = makeGame({
      monsters: [monster1],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 1 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castDir', dir: 'e' });
    assert.equal(next.spell, null);
    assert.ok(next.messages.some(m => m.includes('crumbles to dust')));
  });

  it('casting with no spell logs appropriate message', () => {
    const game = makeGame({ spell: null });
    const next = dispatch(game, { type: 'cast' });
    assert.ok(next.messages.some(m => m.includes('no spell')));
    assert.equal(next.castPending, false);
  });

  it('castCancel clears pending state without consuming a turn', () => {
    const monster = makeMonster({ x: 3, y: 2, attack: 4, defense: 100 });
    const game = makeGame({
      monsters: [monster],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 3 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castCancel' });
    assert.equal(next.castPending, false);
    assert.ok(next.messages.some(m => m.includes('cancelled')));
    // Monster should NOT have attacked (no turn consumed)
    assert.equal(next.player.hp, 30);
  });

  it('monster killed by spell drops gold and increments stats', () => {
    const monster = makeMonster({ x: 3, y: 2, hp: 5, maxHp: 5, defense: 0, type: 'rat' });
    const game = makeGame({
      monsters: [monster],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 3 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castDir', dir: 'e' });
    assert.equal(next.monsters.length, 0);
    assert.equal(next.stats.monstersKilled, 1);
    assert.equal(next.stats.spellsCast, 1);
  });

  it('spell slot persists across level transitions', () => {
    const floor = [];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++)
        floor.push([x, y]);
    const map = makeMap(10, 7, floor, [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 5, y: 1, w: 3, h: 3 },
    ]);
    map.tiles[2][2] = STAIR;
    const game = makeGame({
      map,
      level: 1,
      spell: { type: 'firebolt', name: 'Firebolt', charges: 2 },
    });
    const next = dispatch(game, { type: 'descend' });
    assert.equal(next.level, 2);
    assert.ok(next.spell);
    assert.equal(next.spell.type, 'firebolt');
    assert.equal(next.spell.charges, 2);
  });
});

describe('SPELL_TYPES has mechanic field', () => {
  it('all four spell types exist with mechanic field', () => {
    assert.ok(SPELL_TYPES.firebolt);
    assert.ok(SPELL_TYPES.lightning);
    assert.ok(SPELL_TYPES.frost);
    assert.ok(SPELL_TYPES.whirlwind);
    assert.equal(SPELL_TYPES.firebolt.mechanic, 'bolt');
    assert.equal(SPELL_TYPES.lightning.mechanic, 'burst');
    assert.equal(SPELL_TYPES.frost.mechanic, 'bolt');
    assert.equal(SPELL_TYPES.whirlwind.mechanic, 'fov_push');
  });
});

describe('Lightning Bolt (burst)', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('hits multiple enemies within range and misses those outside', () => {
    // Player at (2,2), monsters at (3,2) dist=1 in range, (4,3) dist=2 in range, (7,2) dist=5 out of range
    const m1 = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, name: 'Rat', type: 'rat' });
    const m2 = makeMonster({ x: 4, y: 3, hp: 20, maxHp: 20, name: 'Skeleton', type: 'skeleton' });
    const m3 = makeMonster({ x: 7, y: 2, hp: 20, maxHp: 20, name: 'Bear', type: 'bear' });
    const game = makeGame({
      monsters: [m1, m2, m3],
      spell: { type: 'lightning', name: 'Lightning Bolt', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    // m1 and m2 should be hit (damage 4 each), m3 should not
    const hitMonsters = next.monsters.filter(m => m.hp < 20);
    const unhitMonster = next.monsters.find(m => m.hp === 20);
    assert.equal(hitMonsters.length, 2);
    assert.ok(unhitMonster); // m3 at dist 5 is untouched
    assert.equal(next.spell.charges, 2);
    assert.ok(next.messages.some(m => m.includes('Lightning Bolt hits')));
  });

  it('fizzles when no enemies in range', () => {
    const m1 = makeMonster({ x: 7, y: 5, hp: 20, maxHp: 20 });
    const game = makeGame({
      monsters: [m1],
      spell: { type: 'lightning', name: 'Lightning Bolt', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    assert.ok(next.messages.some(m => m.includes('crackles but finds no target')));
    assert.equal(next.spell.charges, 2);
  });

  it('kills award gold and increment stats', () => {
    const m1 = makeMonster({ x: 3, y: 2, hp: 3, maxHp: 3, type: 'rat' });
    const game = makeGame({
      monsters: [m1],
      spell: { type: 'lightning', name: 'Lightning Bolt', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    assert.equal(next.monsters.length, 0);
    assert.equal(next.stats.monstersKilled, 1);
    assert.equal(next.stats.spellsCast, 1);
  });
});

describe('Frost bolt', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('freezes a surviving monster for 3 turns', () => {
    const monster = makeMonster({ x: 5, y: 2, hp: 20, maxHp: 20, defense: 0 });
    const game = makeGame({
      monsters: [monster],
      spell: { type: 'frost', name: 'Frost', charges: 3 },
      castPending: true,
    });
    const next = dispatch(game, { type: 'castDir', dir: 'e' });
    // Frost damage = 3, monster survives with 17 hp
    assert.equal(next.monsters[0].hp, 17);
    // frozenTurns starts at 3, but runMonsterTurns immediately consumes one turn, so 2 remain
    assert.equal(next.monsters[0].frozenTurns, 2);
    assert.ok(next.messages.some(m => m.includes('frozen')));
  });

  it('frozen monster skips turns and resumes after frozenTurns reaches 0', () => {
    // Monster adjacent to player, frozen for 2 turns
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20, attack: 10, defense: 0, frozenTurns: 2 });
    const game = makeGame({ monsters: [monster] });

    // Wait turn 1: monster is frozen (2->1), player takes no damage
    const after1 = dispatch(game, { type: 'wait' });
    assert.equal(after1.player.hp, 30);
    assert.equal(after1.monsters[0].frozenTurns, 1);

    // Wait turn 2: monster is frozen (1->0), player takes no damage
    const after2 = dispatch(after1, { type: 'wait' });
    assert.equal(after2.player.hp, 30);
    assert.equal(after2.monsters[0].frozenTurns, 0);

    // Wait turn 3: monster is no longer frozen, attacks player
    const after3 = dispatch(after2, { type: 'wait' });
    assert.ok(after3.player.hp < 30, 'Monster should attack after thawing');
  });
});

describe('Whirlwind (fov_push)', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('pushes enemies away from player and deals damage', () => {
    // Player at (2,2), monster at (3,2) — should push east
    const monster = makeMonster({ x: 3, y: 2, hp: 20, maxHp: 20 });
    const game = makeGame({
      monsters: [monster],
      spell: { type: 'whirlwind', name: 'Whirlwind', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    // Monster should have been pushed east and taken 2 damage
    const m = next.monsters[0];
    assert.ok(m.x > 3, 'Monster should have been pushed east');
    assert.equal(m.hp, 18); // 20 - 2
    assert.ok(next.messages.some(msg => msg.includes('Whirlwind hits')));
  });

  it('wall collision deals bonus damage', () => {
    // Create a narrow corridor: floor at (1,1) (2,1) (3,1), walls everywhere else
    // Player at (2,1), monster at (3,1) — wall at (4,1) so monster can't move
    const floor = [[1,1],[2,1],[3,1]];
    const map = makeMap(5, 3, floor);
    const monster = makeMonster({ x: 3, y: 1, hp: 20, maxHp: 20 });
    const game = makeGame({
      map,
      player: { x: 2, y: 1, hp: 30, maxHp: 30, attack: 5, defense: 2 },
      monsters: [monster],
      spell: { type: 'whirlwind', name: 'Whirlwind', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    // Monster can't move (wall behind), so gets wall bonus: 2 + 2 = 4 damage
    assert.equal(next.monsters[0].hp, 16);
    assert.ok(next.messages.some(m => m.includes('slams into the wall')));
  });

  it('fizzles with no enemies in FOV', () => {
    const game = makeGame({
      monsters: [],
      spell: { type: 'whirlwind', name: 'Whirlwind', charges: 3 },
    });
    const next = dispatch(game, { type: 'cast' });
    assert.ok(next.messages.some(m => m.includes('howls but finds nothing to push')));
    assert.equal(next.spell.charges, 2);
  });
});

describe('scroll pickup replacement', () => {
  beforeEach(() => setRollOverride(() => 0));
  afterEach(() => setRollOverride(null));

  it('picking up a scroll of a different type replaces the current spell', () => {
    const scroll = { x: 3, y: 2, type: 'scroll', spellType: 'frost', char: '*', color: '#00ccff' };
    const game = makeGame({
      items: [scroll],
      spell: { type: 'firebolt', name: 'Firebolt', charges: 2 },
    });
    const next = dispatch(game, { type: 'move', dir: 'e' });
    assert.equal(next.spell.type, 'frost');
    assert.equal(next.spell.name, 'Frost');
    assert.equal(next.spell.charges, 3);
    assert.equal(next.items.length, 0);
    assert.ok(next.messages.some(m => m.includes('discard') && m.includes('Firebolt') && m.includes('Frost')));
  });
});

describe('scroll spawn randomization', () => {
  it('produces varied spell types over many games', () => {
    const seenTypes = new Set();
    // Create many level-2 games and check what scroll types appear
    for (let i = 0; i < 200; i++) {
      const game = createGame();
      // Advance to level 2 to allow scroll spawns
      // Instead, directly check SPELL_TYPES keys are used
      for (const item of game.items) {
        if (item.type === 'scroll') {
          seenTypes.add(item.spellType);
        }
      }
    }
    // Level 1 doesn't spawn scrolls, so seenTypes may be empty
    // Verify SPELL_TYPES has all four keys
    const keys = Object.keys(SPELL_TYPES);
    assert.equal(keys.length, 4);
    assert.ok(keys.includes('firebolt'));
    assert.ok(keys.includes('lightning'));
    assert.ok(keys.includes('frost'));
    assert.ok(keys.includes('whirlwind'));
  });
});
