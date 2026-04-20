import { createGame, dispatch, EQUIPMENT_TYPES } from './game.js';
import { isWalkable } from './map.js';

const MAX_TURNS = 2000;

/**
 * BFS on the game map. Returns the direction of the first step toward the
 * nearest tile where goalFn(x, y) is true, or null if unreachable.
 * walkableFn(x, y) determines which tiles can be traversed.
 */
function bfs(game, startX, startY, goalFn, walkableFn) {
  const dirs = [
    { dir: 'n', dx: 0, dy: -1 },
    { dir: 's', dx: 0, dy: 1 },
    { dir: 'e', dx: 1, dy: 0 },
    { dir: 'w', dx: -1, dy: 0 },
  ];
  const visited = new Set();
  visited.add(`${startX},${startY}`);
  const queue = [];
  for (const { dir, dx, dy } of dirs) {
    const nx = startX + dx;
    const ny = startY + dy;
    const key = `${nx},${ny}`;
    if (visited.has(key)) continue;
    if (goalFn(nx, ny)) return dir;
    if (!walkableFn(nx, ny)) continue;
    visited.add(key);
    queue.push({ x: nx, y: ny, firstDir: dir });
  }
  let head = 0;
  while (head < queue.length) {
    const { x, y, firstDir } = queue[head++];
    for (const { dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (goalFn(nx, ny)) return firstDir;
      if (!walkableFn(nx, ny)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny, firstDir });
    }
  }
  return null;
}

/**
 * Find a specific explore target: nearest useful item (by Manhattan distance),
 * or nearest unrevealed walkable tile in rooms. Returns {x,y} or null.
 */
