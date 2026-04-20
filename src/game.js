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
  rat:      { name: 'Rat',      char: 'r', color: '#cc6633', hp: 5,  attack: 2, defense: 0, awareness: 3, minGold: 0, maxGold: 1 },
  skeleton: { name: 'Skeleton', char: 's', color: '#cccccc', hp: 10, attack: 4, defense: 1, awareness: 4, minGold: 2, maxGold: 4 },
  bear:     { name: 'Bear',     char: 'b', color: '#996633', hp: 20, attack: 6, defense: 3, awareness: 5, minGold: 4, maxGold: 8 },
  dragon:   { name: 'Dragon',   char: 'd', color: '#cc00cc', hp: 30, attack: 8, defense: 4, awareness: 6, minGold: 8, maxGold: 16 },
};

const PLAYER_STATS = { hp: 30, maxHp: 30, attack: 5, defense: 2 };

const EQUIPMENT_TYPES = {
  dagger: { name: 'Dagger', slot: 'weapon', stat: 'attack', bonus: 2, char: '|', color: '#aaaaaa' },
  sword:  { name: 'Sword',  slot: 'weapon', stat: 'attack', bonus: 4, char: '/', color: '#dddddd' },
  helmet: { name: 'Helmet', slot: 'helmet', stat: 'defense', bonus: 1, char: '^', color: '#88aacc' },
  shield: { name: 'Shield', slot: 'shield', stat: 'defense', bonus: 2, char: ']', color: '#99bbdd' },
};

export { EQUIPMENT_TYPES };

const SPELL_TYPES = {
  firebolt: {
    name: 'Firebolt', char: '~', color: '#ff6600',
    damage: 8, charges: 3, mechanic: 'bolt',
    description: 'Hurls a bolt of fire in a straight line.',
  },
  lightning: {
    name: 'Lightning Bolt', char: '*', color: '#ffff00',
    damage: 4, charges: 3, mechanic: 'burst', range: 3,
    description: 'Unleashes a burst of lightning that strikes all nearby enemies.',
  },
  frost: {
    name: 'Frost', char: '*', color: '#00ccff',
    damage: 3, charges: 3, mechanic: 'bolt', freezeDuration: 3,
    description: 'Fires a freezing bolt that damages and immobilizes an enemy.',
  },
  whirlwind: {
    name: 'Whirlwind', char: '*', color: '#aaddaa',
    damage: 2, charges: 3, mechanic: 'fov_push', wallDamage: 2,
    description: 'Summons a whirlwind that pushes all visible enemies away.',
  },
};

export { SPELL_TYPES };

const MAX_MESSAGES = 20;
const WIN_LEVEL = 5;
const FOOD_HEAL = 10;
const IDOL_MAXHP_BONUS = 5;

const DEFAULT_STATS = {
  monstersKilled: 0, damageDealt: 0, damageTaken: 0,
  foodUsed: 0, stepsTaken: 0, causeOfDeath: null, goldCollected: 0,
  idolOfferings: 0, spellsCast: 0,
};

function getStats(game) {
  return game.stats || { ...DEFAULT_STATS };
}

export function createGame() {
  return newLevel({
    player: { ...PLAYER_STATS },
    inventory: { food: 0, gold: 0 },
    equipment: { weapon: null, helmet: null, shield: null },
    spell: null,
    castPending: false,
    level: 1,
    messages: [],
    gameOver: false,
    won: false,
    stats: {
      monstersKilled: 0,
      damageDealt: 0,
      damageTaken: 0,
      foodUsed: 0,
      stepsTaken: 0,
      causeOfDeath: null,
      goldCollected: 0,
      idolOfferings: 0,
      spellsCast: 0,
    },
  });
}

