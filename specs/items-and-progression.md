---
id: items-and-progression
status: not-started
area: full-stack
priority: 40
depends_on:
  - monsters-and-combat
description: Pickups, inventory, stairs to descend through increasingly difficult dungeon levels
---

# Items and Progression

## Goal

Add collectible items, a simple inventory, and stairs that let the player descend
through multiple dungeon levels with increasing difficulty. This turns the game
into a proper roguelike loop: explore, fight, loot, descend, repeat. All game
logic is shared; both frontends render it.

## Acceptance Criteria

### Shared game logic

1. Each dungeon level has a staircase tile (`>`) placed in a room different from the player's spawn room
2. Walking onto the staircase and pressing `.` (or `>`) generates a new dungeon level and places the player in the first room
3. The game tracks the current dungeon level number
4. Monster difficulty scales with level: more monsters per room and/or tougher monster types on deeper levels
5. At least one new monster type appears on deeper levels (e.g., Orc on level 3+: 20 HP, 6 attack, 3 defense)
6. Food spawns on the floor in some rooms (1-2 per level); represented as `%`
7. Walking over food picks it up and adds it to inventory (auto-pickup)
8. The player can use food by pressing `p` in both frontends; it restores 10 HP (capped at max)
9. Reaching dungeon level 5 stairs triggers a win state
10. Inventory persists across levels; HP does not regenerate between levels

### Browser frontend

11. Staircase rendered as `>` in a distinct color on the canvas
12. Food rendered as `%` in a distinct color
13. HUD shows dungeon level and inventory (e.g., "Level: 1  Food: 2")
14. A "You Win!" overlay appears on victory with a "Restart" button

### CLI frontend

15. Staircase and food rendered as colored characters in the terminal
16. HUD line shows dungeon level and inventory
17. A "You Win!" message appears on victory with option to restart (`r`) or quit (`q`)

## Out of Scope

- Equipment (weapons, armor) or stat upgrades
- Shops or NPC interactions
- Save/load game state
- Procedural item generation beyond food

## Design Notes

- Scaling suggestion: `monstersPerRoom = baseCount + floor(level / 2)` and introduce
  Orc at level 3, maybe a Troll at level 4 (30 HP, 8 atk, 4 def)
- The staircase should be placed in the last generated room (or a random room
  that isn't the spawn room)
- Keep inventory simple — just a count of food for now
- Use `p` key for food in both frontends to avoid conflict with CLI quit (`q`)

## Agent Notes

- The main structural change is wrapping dungeon generation in a "new level" function
  that preserves player state (HP, inventory) while resetting the map and monsters.
- Item and staircase logic belongs in `src/` (shared). Renderers just need to draw
  the new tile types and updated HUD fields.
- Be careful not to break the existing turn/combat loop when adding item pickup logic.
- Test level transitions and win condition in both browser and CLI.
