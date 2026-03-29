import { createMap, isWalkable, getTile } from './map.js';
import { computeFOV, TORCH_RADIUS } from './fov.js';

export { FLOOR, WALL, STAIR } from './map.js';

const DIRECTIONS = {
  n:  { dx:  0, dy: -1 },
  s:  { dx:  0, dy:  1 },
  e:  { dx:  1, dy:  0 },
  w:  { dx: -1, dy:  0 },
};

const MONSTER_TYPES = {
  rat:      { name: 'Rat',      char: 'r', color: '#cc6633', hp: 5,  attack: 2, defense: 0 },
  skeleton: { name: 'Skeleton', char: 's', color: '#cccccc', hp: 10, attack: 4, defense: 1 },
  bear:     { name: 'Bear',     char: 'b', color: '#996633', hp: 20, attack: 6, defense: 3 },
  dragon:   { name: 'Dragon',   char: 'd', color: '#cc00cc', hp: 30, attack: 8, defense: 4 },
};

const PLAYER_STATS = { hp: 30, maxHp: 30, attack: 5, defense: 2 };

const MAX_MESSAGES = 5;
const WIN_LEVEL = 5;
const POTION_HEAL = 10;

export function createGame() {
  return newLevel({
    player: { ...PLAYER_STATS },
    inventory: { potions: 0 },
    level: 1,
    messages: [],
    gameOver: false,
    won: false,
  });
}

function newLevel(state) {
  const map = createMap();
  const player = { ...state.player, x: map.spawn.x, y: map.spawn.y };
  const monsters = spawnMonsters(map, state.level);
  const items = spawnPotions(map, monsters);
  placeStair(map);

  // Initialize revealed array (all false) and compute initial FOV
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
    monsters,
    items,
    inventory: { ...state.inventory },
    level: state.level,
    messages: state.messages,
    gameOver: false,
    won: false,
    revealed,
    fov,
  };
}

function placeStair(map) {
  // Place stair in last room (different from spawn room 0)
  const room = map.rooms[map.rooms.length - 1];
  const cx = Math.floor(room.x + room.w / 2);
  const cy = Math.floor(room.y + room.h / 2);
  map.tiles[cy][cx] = '>';
}

function spawnPotions(map, monsters) {
  const items = [];
  // 1-2 potions per level, placed in random rooms (not room 0)
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const roomIdx = 1 + Math.floor(Math.random() * (map.rooms.length - 1));
    const room = map.rooms[roomIdx];
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = room.x + Math.floor(Math.random() * room.w);
      const y = room.y + Math.floor(Math.random() * room.h);
      if (
        isWalkable(map, x, y) &&
        !monsters.some(m => m.x === x && m.y === y) &&
        !items.some(it => it.x === x && it.y === y) &&
        map.tiles[y][x] !== '>'
      ) {
        items.push({ x, y, type: 'potion', char: '!', color: '#ff44ff' });
        break;
      }
    }
  }
  return items;
}

function spawnMonsters(map, level) {
  const monsters = [];
  const baseCount = 1 + Math.floor(level / 2);
  for (let i = 1; i < map.rooms.length; i++) {
    const room = map.rooms[i];
    const count = baseCount + Math.floor(Math.random() * 2); // baseCount to baseCount+1
    for (let j = 0; j < count; j++) {
      const type = pickMonsterType(level);
      const template = MONSTER_TYPES[type];
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = room.x + Math.floor(Math.random() * room.w);
        const y = room.y + Math.floor(Math.random() * room.h);
        if (isWalkable(map, x, y) && !monsters.some(m => m.x === x && m.y === y)) {
          monsters.push({
            x, y, type, name: template.name, char: template.char,
            color: template.color, hp: template.hp, maxHp: template.hp,
            attack: template.attack, defense: template.defense,
          });
          break;
        }
      }
    }
  }
  return monsters;
}

function pickMonsterType(level) {
  const roll = Math.random();
  if (level >= 4 && roll < 0.15) return 'dragon';
  if (level >= 3 && roll < 0.35) return 'bear';
  return Math.random() < 0.5 ? 'rat' : 'skeleton';
}