function newLevel(state) {
  const map = createMap();
  const player = { ...state.player, x: map.spawn.x, y: map.spawn.y };
  const monsters = spawnMonsters(map, state.level);
  const items = spawnFood(map, monsters);
  spawnEquipment(map, monsters, items, state.level);
  spawnTreasure(map, monsters, items, state.level);
  spawnIdol(map, monsters, items, state.level);
  spawnScrolls(map, monsters, items, state.level);
  if (state.level < WIN_LEVEL) {
    placeStair(map);
  } else {
    placePrincess(map, items);
  }

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
    equipment: state.equipment ? { ...state.equipment } : { weapon: null, helmet: null, shield: null },
    spell: state.spell || null,
    castPending: state.castPending || false,
    level: state.level,
    messages: state.messages,
    gameOver: false,
    won: false,
    revealed,
    fov,
    stats: state.stats ? { ...state.stats } : {
      monstersKilled: 0, damageDealt: 0, damageTaken: 0,
      foodUsed: 0, stepsTaken: 0, causeOfDeath: null, goldCollected: 0,
      idolOfferings: 0, spellsCast: 0,
    },
  };
}

function placeStair(map) {
  // Place stair in last room (different from spawn room 0)
  const room = map.rooms[map.rooms.length - 1];
  const cx = Math.floor(room.x + room.w / 2);
  const cy = Math.floor(room.y + room.h / 2);
  map.tiles[cy][cx] = '>';
}

function placePrincess(map, items) {
  const room = map.rooms[map.rooms.length - 1];
  const cx = Math.floor(room.x + room.w / 2);
  const cy = Math.floor(room.y + room.h / 2);
  items.push({ x: cx, y: cy, type: 'princess', char: 'P', color: '#ff88cc' });
}

function spawnFood(map, monsters) {
  const items = [];
  // 1-2 food items per level, placed in random rooms (not room 0)
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
        items.push({ x, y, type: 'food', char: '%', color: '#ff44ff' });
        break;
      }
    }
  }
  return items;
}

function spawnTreasure(map, monsters, items, level) {
  // 0-1 gold piles per level, not in room 0
  if (Math.random() < 0.5) return; // ~50% chance of no gold pile
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
      items.push({ x, y, type: 'gold', char: '$', color: '#ffcc00', value: 2 * level });
      break;
    }
  }
}

function spawnIdol(map, monsters, items, level) {
  if (level < 2 || level > 4) return;
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
      items.push({ x, y, type: 'idol', char: 'I', color: '#ccaa44' });
      break;
    }
  }
}

function spawnScrolls(map, monsters, items, level) {
  if (level < 2) return;
  if (Math.random() < 0.5) return; // 0-1 scrolls
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
      const spellKeys = Object.keys(SPELL_TYPES);
      const spellKey = spellKeys[Math.floor(Math.random() * spellKeys.length)];
      const spell = SPELL_TYPES[spellKey];
      items.push({ x, y, type: 'scroll', spellType: spellKey, char: spell.char, color: spell.color });
      break;
    }
  }
}

function pickEquipmentType(level) {
  // Levels 1-2: daggers and helmets; levels 3+: add swords and shields
  if (level <= 2) {
    return Math.random() < 0.5 ? 'dagger' : 'helmet';
  }
  const roll = Math.random();
  if (roll < 0.25) return 'dagger';
  if (roll < 0.50) return 'helmet';
  if (roll < 0.75) return 'sword';
  return 'shield';
}

function spawnEquipment(map, monsters, items, level) {
  const count = 1 + Math.floor(Math.random() * 2); // 1-2 pieces
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
        const type = pickEquipmentType(level);
        const template = EQUIPMENT_TYPES[type];
        items.push({ x, y, type, char: template.char, color: template.color });
        break;
      }
    }
  }
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
            attack: template.attack, defense: template.defense, awareness: template.awareness,
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
    case 'interact':
    case 'descend':
      next = handleInteract(game);
      break;
    case 'useFood':
      next = handleUseFood(game);
      break;
    case 'cast':
      next = handleCast(game);
      break;
    case 'castDir':
      next = handleCastDir(game, action.dir);
      break;
    case 'castCancel':
      next = handleCastCancel(game);
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
    stats: { ...getStats(game), stepsTaken: getStats(game).stepsTaken + 1 },
  };

  // Auto-pickup items at new position
  moved = checkPickup(moved);

  return runMonsterTurns(moved);
}

