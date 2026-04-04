---
id: monsters-and-combat
status: not-started
area: full-stack
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
reports what happens. All game logic is shared; both frontends render it.

## Acceptance Criteria

### Shared game logic

1. 1-3 monsters spawn in each generated room (except the player's starting room)
2. At least 2 monster types with different stats (e.g., Rat: low HP/low attack, Goblin: medium HP/medium attack)
3. The game is turn-based: after the player acts (moves or waits), every monster takes one action
4. Monster AI: if the player is within 6 tiles (Chebyshev distance), move one step toward the player; otherwise idle
5. Moving into a monster's tile triggers a player attack; the monster loses HP equal to player's attack minus monster's defense
6. Adjacent monsters attack the player on their turn; the player loses HP equal to monster's attack minus player's defense
7. When a monster's HP reaches 0 it is removed from the map
8. When the player's HP reaches 0, the game enters a "game over" state
9. A message log (last 5 messages) records combat events (e.g., "You hit the Rat for 3 damage")
10. A "wait" action (period key `.` or numpad 5) lets the player skip a turn while enemies still move

### Browser frontend

11. Monsters are rendered as colored letter characters on the canvas (e.g., `r` for rat, `g` for goblin)
12. Player HP is shown in the HUD (e.g., `HP: 30/30`)
13. The message log is displayed below the HUD
14. A "Game Over" overlay appears on death with a "Restart" button

### CLI frontend

15. Monsters are rendered as colored characters in the terminal
16. Player HP and message log are shown below the map
17. On death, a "Game Over" message is shown with an option to restart (`r`) or quit (`q`)

## Out of Scope

- Experience points or leveling up
- Ranged attacks or spells
- Items, food, or equipment
- Field of view or fog of war

## Design Notes

- Player base stats suggestion: 30 HP, 5 attack, 2 defense
- Rat suggestion: 5 HP, 2 attack, 0 defense
- Goblin suggestion: 10 HP, 4 attack, 1 defense
- Monster pathfinding: simple greedy "move toward player" is fine; no need for A*
- Monsters should not walk through walls or each other

## Agent Notes

- Combat logic, monster AI, and message log belong in `src/` (shared).
- Renderers only need updates for: drawing monsters, displaying HP/messages, game-over screen.
- Monsters should be stored as an array in game state, each with `{x, y, type, hp, ...}`.
- Make sure turn order is: player acts first, then all living monsters act.
- Test combat in both browser and CLI.