function updateFOV(game) {
  if (!game.revealed || !game.map) return game;
  const fov = computeFOV(game.map, game.player.x, game.player.y, TORCH_RADIUS);
  const revealed = game.revealed.map(row => [...row]);
  for (const key of fov.keys()) {
    const [rx, ry] = key.split(',').map(Number);
    if (ry >= 0 && ry < game.map.height && rx >= 0 && rx < game.map.width) {
      revealed[ry][rx] = true;
    }
  }
  return { ...game, fov, revealed };
}

export function dispatch(game, action) {
  if ((game.gameOver || game.won) && action.type !== 'restart') return game;

  let next;
  switch (action.type) {
    case 'move':
      next = handleMove(game, action.dir);
      break;
    case 'wait':
      next = runMonsterTurns(game);
      break;
    case 'descend':
      next = handleDescend(game);
      break;
    case 'usePotion':
      next = handleUsePotion(game);
      break;
    case 'restart':
      return createGame();
    default:
      return game;
  }
  return updateFOV(next);
}

function handleMove(game, dir) {
  const delta = DIRECTIONS[dir];
  if (!delta) return game;

  const nx = game.player.x + delta.dx;
  const ny = game.player.y + delta.dy;

  // Check for monster at target tile
  const targetMonster = game.monsters.find(m => m.x === nx && m.y === ny);
  if (targetMonster) {
    return playerAttack(game, targetMonster);
  }

  if (!isWalkable(game.map, nx, ny)) return runMonsterTurns(game);

  let moved = {
    ...game,
    player: { ...game.player, x: nx, y: ny },
  };

  // Auto-pickup items at new position
  moved = checkPickup(moved);

  return runMonsterTurns(moved);
}

function checkPickup(game) {
  const { player, items } = game;
  const itemHere = items.find(it => it.x === player.x && it.y === player.y);
  if (!itemHere) return game;

  if (itemHere.type === 'potion') {
    const messages = [...game.messages, 'You pick up a health potion.'];
    return {
      ...game,
      items: items.filter(it => it !== itemHere),
      inventory: { ...game.inventory, potions: game.inventory.potions + 1 },
      messages: messages.slice(-MAX_MESSAGES),
    };
  }
  return game;
}

