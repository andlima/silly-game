---
id: create-readme
title: Create a meaningful README for the project
status: pending
created: 2026-04-04
---

# Create README

## Goal

Add a `README.md` to the project root that gives newcomers a clear picture of what Silly Roguelike is, how to run it, and what makes it interesting.

## Sections to include

1. **Title & one-liner** — "Silly Roguelike", a zero-dependency browser + CLI roguelike dungeon crawler built with vanilla JavaScript.

2. **How to play**
   - Browser: open `index.html` in a modern browser (no server needed)
   - CLI: `node cli.js`
   - Controls: arrow keys / WASD to move, `p` for potion, `>` to descend stairs, `t` to toggle ASCII/emoji (CLI)

3. **Game features** — brief descriptions of:
   - Procedural dungeon generation (5 levels)
   - Turn-based combat with 4 monster types (Rat, Skeleton, Bear, Dragon)
   - Items & equipment (potions, weapons, armor)
   - Field of view with recursive shadowcasting
   - Procedural audio synthesis (Web Audio API, no audio files)
   - Game-over stats screen

4. **Tech highlights**
   - Zero external dependencies
   - Shared game engine (`src/`) with two thin renderers (Canvas in `index.html`, ANSI terminal in `cli.js`)
   - ES modules throughout, no build step
   - Procedural audio — all sounds synthesized at runtime

5. **Project structure** — short table or tree of key directories/files:
   - `src/game.js`, `src/dungeon.js`, `src/fov.js`, `src/audio.js`, `src/glyphs.js`
   - `index.html` (web frontend), `cli.js` (terminal frontend)
   - `specs/` (feature specs)

6. **Development**
   - Running tests: `npx jest` (or however tests are run)
   - Mention spec-driven workflow briefly, point to `AGENTS.md` for details

## Out of scope

- Contributing guide
- Detailed API documentation
- CI badges or status indicators
- Screenshots (can be added later)

## Verify

- `README.md` exists at project root
- All six sections are present and accurate
- No broken markdown formatting
- Content matches current state of the codebase (file paths, controls, mechanics)
