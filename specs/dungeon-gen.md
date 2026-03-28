---
id: dungeon-gen
status: not-started
area: frontend
priority: 20
depends_on:
  - core-engine
description: Procedural dungeon generation with rooms and corridors
---

# Dungeon Generation

## Goal

Replace the hardcoded starter room with a procedurally generated dungeon. Each time
the player starts (or enters a new level in the future), a fresh dungeon is carved
out of a solid wall grid using a rooms-and-corridors algorithm.

## Acceptance Criteria

1. The map starts as all walls and rooms are carved out procedurally
2. The generator places 5-10 rectangular rooms of varying sizes (min 4x4, max 10x10 inner floor area)
3. Rooms do not overlap each other (1-tile wall buffer between rooms minimum)
4. Corridors connect rooms so every room is reachable from every other room
5. Corridors are 1 tile wide and follow an L-shaped (horizontal-then-vertical or vice versa) path between room centers
6. The player spawns in the center of the first room generated
7. The dungeon fits within an 80x50 tile grid
8. A new dungeon is generated each time the page is refreshed
9. Existing player movement, collision, and viewport logic continue to work correctly

## Out of Scope

- Stairs or level transitions
- Placing enemies or items in rooms
- Door tiles or special terrain types
- Fog of war or line-of-sight

## Design Notes

- A simple BSP or "place random rooms then connect" algorithm is sufficient
- Use a seeded PRNG if convenient, but not required
- Room connectivity can use a minimum spanning tree or simply connect each room
  to the next in generation order

## Agent Notes

- Read the existing `index.html` first to understand the game state structure and
  rendering approach before modifying it.
- The dungeon generator should be a function that returns a 2D tile array plus a
  player spawn point, keeping it decoupled from rendering.
