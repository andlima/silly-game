// Shared glyph table for both TUI and web renderers.
// Each entry: { char, wide } where wide means the glyph occupies two terminal columns.

export const GLYPHS = {
  player:  { char: '@', wide: false },
  wall:    { char: '\u2588', wide: false },  // █ full block
  floor:   { char: '\u00b7', wide: false },  // · middle dot
  stair:   { char: '\u25bc', wide: false },  // ▼ downward triangle
  rat:     { char: '\ud83d\udc00', wide: true },   // 🐀
  goblin:  { char: '\ud83d\udc7a', wide: true },   // 👺
  orc:     { char: '\ud83d\udc79', wide: true },   // 👹
  troll:   { char: '\ud83e\udded', wide: true },    // 🧌
  potion:  { char: '\ud83e\uddea', wide: true },    // 🧪
};
