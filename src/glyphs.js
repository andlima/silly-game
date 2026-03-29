// Shared glyph table for both TUI and web renderers.
// Each entry: { char, wide } where wide means the glyph occupies two terminal columns.

// Enhanced (emoji/unicode) glyph set — default
export const GLYPHS_ENHANCED = {
  player:   { char: '@', wide: false },
  wall:     { char: '\u2588\u2588', wide: true },   // ██ two full blocks, seamless
  floor:    { char: ' ', wide: false },              // blank space
  stair:    { char: '\u25bc', wide: false },         // ▼ downward triangle
  rat:      { char: '\ud83d\udc00', wide: true },    // 🐀
  skeleton: { char: '\ud83d\udc80', wide: true },    // 💀
  bear:     { char: '\ud83d\udc3b', wide: true },    // 🐻
  dragon:   { char: '\ud83d\udc09', wide: true },    // 🐉
  potion:   { char: '\ud83c\udf4e', wide: true },    // 🍎
};

// Classic ASCII glyph set — 1-column cells
export const GLYPHS_ASCII = {
  player:   { char: '@', wide: false },
  wall:     { char: '#', wide: false },
  floor:    { char: '.', wide: false },
  stair:    { char: '>', wide: false },
  rat:      { char: 'r', wide: false },
  skeleton: { char: 's', wide: false },
  bear:     { char: 'b', wide: false },
  dragon:   { char: 'd', wide: false },
  potion:   { char: '!', wide: false },
};

// Default to enhanced mode
export let GLYPHS = { ...GLYPHS_ENHANCED };

let currentMode = 'enhanced';

export function getRenderMode() {
  return currentMode;
}

export function toggleRenderMode() {
  currentMode = currentMode === 'enhanced' ? 'ascii' : 'enhanced';
  const source = currentMode === 'enhanced' ? GLYPHS_ENHANCED : GLYPHS_ASCII;
  Object.assign(GLYPHS, source);
  return currentMode;
}