function handleDescend(game) {
  const tile = getTile(game.map, game.player.x, game.player.y);
  if (tile !== '>') {
    const messages = [...game.messages, 'There are no stairs here.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }

  if (game.level >= WIN_LEVEL) {
    const messages = [...game.messages, 'You descend the final staircase and escape the dungeon!'];
    return {
      ...game,
      messages: messages.slice(-MAX_MESSAGES),
      won: true,
    };
  }

  const messages = [...game.messages, `You descend to level ${game.level + 1}.`];
  return newLevel({
    player: { ...game.player },
    inventory: { ...game.inventory },
    level: game.level + 1,
    messages: messages.slice(-MAX_MESSAGES),
    gameOver: false,
    won: false,
  });
}

function handleUsePotion(game) {
  if (game.inventory.potions <= 0) {
    const messages = [...game.messages, 'You have no potions.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }
  if (game.player.hp >= game.player.maxHp) {
    const messages = [...game.messages, 'You are already at full health.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }

  const newHp = Math.min(game.player.maxHp, game.player.hp + POTION_HEAL);
  const healed = newHp - game.player.hp;
  const messages = [...game.messages, `You drink a potion and restore ${healed} HP.`];
  return {
    ...game,
    player: { ...game.player, hp: newHp },
    inventory: { ...game.inventory, potions: game.inventory.potions - 1 },
    messages: messages.slice(-MAX_MESSAGES),
  };
}

function playerAttack(game, target) {
  const damage = Math.max(0, game.player.attack - target.defense);
  const newHp = target.hp - damage;
  const messages = [...game.messages];
  messages.push(`You hit the ${target.name} for ${damage} damage.`);

  let monsters;
  if (newHp <= 0) {
    messages.push(`The ${target.name} is defeated!`);
    monsters = game.monsters.filter(m => m !== target);
  } else {
    monsters = game.monsters.map(m =>
      m === target ? { ...m, hp: newHp } : m
    );
  }

  const updated = { ...game, monsters, messages: messages.slice(-MAX_MESSAGES) };
  return runMonsterTurns(updated);
}

function runMonsterTurns(game) {
  let { player, monsters, messages, map } = game;
  messages = [...messages];
  let updatedMonsters = [...monsters];
  let currentPlayer = { ...player };
  let dead = false;

  for (let i = 0; i < updatedMonsters.length; i++) {
    const m = updatedMonsters[i];

    // Chebyshev distance
    const dist = Math.max(Math.abs(m.x - currentPlayer.x), Math.abs(m.y - currentPlayer.y));

    if (dist === 1) {
      // Adjacent: attack player
      const damage = Math.max(0, m.attack - currentPlayer.defense);
      currentPlayer = { ...currentPlayer, hp: currentPlayer.hp - damage };
      messages.push(`The ${m.name} hits you for ${damage} damage.`);
      if (currentPlayer.hp <= 0) {
        currentPlayer.hp = 0;
        dead = true;
        break;
      }
    } else if (dist <= 6) {
      // Move toward player (greedy)
      const dx = Math.sign(currentPlayer.x - m.x);
      const dy = Math.sign(currentPlayer.y - m.y);
      const moved = tryMonsterMove(map, updatedMonsters, currentPlayer, i, dx, dy);
      if (moved) {
        updatedMonsters = updatedMonsters.map((om, idx) => idx === i ? moved : om);
      }
    }
  }

  return {
    ...game,
    player: currentPlayer,
    monsters: updatedMonsters,
    messages: messages.slice(-MAX_MESSAGES),
    gameOver: dead,
  };
}

function tryMonsterMove(map, monsters, player, monsterIdx, dx, dy) {
  const m = monsters[monsterIdx];
  // Try primary direction, then each axis separately
  const candidates = [
    { x: m.x + dx, y: m.y + dy },
    { x: m.x + dx, y: m.y },
    { x: m.x, y: m.y + dy },
  ];

  for (const pos of candidates) {
    if (pos.x === m.x && pos.y === m.y) continue;
    if (!isWalkable(map, pos.x, pos.y)) continue;
    if (pos.x === player.x && pos.y === player.y) continue;
    if (monsters.some((other, idx) => idx !== monsterIdx && other.x === pos.x && other.y === pos.y)) continue;
    return { ...m, x: pos.x, y: pos.y };
  }
  return null;
}

/**
 * Return a 2D slice of the map centered on the player, sized viewW × viewH.
 * Each cell is { tile, isPlayer, monster, item, visibility, brightness }.
 * visibility: "visible" | "revealed" | "hidden"
 * brightness: 0.0–1.0 (only meaningful when visibility is "visible")
 */
export function getVisibleTiles(game, viewW, viewH) {
  const { map, player, monsters, items, fov, revealed } = game;

  let camX = player.x - Math.floor(viewW / 2);
  let camY = player.y - Math.floor(viewH / 2);
  camX = Math.max(0, Math.min(camX, map.width - viewW));
  camY = Math.max(0, Math.min(camY, map.height - viewH));

  // Build monster lookup
  const monsterAt = {};
  for (const m of monsters) {
    monsterAt[`${m.x},${m.y}`] = m;
  }

  // Build item lookup
  const itemAt = {};
  if (items) {
    for (const it of items) {
      itemAt[`${it.x},${it.y}`] = it;
    }
  }

  const result = [];
  for (let vy = 0; vy < viewH; vy++) {
    const row = [];
    for (let vx = 0; vx < viewW; vx++) {
      const mx = camX + vx;
      const my = camY + vy;
      const inBounds = mx >= 0 && mx < map.width && my >= 0 && my < map.height;
      const key = `${mx},${my}`;
      const isVisible = fov && fov.has(key);
      const isRevealed = inBounds && revealed && revealed[my][mx];

      let visibility;
      if (isVisible) visibility = 'visible';
      else if (isRevealed) visibility = 'revealed';
      else visibility = 'hidden';

      const tile = inBounds ? map.tiles[my][mx] : ' ';
      // Only show monsters and items in visible cells
      const monster = visibility === 'visible' ? (monsterAt[key] || null) : null;
      const item = visibility === 'visible' ? (itemAt[key] || null) : null;
      const bright = isVisible ? fov.get(key) : 0;

      row.push({
        tile,
        isPlayer: visibility === 'visible' && mx === player.x && my === player.y,
        monster,
        item,
        visibility,
        brightness: bright,
        x: mx,
        y: my,
      });
    }
    result.push(row);
  }
  return result;
}