function checkPickup(game) {
  const { player, items } = game;
  const itemHere = items.find(it => it.x === player.x && it.y === player.y);
  if (!itemHere) return game;
  if (itemHere.type === 'idol') return game;
  if (itemHere.type === 'princess') return game;

  if (itemHere.type === 'gold') {
    const value = itemHere.value || 0;
    const messages = [...game.messages, `You pick up ${value} gold.`];
    return {
      ...game,
      items: items.filter(it => it !== itemHere),
      inventory: { ...game.inventory, gold: game.inventory.gold + value },
      stats: { ...getStats(game), goldCollected: getStats(game).goldCollected + value },
      messages: messages.slice(-MAX_MESSAGES),
    };
  }

  if (itemHere.type === 'food') {
    const messages = [...game.messages, 'You pick up some food.'];
    return {
      ...game,
      items: items.filter(it => it !== itemHere),
      inventory: { ...game.inventory, food: game.inventory.food + 1 },
      messages: messages.slice(-MAX_MESSAGES),
    };
  }

  if (itemHere.type === 'scroll') {
    const spellDef = SPELL_TYPES[itemHere.spellType];
    if (!spellDef) return game;
    const currentSpell = game.spell;
    if (!currentSpell) {
      const messages = [...game.messages, `You pick up a ${spellDef.name} scroll (${spellDef.charges} charges).`];
      return {
        ...game,
        items: items.filter(it => it !== itemHere),
        spell: { type: itemHere.spellType, name: spellDef.name, charges: spellDef.charges },
        messages: messages.slice(-MAX_MESSAGES),
      };
    }
    if (currentSpell.type === itemHere.spellType && currentSpell.charges <= spellDef.charges) {
      const messages = [...game.messages, `You swap for a fresher ${spellDef.name} scroll.`];
      return {
        ...game,
        items: items.filter(it => it !== itemHere),
        spell: { type: itemHere.spellType, name: spellDef.name, charges: spellDef.charges },
        messages: messages.slice(-MAX_MESSAGES),
      };
    }
    // Replace current spell with the new one
    const messages = [...game.messages, `You discard your ${currentSpell.name} scroll and pick up a ${spellDef.name} scroll (${spellDef.charges} charges).`];
    return {
      ...game,
      items: items.filter(it => it !== itemHere),
      spell: { type: itemHere.spellType, name: spellDef.name, charges: spellDef.charges },
      castPending: false,
      messages: messages.slice(-MAX_MESSAGES),
    };
  }

  const eqDef = EQUIPMENT_TYPES[itemHere.type];
  if (eqDef) {
    const slot = eqDef.slot;
    const current = game.equipment[slot];
    if (current && current.bonus >= eqDef.bonus) {
      const messages = [...game.messages, 'You already have better equipment.'];
      return { ...game, messages: messages.slice(-MAX_MESSAGES) };
    }
    const statLabel = eqDef.stat === 'attack' ? 'attack' : 'defense';
    const messages = [...game.messages, `You equip a ${eqDef.name} (+${eqDef.bonus} ${statLabel}).`];
    return {
      ...game,
      items: items.filter(it => it !== itemHere),
      equipment: { ...game.equipment, [slot]: { type: itemHere.type, name: eqDef.name, bonus: eqDef.bonus, stat: eqDef.stat } },
      messages: messages.slice(-MAX_MESSAGES),
    };
  }
  return game;
}

