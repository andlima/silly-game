import { createMap, isWalkable } from './map.js';

export { FLOOR, WALL } from './map.js';

const DIRECTIONS = {
  n:  { dx:  0, dy: -1 },
  s:  { dx:  0, dy:  1 },
  e:  { dx:  1, dy:  0 },
  w:  { dx: -1, dy:  0 },
};

const MONSTER_TYPES = {
  rat: { name: 'Rat', char: 'r', color: '#cc6633', hp: 5, attack: 2, defense: 0 },
  goblin: { name: 'Goblin', char: 'g', color: '#33cc33', hp: 10, attack: 4, defense: 1 },
};

const PLAYER_STATS = { hp: 30, maxHp: 30, attack: 5, defense: 2 };

const MAX_MESSAGES = 5;

export function createGame() {
  const map = createMap();
  const player = { x: map.spawn.x, y: map.spawn.y, ...PLAYER_STATS };
  const monsters = spawnMonsters(map);
  return { map, player, monsters, messages: [], gameOver: false };
}

function spawnMonsters(map) {
  const monsters = [];
  const startRoom = map.rooms[0];

  for (let i = 1; i < map.rooms.length; i++) {
    const room = map.rooms[i];
    const count = 1 + Math.floor(Math.random() * 3); // 1-3
    for (let j = 0; j < count; j++) {
      const type = Math.random() < 0.5 ? 'rat' : 'goblin';
      const template = MONSTER_TYPES[type];
      // Find a free floor tile in the room
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

export function dispatch(game, action) {
  if (game.gameOver && action.type !== 'restart') return game;

  switch (action.type) {
    case 'move':
      return handleMove(game, action.dir);
    case 'wait':
      return runMonsterTurns(game);
    case 'restart':
      return createGame();
    default:
      return game;
  }
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

  if (!isWalkable(game.map, nx, ny)) return game;

  const moved = {
    ...game,
    player: { ...game.player, x: nx, y: ny },
  };
  return runMonsterTurns(moved);
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
 * Each cell is { tile, isPlayer, monster }.
 */
export function getVisibleTiles(game, viewW, viewH) {
  const { map, player, monsters } = game;

  let camX = player.x - Math.floor(viewW / 2);
  let camY = player.y - Math.floor(viewH / 2);
  camX = Math.max(0, Math.min(camX, map.width - viewW));
  camY = Math.max(0, Math.min(camY, map.height - viewH));

  // Build monster lookup
  const monsterAt = {};
  for (const m of monsters) {
    monsterAt[`${m.x},${m.y}`] = m;
  }

  const result = [];
  for (let vy = 0; vy < viewH; vy++) {
    const row = [];
    for (let vx = 0; vx < viewW; vx++) {
      const mx = camX + vx;
      const my = camY + vy;
      const inBounds = mx >= 0 && mx < map.width && my >= 0 && my < map.height;
      const tile = inBounds ? map.tiles[my][mx] : ' ';
      const monster = monsterAt[`${mx},${my}`] || null;
      row.push({
        tile,
        isPlayer: mx === player.x && my === player.y,
        monster,
      });
    }
    result.push(row);
  }
  return result;
}
