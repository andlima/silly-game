---
id: enemy-ai-improvements
status: not-started
area: gameplay
priority: 70
depends_on: []
description: Improve enemy movement and awareness — cardinal-only movement, reduced/per-type awareness radius, and line-of-sight gating
---

# Enemy AI Improvements

## Goal

Make enemy interactions more tactical and believable. Currently enemies move
diagonally, detect the player through walls, and all share the same large
awareness radius. These changes make positioning matter and give each monster
type a distinct personality.

## Changes

All changes are in `src/game.js` unless noted otherwise. The FOV infrastructure
in `src/fov.js` is reused read-only — no changes to that module.

### 1. Cardinal-only movement

**Where:** `tryMonsterMove()` (lines 432-449)

Remove the diagonal candidate from the movement list. The current code tries
three candidates in order (diagonal, horizontal, vertical). Change it to only
try horizontal and vertical:

```js
// Before
const candidates = [
  { x: m.x + dx, y: m.y + dy },  // diagonal
  { x: m.x + dx, y: m.y },       // horizontal
  { x: m.x, y: m.y + dy },       // vertical
];

// After — cardinal only
const candidates = [
  { x: m.x + dx, y: m.y },       // horizontal
  { x: m.x, y: m.y + dy },       // vertical
];
```

Pick horizontal-first or vertical-first based on which axis has the larger
gap (i.e. prefer the axis with `max(|dx|, |dy|)`). If equal, either order is
fine. This makes enemies take L-shaped paths instead of diagonal shortcuts.

### 2. Reduced default awareness radius

**Where:** `runMonsterTurns()` (lines 411-419)

Replace the hardcoded `6` with a smaller default. The new base radius is `4`.

Also switch from Chebyshev distance to **Manhattan distance** for the chase
check (since enemies can only move cardinally now, Manhattan is the
appropriate metric):

```js
// Before
const dist = Math.max(Math.abs(m.x - currentPlayer.x), Math.abs(m.y - currentPlayer.y));
...
} else if (dist <= 6) {

// After
const dist = Math.abs(m.x - currentPlayer.x) + Math.abs(m.y - currentPlayer.y);
...
const awareness = m.awareness || 4;
} else if (dist <= awareness) {
```

### 3. Line-of-sight gating

**Where:** `runMonsterTurns()`, same chase block

Before chasing, verify the monster can actually see the player. Reuse the
existing `computeFOV` from `src/fov.js`, computing a limited FOV from the
monster's position with its awareness radius:

```js
import { computeFOV } from './fov.js';  // already imported for TORCH_RADIUS

// Inside the chase check:
const monsterFOV = computeFOV(map, m.x, m.y, awareness);
const canSee = monsterFOV.has(`${currentPlayer.x},${currentPlayer.y}`);
if (dist <= awareness && canSee) {
  // chase
}
```

This means walls block awareness — enemies won't chase through walls they
can't see past. The `computeFOV` call is lightweight at small radii (4-6
tiles).

### 4. Per-type awareness radius

**Where:** `MONSTER_TYPES` constant (lines 12-17)

Add an `awareness` field to each monster type:

```js
const MONSTER_TYPES = {
  rat:      { name: 'Rat',      char: 'r', color: '#cc6633', hp: 5,  attack: 2, defense: 0, awareness: 3 },
  skeleton: { name: 'Skeleton', char: 's', color: '#cccccc', hp: 10, attack: 4, defense: 1, awareness: 4 },
  bear:     { name: 'Bear',     char: 'b', color: '#996633', hp: 20, attack: 6, defense: 3, awareness: 5 },
  dragon:   { name: 'Dragon',   char: 'd', color: '#cc00cc', hp: 30, attack: 8, defense: 4, awareness: 6 },
};
```

Rats are nearly blind (3), skeletons average (4), bears have good senses (5),
dragons dominate (6). The `awareness` field is propagated to monster instances
during `spawnMonsters()` — it already spreads `...MONSTER_TYPES[type]` so no
spawn code changes are needed.

## Test Updates

Update existing tests in `src/game.test.js`:

1. **"monster moves toward player when within range 6"** — adjust distances
   and expectations for the new Manhattan-distance awareness. Place the
   monster within awareness range with clear line of sight.

2. **"monster idles when beyond range 6"** — update to reflect the new
   per-type radius (a rat at distance 4 should idle, a dragon at distance 6
   should still chase).

3. **Add new test: "monster does not chase through walls"** — place a monster
   within awareness range but behind a wall, verify it idles.

4. **Add new test: "monster moves cardinally only"** — place a monster
   diagonally from the player with open floor, verify it moves on one axis
   only per turn.

5. **Add new test: "per-type awareness radius"** — verify a rat idles at
   distance 4 while a dragon chases at distance 6.

## Out of Scope

- Changing player movement (already cardinal-only)
- New monster types or abilities
- Pathfinding algorithms (A*, BFS) — greedy cardinal is sufficient
- Patrol/wander behavior for idle monsters
- Flee behavior
- Rendering or UI changes
- Changes to `src/fov.js`

## Verification

- Play through levels 1-3 and observe:
  - Enemies approach in L-shaped paths, never diagonally
  - Enemies don't react until the player is close
  - Enemies behind walls stay idle until the player rounds the corner
  - Rats are easy to sneak past; dragons detect from further away
- Run `node --test src/game.test.js` — all tests pass