function handleInteract(game) {
  const { player, items } = game;
  const princessHere = items.find(it => it.x === player.x && it.y === player.y && it.type === 'princess');

  if (princessHere) {
    const messages = [...game.messages, 'You rescue the princess! The kingdom celebrates.'];
    return {
      ...game,
      messages: messages.slice(-MAX_MESSAGES),
      won: true,
    };
  }

  const idolHere = items.find(it => it.x === player.x && it.y === player.y && it.type === 'idol');

  if (idolHere) {
    const cost = player.maxHp;
    if (game.inventory.gold < cost) {
      const messages = [...game.messages, `The idol demands ${cost} gold. You have ${game.inventory.gold}.`];
      return { ...game, messages: messages.slice(-MAX_MESSAGES) };
    }
    const newMaxHp = player.maxHp + IDOL_MAXHP_BONUS;
    const messages = [...game.messages, `You offer ${cost} gold to the idol. Your vigor swells. (+${IDOL_MAXHP_BONUS} max HP, fully healed)`];
    return {
      ...game,
      player: { ...player, maxHp: newMaxHp, hp: newMaxHp },
      inventory: { ...game.inventory, gold: game.inventory.gold - cost },
      stats: { ...getStats(game), idolOfferings: getStats(game).idolOfferings + 1 },
      messages: messages.slice(-MAX_MESSAGES),
    };
  }

  const tile = getTile(game.map, player.x, player.y);
  if (tile !== '>') {
    const messages = [...game.messages, 'Nothing to interact with here.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }

  const messages = [...game.messages, `You descend to level ${game.level + 1}.`];
  return newLevel({
    player: { ...game.player },
    inventory: { ...game.inventory },
    equipment: { ...game.equipment },
    spell: game.spell,
    castPending: game.castPending,
    level: game.level + 1,
    messages: messages.slice(-MAX_MESSAGES),
    gameOver: false,
    won: false,
    stats: { ...game.stats },
  });
}

function handleUseFood(game) {
  if (game.inventory.food <= 0) {
    const messages = [...game.messages, 'You have no food.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }
  if (game.player.hp >= game.player.maxHp) {
    const messages = [...game.messages, 'You are already at full health.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }

  const newHp = Math.min(game.player.maxHp, game.player.hp + FOOD_HEAL);
  const healed = newHp - game.player.hp;
  const messages = [...game.messages, `You eat food and restore ${healed} HP.`];
  return {
    ...game,
    player: { ...game.player, hp: newHp },
    inventory: { ...game.inventory, food: game.inventory.food - 1 },
    messages: messages.slice(-MAX_MESSAGES),
    stats: { ...getStats(game), foodUsed: getStats(game).foodUsed + 1 },
  };
}

function handleCast(game) {
  if (!game.spell || game.spell.charges <= 0) {
    const messages = [...game.messages, 'You have no spell to cast.'];
    return { ...game, messages: messages.slice(-MAX_MESSAGES) };
  }
  const spellDef = SPELL_TYPES[game.spell.type];
  if (spellDef.mechanic === 'burst') {
    return handleBurstCast(game);
  }
  if (spellDef.mechanic === 'fov_push') {
    return handleFovPushCast(game);
  }
  // bolt mechanic: prompt for direction
  const messages = [...game.messages, 'Cast spell \u2014 choose direction (\u2190\u2191\u2193\u2192).'];
  return { ...game, castPending: true, messages: messages.slice(-MAX_MESSAGES) };
}

function handleBurstCast(game) {
  const { player, spell } = game;
  const spellDef = SPELL_TYPES[spell.type];
  const messages = [...game.messages];
  let monsters = game.monsters;
  let inventory = game.inventory;
  let stats = { ...getStats(game), spellsCast: getStats(game).spellsCast + 1 };

  // Find all monsters within Chebyshev distance
  const inRange = monsters.filter(m =>
    Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y)) <= spellDef.range
  );

  if (inRange.length === 0) {
    messages.push('Your Lightning Bolt crackles but finds no target.');
  } else {
    for (const target of inRange) {
      const damage = spellDef.damage;
      const newHp = target.hp - damage;
      messages.push(`Your ${spellDef.name} hits the ${target.name} for ${damage} damage!`);
      if (newHp <= 0) {
        messages.push(`The ${target.name} is defeated!`);
        monsters = monsters.filter(m => m !== target);
        stats = { ...stats, monstersKilled: stats.monstersKilled + 1 };
        const template = MONSTER_TYPES[target.type];
        if (template) {
          const gold = template.minGold + Math.floor(Math.random() * (template.maxGold - template.minGold + 1));
          if (gold > 0) {
            inventory = { ...inventory, gold: inventory.gold + gold };
            stats = { ...stats, goldCollected: stats.goldCollected + gold };
            messages.push(`The ${target.name} dropped ${gold} gold.`);
          }
        }
      } else {
        monsters = monsters.map(m => m === target ? { ...m, hp: newHp } : m);
      }
    }
  }

  let newSpell;
  const newCharges = spell.charges - 1;
  if (newCharges <= 0) {
    newSpell = null;
    messages.push(`Your ${spellDef.name} scroll crumbles to dust.`);
  } else {
    newSpell = { ...spell, charges: newCharges };
  }

  const updated = {
    ...game,
    monsters,
    inventory,
    spell: newSpell,
    castPending: false,
    messages: messages.slice(-MAX_MESSAGES),
    stats,
  };
  return runMonsterTurns(updated);
}

function handleFovPushCast(game) {
  const { player, spell, fov } = game;
  const spellDef = SPELL_TYPES[spell.type];
  const messages = [...game.messages];
  let monsters = [...game.monsters];
  let inventory = game.inventory;
  let stats = { ...getStats(game), spellsCast: getStats(game).spellsCast + 1 };

  // Find all monsters in FOV
  const inFOV = monsters.filter(m => fov && fov.has(`${m.x},${m.y}`));

  if (inFOV.length === 0) {
    messages.push('Your Whirlwind howls but finds nothing to push.');
  } else {
    // Sort farthest first (Chebyshev distance) to avoid blocking
    const sorted = [...inFOV].sort((a, b) => {
      const distA = Math.max(Math.abs(a.x - player.x), Math.abs(a.y - player.y));
      const distB = Math.max(Math.abs(b.x - player.x), Math.abs(b.y - player.y));
      return distB - distA;
    });

    for (const target of sorted) {
      const damage = spellDef.damage;
      const dx = Math.sign(target.x - player.x);
      const dy = Math.sign(target.y - player.y);

      // Push the monster away tile-by-tile
      let cx = target.x;
      let cy = target.y;
      let blockedByWall = false;
      if (dx === 0 && dy === 0) {
        // Monster is on player tile — can't push
      } else {
        while (true) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!isWalkable(game.map, nx, ny)) { blockedByWall = true; break; }
          if (monsters.some(m => m !== target && m.x === nx && m.y === ny)) { break; }
          cx = nx;
          cy = ny;
        }
      }

      const didMove = cx !== target.x || cy !== target.y;
      let totalDamage = damage;

      if (!didMove && blockedByWall) {
        // Couldn't move at all and blocked by wall — wall bonus
        totalDamage += spellDef.wallDamage;
        messages.push(`The ${target.name} slams into the wall!`);
      }

      const newHp = target.hp - totalDamage;
      messages.push(`Your ${spellDef.name} hits the ${target.name} for ${totalDamage} damage!`);

      if (newHp <= 0) {
        messages.push(`The ${target.name} is defeated!`);
        monsters = monsters.filter(m => m !== target);
        stats = { ...stats, monstersKilled: stats.monstersKilled + 1 };
        const template = MONSTER_TYPES[target.type];
        if (template) {
          const gold = template.minGold + Math.floor(Math.random() * (template.maxGold - template.minGold + 1));
          if (gold > 0) {
            inventory = { ...inventory, gold: inventory.gold + gold };
            stats = { ...stats, goldCollected: stats.goldCollected + gold };
            messages.push(`The ${target.name} dropped ${gold} gold.`);
          }
        }
      } else {
        monsters = monsters.map(m => m === target ? { ...m, hp: newHp, x: cx, y: cy } : m);
      }
    }
  }

  let newSpell;
  const newCharges = spell.charges - 1;
  if (newCharges <= 0) {
    newSpell = null;
    messages.push(`Your ${spellDef.name} scroll crumbles to dust.`);
  } else {
    newSpell = { ...spell, charges: newCharges };
  }

  const updated = {
    ...game,
    monsters,
    inventory,
    spell: newSpell,
    castPending: false,
    messages: messages.slice(-MAX_MESSAGES),
    stats,
  };
  return runMonsterTurns(updated);
}

function handleCastDir(game, dir) {
  if (!game.castPending || !game.spell) return game;
  const delta = DIRECTIONS[dir];
  if (!delta) return game;

  const messages = [...game.messages];
  let { player, monsters, spell } = game;
  const spellDef = SPELL_TYPES[spell.type];
  let stats = { ...getStats(game), spellsCast: getStats(game).spellsCast + 1 };
  let inventory = game.inventory;

  // Resolve bolt: travel from player position in chosen direction
  let bx = player.x + delta.dx;
  let by = player.y + delta.dy;
  let hitMonster = null;
  while (isWalkable(game.map, bx, by)) {
    hitMonster = monsters.find(m => m.x === bx && m.y === by);
    if (hitMonster) break;
    bx += delta.dx;
    by += delta.dy;
  }

  if (hitMonster) {
    const damage = spellDef.damage;
    const newHp = hitMonster.hp - damage;
    messages.push(`Your ${spellDef.name} hits the ${hitMonster.name} for ${damage} damage!`);
    if (newHp <= 0) {
      messages.push(`The ${hitMonster.name} is defeated!`);
      monsters = monsters.filter(m => m !== hitMonster);
      stats = { ...stats, monstersKilled: stats.monstersKilled + 1 };
      const template = MONSTER_TYPES[hitMonster.type];
      if (template) {
        const gold = template.minGold + Math.floor(Math.random() * (template.maxGold - template.minGold + 1));
        if (gold > 0) {
          inventory = { ...inventory, gold: inventory.gold + gold };
          stats = { ...stats, goldCollected: stats.goldCollected + gold };
          messages.push(`The ${hitMonster.name} dropped ${gold} gold.`);
        }
      }
    } else {
      const frozen = spellDef.freezeDuration ? { frozenTurns: spellDef.freezeDuration } : {};
      monsters = monsters.map(m => m === hitMonster ? { ...m, hp: newHp, ...frozen } : m);
      if (spellDef.freezeDuration) {
        messages.push(`The ${hitMonster.name} is frozen!`);
      }
    }
  } else {
    messages.push(`Your ${spellDef.name} fizzles against the wall.`);
  }

  // Decrement charges
  let newSpell;
  const newCharges = spell.charges - 1;
  if (newCharges <= 0) {
    newSpell = null;
    messages.push(`Your ${spellDef.name} scroll crumbles to dust.`);
  } else {
    newSpell = { ...spell, charges: newCharges };
  }

  const updated = {
    ...game,
    monsters,
    inventory,
    spell: newSpell,
    castPending: false,
    messages: messages.slice(-MAX_MESSAGES),
    stats,
  };
  return runMonsterTurns(updated);
}

function handleCastCancel(game) {
  if (!game.castPending) return game;
  const messages = [...game.messages, 'Spell cancelled.'];
  return { ...game, castPending: false, messages: messages.slice(-MAX_MESSAGES) };
}

let _rollOverride = null;

export function setRollOverride(fn) { _rollOverride = fn; }

function rollVariance() {
  if (_rollOverride) return _rollOverride();
  return Math.floor(Math.random() * 3) - 1;
}

function getEquipmentBonus(equipment, stat) {
  let bonus = 0;
  for (const slot of Object.values(equipment)) {
    if (slot && slot.stat === stat) bonus += slot.bonus;
  }
  return bonus;
}

function playerAttack(game, target) {
  const atkBonus = getEquipmentBonus(game.equipment, 'attack');
  const base = game.player.attack + atkBonus - target.defense;
  const damage = Math.max(0, base + rollVariance());
  const newHp = target.hp - damage;
  const messages = [...game.messages];
  messages.push(`You hit the ${target.name} for ${damage} damage.`);

  let monsters;
  let inventory = game.inventory;
  let stats = { ...getStats(game), damageDealt: getStats(game).damageDealt + damage };
  if (newHp <= 0) {
    messages.push(`The ${target.name} is defeated!`);
    monsters = game.monsters.filter(m => m !== target);
    stats = { ...stats, monstersKilled: stats.monstersKilled + 1 };
    const template = MONSTER_TYPES[target.type];
    if (template) {
      const gold = template.minGold + Math.floor(Math.random() * (template.maxGold - template.minGold + 1));
      if (gold > 0) {
        inventory = { ...inventory, gold: inventory.gold + gold };
        stats = { ...stats, goldCollected: stats.goldCollected + gold };
        messages.push(`The ${target.name} dropped ${gold} gold.`);
      }
    }
  } else {
    monsters = game.monsters.map(m =>
      m === target ? { ...m, hp: newHp } : m
    );
  }

  const updated = { ...game, monsters, inventory, messages: messages.slice(-MAX_MESSAGES), stats };
  return runMonsterTurns(updated);
}

function runMonsterTurns(game) {
  let { player, monsters, messages, map } = game;
  messages = [...messages];
  let updatedMonsters = [...monsters];
  let currentPlayer = { ...player };
  let dead = false;
  let stats = getStats(game);

  for (let i = 0; i < updatedMonsters.length; i++) {
    const m = updatedMonsters[i];

    // Skip turn if frozen
    if (m.frozenTurns > 0) {
      updatedMonsters[i] = { ...m, frozenTurns: m.frozenTurns - 1 };
      continue;
    }

    // Skip turn if staggered (recover from attack cooldown)
    if (m.staggered) {
      updatedMonsters[i] = { ...m, staggered: false };
      continue;
    }

    // Manhattan distance (cardinal-only movement metric)
    const dist = Math.abs(m.x - currentPlayer.x) + Math.abs(m.y - currentPlayer.y);

    if (dist === 1) {
      // Adjacent: attack player
      const defBonus = getEquipmentBonus(game.equipment, 'defense');
      const base = m.attack - (currentPlayer.defense + defBonus);
      const damage = Math.max(0, base + rollVariance());
      currentPlayer = { ...currentPlayer, hp: currentPlayer.hp - damage };
      stats = { ...stats, damageTaken: stats.damageTaken + damage };
      messages.push(`The ${m.name} hits you for ${damage} damage.`);
      updatedMonsters[i] = { ...m, staggered: true };
      if (currentPlayer.hp <= 0) {
        currentPlayer.hp = 0;
        stats = { ...stats, causeOfDeath: m.name };
        dead = true;
        break;
      }
    } else {
      const awareness = m.awareness || 4;
      if (dist <= awareness) {
        // Line-of-sight check
        const monsterFOV = computeFOV(map, m.x, m.y, awareness);
        const canSee = monsterFOV.has(`${currentPlayer.x},${currentPlayer.y}`);
        if (canSee) {
          // Move toward player (greedy cardinal)
          const dx = Math.sign(currentPlayer.x - m.x);
          const dy = Math.sign(currentPlayer.y - m.y);
          const moved = tryMonsterMove(map, updatedMonsters, currentPlayer, i, dx, dy);
          if (moved) {
            updatedMonsters = updatedMonsters.map((om, idx) => idx === i ? moved : om);
          }
        }
      }
    }
  }

  return {
    ...game,
    player: currentPlayer,
    monsters: updatedMonsters,
    messages: messages.slice(-MAX_MESSAGES),
    gameOver: dead,
    stats,
  };
}

function tryMonsterMove(map, monsters, player, monsterIdx, dx, dy) {
  const m = monsters[monsterIdx];
  // Cardinal only — prefer the axis with the larger gap
  const absDx = Math.abs(player.x - m.x);
  const absDy = Math.abs(player.y - m.y);
  const candidates = absDx >= absDy
    ? [
        { x: m.x + dx, y: m.y },       // horizontal first
        { x: m.x, y: m.y + dy },       // vertical fallback
      ]
    : [
        { x: m.x, y: m.y + dy },       // vertical first
        { x: m.x + dx, y: m.y },       // horizontal fallback
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
