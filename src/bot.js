// Bot protocol helpers — extracted for testability.
// These are pure functions (or take explicit state) so they can be unit-tested
// without stdin/stdout wiring.

import { getVisibleTiles, FLOOR, WALL, STAIR } from './game.js';
import { GLYPHS_ASCII } from './glyphs.js';

export function buildTiles(game) {
  const visible = getVisibleTiles(game, 80, 24);
  return visible.map(row => {
    let line = '';
    for (const c of row) {
      if (c.visibility === 'hidden') {
        line += ' ';
      } else if (c.visibility === 'revealed') {
        line += '~';
      } else {
        // visible
        if (c.isPlayer) line += '@';
        else if (c.monster) line += GLYPHS_ASCII[c.monster.type]?.char || c.monster.char;
        else if (c.item) line += GLYPHS_ASCII[c.item.type]?.char || c.item.char;
        else if (c.tile === WALL) line += '#';
        else if (c.tile === STAIR) line += '>';
        else if (c.tile === FLOOR) line += '.';
        else line += ' ';
      }
    }
    return line;
  });
}

export function parseMessageToEvent(msg) {
  let m;
  if ((m = msg.match(/^You hit the (.+) for (\d+) damage\.$/))) {
    return { type: 'attack', attacker: 'player', target: m[1].toLowerCase(), damage: parseInt(m[2]) };
  }
  if ((m = msg.match(/^The (.+) is defeated!$/))) {
    return { type: 'kill', target: m[1].toLowerCase() };
  }
  if ((m = msg.match(/^The (.+) hits you for (\d+) damage\.$/))) {
    return { type: 'hurt', attacker: m[1].toLowerCase(), damage: parseInt(m[2]) };
  }
  if (msg === 'You pick up some food.') {
    return { type: 'pickup', item: 'food', detail: 'food' };
  }
  if ((m = msg.match(/^You equip a (.+) \(\+(\d+) (.+)\)\.$/))) {
    return { type: 'equip', item: m[1], bonus: parseInt(m[2]), stat: m[3] };
  }
  if (msg === 'You already have better equipment.') {
    return { type: 'skip_equipment', item: 'equipment' };
  }
  if ((m = msg.match(/^You eat food and restore (\d+) HP\.$/))) {
    return { type: 'use_food', healed: parseInt(m[1]) };
  }
  if ((m = msg.match(/^You descend to level (\d+)\.$/))) {
    return { type: 'descend', level: parseInt(m[1]) };
  }
  if (msg.includes('escape the dungeon')) {
    return { type: 'win' };
  }
  if (msg === 'There are no stairs here.') {
    return { type: 'no_stairs' };
  }
  if (msg === 'You have no food.') {
    return { type: 'no_food' };
  }
  if (msg === 'You are already at full health.') {
    return { type: 'full_hp' };
  }
  return null;
}

export function buildEvents(game, action, prevMessageCount) {
  const newMessages = game.messages.slice(prevMessageCount);
  const events = [];

  // Synthetic events for actions that don't produce messages
  if (action) {
    if (action.type === 'wait' && newMessages.length === 0) {
      events.push({ type: 'wait' });
    }
    if (action.type === 'move' && action._moved) {
      events.push({ type: 'move', dir: action.dir });
    }
  }

  for (const msg of newMessages) {
    const ev = parseMessageToEvent(msg);
    if (ev) events.push(ev);
  }

  // Detect death
  if (game.gameOver && game.stats?.causeOfDeath) {
    events.push({ type: 'death', cause: game.stats.causeOfDeath.toLowerCase() });
  }

  return events;
}

export function formatEquipment(eq) {
  const fmt = (slot) => {
    if (!slot) return null;
    const statLabel = slot.stat === 'attack' ? 'atk' : 'def';
    return `${slot.name} +${slot.bonus}${statLabel}`;
  };
  return {
    weapon: fmt(eq.weapon),
    helmet: fmt(eq.helmet),
    shield: fmt(eq.shield),
  };
}

export function getPlayerAttack(game) {
  let bonus = 0;
  for (const slot of Object.values(game.equipment)) {
    if (slot && slot.stat === 'attack') bonus += slot.bonus;
  }
  return game.player.attack + bonus;
}

export function getPlayerDefense(game) {
  let bonus = 0;
  for (const slot of Object.values(game.equipment)) {
    if (slot && slot.stat === 'defense') bonus += slot.bonus;
  }
  return game.player.defense + bonus;
}

export function buildState(game, action, prevMessageCount) {
  const events = buildEvents(game, action, prevMessageCount);
  const newMessages = game.messages.slice(prevMessageCount);

  return {
    tiles: buildTiles(game),
    events,
    messages: newMessages,
    hp: game.player.hp,
    maxHp: game.player.maxHp,
    attack: getPlayerAttack(game),
    defense: getPlayerDefense(game),
    equipment: formatEquipment(game.equipment),
    inventory: { food: game.inventory.food },
    level: game.level,
    gameOver: game.gameOver,
    won: game.won,
  };
}