function findExploreTarget(game) {
  const { map, revealed, items, equipment, inventory, player } = game;
  const px = player.x, py = player.y;

  // Priority 1: nearest useful item by Manhattan distance
  if (items && items.length > 0) {
    let best = null;
    let bestDist = Infinity;
    let bestIdol = null;
    let bestIdolDist = Infinity;

    for (const it of items) {
      if (it.type === 'food' || it.type === 'gold') {
        const d = Math.abs(it.x - px) + Math.abs(it.y - py);
        if (d < bestDist) { bestDist = d; best = it; }
        continue;
      }
      if (it.type === 'idol') {
        if (inventory.gold >= player.maxHp) {
          const d = Math.abs(it.x - px) + Math.abs(it.y - py);
          if (d < bestIdolDist) { bestIdolDist = d; bestIdol = it; }
        }
        continue;
      }
      const eqDef = EQUIPMENT_TYPES[it.type];
      if (eqDef) {
        const current = equipment[eqDef.slot];
        if (current && current.bonus >= eqDef.bonus) continue;
      }
      const d = Math.abs(it.x - px) + Math.abs(it.y - py);
      if (d < bestDist) { bestDist = d; best = it; }
    }

    // Idols: at full HP, only select if closer than (or equal to) best non-idol target
    if (bestIdol) {
      if (player.hp < player.maxHp) {
        // Injured — idol competes on equal footing
        if (bestIdolDist < bestDist) { bestDist = bestIdolDist; best = bestIdol; }
      } else {
        // Full HP — proximity gate: only if idol is at least as close
        if (bestIdolDist <= bestDist) { bestDist = bestIdolDist; best = bestIdol; }
      }
    }

    if (best) return { x: best.x, y: best.y };
  }

  // Priority 2: nearest unrevealed walkable tile
  if (map.rooms) {
    for (const room of map.rooms) {
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          if (ry >= 0 && ry < map.height && rx >= 0 && rx < map.width &&
              !revealed[ry][rx] && isWalkable(map, rx, ry)) {
            return { x: rx, y: ry };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Bot AI: picks the best action given the current game state.
 */
export function chooseAction(game) {
  const { player, monsters, inventory, map, fov, revealed } = game;
  const px = player.x;
  const py = player.y;

  const visibleMonsters = monsters.filter(m => fov && fov.has(`${m.x},${m.y}`));
  const adjacentMonsters = monsters.filter(m =>
    Math.abs(m.x - px) + Math.abs(m.y - py) === 1
  );

  const monsterSet = new Set(monsters.map(m => `${m.x},${m.y}`));
  const walkableNoMonster = (x, y) => isWalkable(map, x, y) && !monsterSet.has(`${x},${y}`);
  const walkableAny = (x, y) => isWalkable(map, x, y);

  function dirTo(tx, ty) {
    if (tx === px && ty === py - 1) return 'n';
    if (tx === px && ty === py + 1) return 's';
    if (tx === px + 1 && ty === py) return 'e';
    if (tx === px - 1 && ty === py) return 'w';
    return null;
  }

  // 1. Eat food if HP ≤ 50% and has food
  if (player.hp <= player.maxHp * 0.5 && inventory.food > 0) {
    return { type: 'useFood' };
  }

  // 1.5. Offer at idol if standing on one with enough gold
  if (game.items) {
    const idolHere = game.items.find(it => it.type === 'idol' && it.x === px && it.y === py);
    if (idolHere && inventory.gold >= player.maxHp) {
      return { type: 'interact' };
    }
  }

  // 2. Descend if on stairs and level feels cleared
  const tile = map.tiles[py][px];
  if (tile === '>') {
    const noVisibleMonsters = visibleMonsters.length === 0;
    const highHp = player.hp > player.maxHp * 0.7;
    if (noVisibleMonsters || highHp) {
      return { type: 'descend' };
    }
  }

  // 3/4. Fight or flee adjacent monster
  if (adjacentMonsters.length > 0) {
    if (player.hp <= player.maxHp * 0.3) {
      const threat = adjacentMonsters[0];
      const fleeDir = bfs(game, px, py,
        (x, y) => {
          const dist = Math.abs(x - threat.x) + Math.abs(y - threat.y);
          return dist > 2 && isWalkable(map, x, y) && !monsterSet.has(`${x},${y}`);
        },
        walkableNoMonster
      );
      if (fleeDir) return { type: 'move', dir: fleeDir };
    }

    const weakest = adjacentMonsters.reduce((a, b) => a.hp <= b.hp ? a : b);
    const dir = dirTo(weakest.x, weakest.y);
    if (dir) return { type: 'move', dir };
  }

  // 5. Approach visible monster — walk toward nearest (through other monsters)
  if (visibleMonsters.length > 0) {
    const sorted = [...visibleMonsters].sort((a, b) =>
      (Math.abs(a.x - px) + Math.abs(a.y - py)) - (Math.abs(b.x - px) + Math.abs(b.y - py))
    );
    const target = sorted[0];
    const dir = bfs(game, px, py,
      (x, y) => x === target.x && y === target.y,
      walkableAny
    );
    if (dir) return { type: 'move', dir };
  }

  // 6. Explore — find a deterministic target (item or unrevealed tile)
  const exploreGoal = findExploreTarget(game);
  if (exploreGoal) {
    const dir = bfs(game, px, py,
      (x, y) => x === exploreGoal.x && y === exploreGoal.y,
      walkableAny
    );
    if (dir) return { type: 'move', dir };
  }

  // 6b. Head toward stairs
  {
    const dir = bfs(game, px, py,
      (x, y) => x >= 0 && x < map.width && y >= 0 && y < map.height && map.tiles[y][x] === '>',
      walkableAny
    );
    if (dir) return { type: 'move', dir };
  }

  // 7. Wait
  return { type: 'wait' };
}

/**
 * Beeline mode: simplified AI that heads straight for stairs.
 * Still eats food, fights adjacent monsters, and descends.
 */
function chooseActionBeeline(game) {
  const { player, monsters, inventory, map, fov } = game;
  const px = player.x;
  const py = player.y;
  const walkableAny = (x, y) => isWalkable(map, x, y);

  // Eat food if HP ≤ 50%
  if (player.hp <= player.maxHp * 0.5 && inventory.food > 0) {
    return { type: 'useFood' };
  }

  // Offer at idol if standing on one with enough gold
  if (game.items) {
    const idolHere = game.items.find(it => it.type === 'idol' && it.x === px && it.y === py);
    if (idolHere && inventory.gold >= player.maxHp) {
      return { type: 'interact' };
    }
  }

  // Descend if on stairs
  if (map.tiles[py][px] === '>') {
    return { type: 'descend' };
  }

  // Fight adjacent monsters
  const adjacentMonsters = monsters.filter(m =>
    Math.abs(m.x - px) + Math.abs(m.y - py) === 1
  );
  if (adjacentMonsters.length > 0) {
    const weakest = adjacentMonsters.reduce((a, b) => a.hp <= b.hp ? a : b);
    function dirTo(tx, ty) {
      if (tx === px && ty === py - 1) return 'n';
      if (tx === px && ty === py + 1) return 's';
      if (tx === px + 1 && ty === py) return 'e';
      if (tx === px - 1 && ty === py) return 'w';
      return null;
    }
    const dir = dirTo(weakest.x, weakest.y);
    if (dir) return { type: 'move', dir };
  }

  // Head directly to stairs
  const dir = bfs(game, px, py,
    (x, y) => x >= 0 && x < map.width && y >= 0 && y < map.height && map.tiles[y][x] === '>',
    walkableAny
  );
  if (dir) return { type: 'move', dir };

  return { type: 'wait' };
}

/**
 * Run a single game with the bot AI. Returns per-run result object.
 */
export function runGame(seed) {
  let game = createGame();
  let turns = 0;
  let foodFound = 0;
  let itemsFound = 0;

  let levelTurns = 0;
  let beelineToStairs = 0;
  const visitCounts = new Map();

  while (!game.gameOver && !game.won && turns < MAX_TURNS) {
    let action;
    levelTurns++;

    // Track visits for oscillation detection
    const pos = `${game.player.x},${game.player.y}`;
    const visits = (visitCounts.get(pos) || 0) + 1;
    visitCounts.set(pos, visits);

    // Check if there are still useful items on the map
    const usefulItems = game.items ? game.items.filter(it => {
      if (it.type === 'food') return true;
      if (it.type === 'gold') return true;
      if (it.type === 'idol') return game.inventory.gold >= game.player.maxHp;
      const eqDef = EQUIPMENT_TYPES[it.type];
      if (eqDef) {
        const current = game.equipment[eqDef.slot];
        return !current || current.bonus < eqDef.bonus;
      }
      return false;
    }) : [];

    // Beeline when: stuck (high revisit), too long on level, or no useful items left
    if (beelineToStairs <= 0) {
      if (usefulItems.length === 0 || visits > 8 || levelTurns > 250) {
        beelineToStairs = 30;
      }
    }

    if (beelineToStairs > 0) {
      beelineToStairs--;
      action = chooseActionBeeline(game);
    } else {
      action = chooseAction(game);
    }

    const prevFood = game.inventory.food;
    const prevItems = game.items ? game.items.length : 0;
    const prevLevel = game.level;
    game = dispatch(game, action);
    turns++;

    // Reset state on level change
    if (game.level !== prevLevel) {
      visitCounts.clear();
      beelineToStairs = 0;
      levelTurns = 0;
    }

    // Count pickups by tracking inventory/item changes
    const curItems = game.items ? game.items.length : 0;
    if (game.inventory.food > prevFood) {
      foodFound += game.inventory.food - prevFood;
      itemsFound += game.inventory.food - prevFood;
    }
    // Equipment pickups reduce items array (food pickup also reduces it)
    const foodPickedUp = game.inventory.food - prevFood;
    const totalRemoved = prevItems - curItems;
    const equipPickedUp = Math.max(0, totalRemoved - Math.max(0, foodPickedUp));
    itemsFound += equipPickedUp;
  }

  // Handle timeout
  if (!game.gameOver && !game.won && turns >= MAX_TURNS) {
    game = {
      ...game,
      gameOver: true,
      stats: { ...game.stats, causeOfDeath: 'timeout' },
    };
  }

  return {
    won: game.won,
    level: game.level,
    turns,
    stats: game.stats,
    equipment: {
      weapon: game.equipment.weapon ? game.equipment.weapon.name : null,
      helmet: game.equipment.helmet ? game.equipment.helmet.name : null,
      shield: game.equipment.shield ? game.equipment.shield.name : null,
    },
    foodFound,
    itemsFound,
  };
}
