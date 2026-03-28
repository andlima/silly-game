---
id: monsters-and-combat
status: not-started
area: frontend
priority: 30
depends_on:
  - dungeon-gen
description: Turn-based enemies with basic AI, HP, melee combat, and a message log
---

# Monsters and Combat

## Goal

Add enemies to the dungeon and a turn-based combat system. Each time the player
moves, enemies also take a turn. Walking into an enemy attacks it; enemies that
are adjacent to the player will attack on their turn. A scrolling message log
reports what happens.

## Acceptance Criteria

1. 1-3 monsters spawn in each generated room (except the player's starting room)
2. At least 2 monster types with different stats (e.g., Rat: low HP/low attack, Goblin: medium HP/medium attack)
3. Monsters are rendered as colored letter characters (e.g., `r` for rat, `g` for goblin)
4. The game is turn-based: after the player acts (moves or waits), every monster takes one action
5. Monster AI: if the player is within 6 tiles (Chebyshev distance), move one step toward the player; otherwise idle
6. Moving into a monster's tile triggers a player attack; the monster loses HP equal to player's attack minus monster's defense
7. Adjacent monsters attack the player on their turn; the player loses HP equal to monster's attack minus player's defense
8. When a monster's HP reaches 0 it is removed from the map
9. The player has visible HP (e.g., `HP: 30/30`) displayed in the HUD
10. When the player's HP reaches 0, show a "Game Over" overlay with a "Restart" button
11. A message log (last 5 messages) is displayed below the HUD, showing combat events (e.g., "You hit the Rat for 3 damage")
12. A "wait" action (period key `.` or numpad 5) lets the player skip a turn while enemies still move

## Out of Scope

- Experience points or leveling up
- Ranged attacks or spells
- Items, potions, or equipment
- Field of view or fog of war

## Design Notes

- Player base stats suggestion: 30 HP, 5 attack, 2 defense
- Rat suggestion: 5 HP, 2 attack, 0 defense
- Goblin suggestion: 10 HP, 4 attack, 1 defense
- Monster pathfinding: simple greedy "move toward player" is fine; no need for A*
- Monsters should not walk through walls or each other

## Agent Notes

- Read the existing code carefully — the game state object and render loop must be
  extended, not rewritten.
- Monsters should be stored as an array in the game state, each with `{x, y, type, hp, ...}`.
- Make sure to update the turn order: player acts first, then all living monsters act.
