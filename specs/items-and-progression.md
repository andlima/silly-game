---
id: items-and-progression
status: not-started
area: frontend
priority: 40
depends_on:
  - monsters-and-combat
description: Pickups, inventory, stairs to descend through increasingly difficult dungeon levels
---

# Items and Progression

## Goal

Add collectible items, a simple inventory, and stairs that let the player descend
through multiple dungeon levels with increasing difficulty. This turns the game
into a proper roguelike loop: explore, fight, loot, descend, repeat.

## Acceptance Criteria

1. Each dungeon level has a staircase tile (`>`) placed in a room different from the player's spawn room
2. Walking onto the staircase and pressing `.` (or `>`) generates a new dungeon level and places the player in the first room
3. The current dungeon level number is displayed in the HUD (e.g., "Level: 1")
4. Monster difficulty scales with level: more monsters per room and/or tougher monster types on deeper levels
5. At least one new monster type appears on deeper levels (e.g., Orc on level 3+: 20 HP, 6 attack, 3 defense)
6. Health potions spawn on the floor in some rooms (1-2 per level); rendered as `!` in a distinct color
7. Walking over a potion picks it up and adds it to inventory (auto-pickup)
8. The player can use a health potion by pressing a key (e.g., `q`); it restores 10 HP (capped at max)
9. Inventory is shown in the HUD (e.g., "Potions: 2")
10. Reaching dungeon level 5 stairs triggers a "You Win!" overlay with a restart option
11. Inventory persists across levels; HP does not regenerate between levels

## Out of Scope

- Equipment (weapons, armor) or stat upgrades
- Shops or NPC interactions
- Save/load game state
- Procedural item generation beyond health potions

## Design Notes

- Scaling suggestion: `monstersPerRoom = baseCount + floor(level / 2)` and introduce
  Orc at level 3, maybe a Troll at level 4 (30 HP, 8 atk, 4 def)
- The staircase should be placed in the last generated room (or a random room
  that isn't the spawn room)
- Keep inventory simple — just a count of potions for now

## Agent Notes

- The main structural change is wrapping dungeon generation in a "new level" function
  that preserves player state (HP, inventory) while resetting the map and monsters.
- Be careful not to break the existing turn/combat loop when adding item pickup logic.
- Test that the win condition actually triggers on level 5.
