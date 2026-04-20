import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMessageToEvent,
  buildEvents,
  formatEquipment,
  getPlayerAttack,
  getPlayerDefense,
} from './bot.js';

// ─── parseMessageToEvent ────────────────────────────────────────────────────

describe('parseMessageToEvent', () => {
  it('parses player attack', () => {
    assert.deepEqual(
      parseMessageToEvent('You hit the rat for 4 damage.'),
      { type: 'attack', attacker: 'player', target: 'rat', damage: 4 },
    );
  });

  it('parses kill', () => {
    assert.deepEqual(
      parseMessageToEvent('The Rat is defeated!'),
      { type: 'kill', target: 'rat' },
    );
  });

  it('parses monster hit', () => {
    assert.deepEqual(
      parseMessageToEvent('The skeleton hits you for 3 damage.'),
      { type: 'hurt', attacker: 'skeleton', damage: 3 },
    );
  });

  it('parses food pickup', () => {
    assert.deepEqual(
      parseMessageToEvent('You pick up some food.'),
      { type: 'pickup', item: 'food', detail: 'food' },
    );
  });

  it('parses equip', () => {
    assert.deepEqual(
      parseMessageToEvent('You equip a Sword (+4 attack).'),
      { type: 'equip', item: 'Sword', bonus: 4, stat: 'attack' },
    );
  });

  it('parses skip equipment', () => {
    assert.deepEqual(
      parseMessageToEvent('You already have better equipment.'),
      { type: 'skip_equipment', item: 'equipment' },
    );
  });

  it('parses use food', () => {
    assert.deepEqual(
      parseMessageToEvent('You eat food and restore 10 HP.'),
      { type: 'use_food', healed: 10 },
    );
  });

  it('parses descend', () => {
    assert.deepEqual(
      parseMessageToEvent('You descend to level 3.'),
      { type: 'descend', level: 3 },
    );
  });

  it('parses win', () => {
    assert.deepEqual(
      parseMessageToEvent('You escape the dungeon!'),
      { type: 'win' },
    );
  });

  it('parses no stairs', () => {
    assert.deepEqual(
      parseMessageToEvent('There are no stairs here.'),
      { type: 'no_stairs' },
    );
  });

  it('parses no food', () => {
    assert.deepEqual(
      parseMessageToEvent('You have no food.'),
      { type: 'no_food' },
    );
  });

  it('parses full hp', () => {
    assert.deepEqual(
      parseMessageToEvent('You are already at full health.'),
      { type: 'full_hp' },
    );
  });

  it('returns null for unrecognised message', () => {
    assert.equal(parseMessageToEvent('Something unknown happened.'), null);
  });
});

// ─── buildEvents ────────────────────────────────────────────────────────────

describe('buildEvents', () => {
  it('produces synthetic wait event when no messages', () => {
    const game = { messages: [], gameOver: false, stats: {} };
    const events = buildEvents(game, { type: 'wait' }, 0);
    assert.deepEqual(events, [{ type: 'wait' }]);
  });

  it('produces synthetic move event when _moved', () => {
    const game = { messages: [], gameOver: false, stats: {} };
    const events = buildEvents(game, { type: 'move', dir: 'n', _moved: true }, 0);
    assert.deepEqual(events, [{ type: 'move', dir: 'n' }]);
  });

  it('does not produce move event when not moved', () => {
    const game = { messages: [], gameOver: false, stats: {} };
    const events = buildEvents(game, { type: 'move', dir: 'n', _moved: false }, 0);
    assert.deepEqual(events, []);
  });

  it('parses new messages into events', () => {
    const game = {
      messages: ['old msg', 'You hit the rat for 4 damage.', 'The Rat is defeated!'],
      gameOver: false,
      stats: {},
    };
    const events = buildEvents(game, null, 1);
    assert.deepEqual(events, [
      { type: 'attack', attacker: 'player', target: 'rat', damage: 4 },
      { type: 'kill', target: 'rat' },
    ]);
  });

  it('appends death event when gameOver with cause', () => {
    const game = {
      messages: [],
      gameOver: true,
      stats: { causeOfDeath: 'Bear' },
    };
    const events = buildEvents(game, null, 0);
    assert.deepEqual(events, [{ type: 'death', cause: 'bear' }]);
  });

  it('skips unrecognised messages gracefully', () => {
    const game = {
      messages: ['Unknown message'],
      gameOver: false,
      stats: {},
    };
    const events = buildEvents(game, null, 0);
    assert.deepEqual(events, []);
  });
});

// ─── formatEquipment ────────────────────────────────────────────────────────

describe('formatEquipment', () => {
  it('formats equipped items', () => {
    const eq = {
      weapon: { name: 'Sword', bonus: 4, stat: 'attack' },
      helmet: { name: 'Helmet', bonus: 2, stat: 'defense' },
      shield: null,
    };
    assert.deepEqual(formatEquipment(eq), {
      weapon: 'Sword +4atk',
      helmet: 'Helmet +2def',
      shield: null,
    });
  });

  it('returns all null when nothing equipped', () => {
    assert.deepEqual(formatEquipment({ weapon: null, helmet: null, shield: null }), {
      weapon: null,
      helmet: null,
      shield: null,
    });
  });
});

// ─── getPlayerAttack / getPlayerDefense ─────────────────────────────────────

describe('getPlayerAttack', () => {
  it('sums base attack and weapon bonus', () => {
    const game = {
      player: { attack: 5 },
      equipment: {
        weapon: { stat: 'attack', bonus: 3 },
        helmet: null,
        shield: null,
      },
    };
    assert.equal(getPlayerAttack(game), 8);
  });

  it('returns base attack with no equipment', () => {
    const game = {
      player: { attack: 5 },
      equipment: { weapon: null, helmet: null, shield: null },
    };
    assert.equal(getPlayerAttack(game), 5);
  });
});

describe('getPlayerDefense', () => {
  it('sums base defense and defense bonuses', () => {
    const game = {
      player: { defense: 2 },
      equipment: {
        weapon: { stat: 'attack', bonus: 3 },
        helmet: { stat: 'defense', bonus: 1 },
        shield: { stat: 'defense', bonus: 2 },
      },
    };
    assert.equal(getPlayerDefense(game), 5);
  });
});
