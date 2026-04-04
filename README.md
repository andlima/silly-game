# Silly Roguelike

A zero-dependency browser + CLI roguelike dungeon crawler built with vanilla JavaScript.

## How to Play

**Browser:** open `index.html` in a modern browser (no server needed).

**CLI:** `node cli.js`

**Controls:**

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move |
| `p` | Use food |
| `>` | Descend stairs |
| `t` | Toggle ASCII/emoji (CLI) |

## Game Features

- **Procedural dungeon generation** — five increasingly dangerous levels to descend through
- **Turn-based combat** — four monster types: Rat, Skeleton, Bear, and Dragon
- **Items & equipment** — food, weapons (Dagger, Sword), and armor (Helmet, Shield)
- **Field of view** — recursive shadowcasting with a torch radius for atmospheric exploration
- **Procedural audio** — all sounds synthesized at runtime via the Web Audio API (no audio files)
- **Game-over stats** — tracks monsters killed, damage dealt/taken, food eaten, and steps taken

## Tech Highlights

- **Zero external dependencies** — no npm packages, no build step
- **Shared game engine** — core logic lives in `src/`, consumed by two thin renderers (Canvas in `index.html`, ANSI terminal in `cli.js`)
- **ES modules throughout** — standard `import`/`export` with no bundler
- **Procedural audio** — every sound effect is synthesized at runtime with the Web Audio API

## Project Structure

| Path | Description |
|------|-------------|
| `src/game.js` | Core game engine — state, turns, combat, inventory |
| `src/dungeon.js` | Procedural dungeon generator |
| `src/fov.js` | Recursive shadowcasting field-of-view |
| `src/audio.js` | Web Audio API sound synthesis |
| `src/glyphs.js` | Character/emoji mappings for rendering |
| `src/map.js` | Map representation and tile helpers |
| `index.html` | Browser frontend (Canvas renderer) |
| `cli.js` | Terminal frontend (ANSI renderer) |
| `specs/` | Feature specs for the spec-driven workflow |

## Development

Run tests:

```bash
npx jest
```

This project uses a spec-driven development workflow. See `AGENTS.md` for details.
