// Shared glyph table for both TUI and web renderers.
// Each entry: { char, wide } where wide means the glyph occupies two terminal columns.

// Enhanced (emoji/unicode) glyph set — default
export const GLYPHS_ENHANCED = {
  player:   { char: '🧙', wide: true },
  wall:     { char: '\u2588\u2588', wide: true },   // ██ two full blocks, seamless
  floor:    { char: ' ', wide: false },              // blank space
  stair:    { char: '\u25bc', wide: false },         // ▼ downward triangle
  rat:      { char: '\ud83d\udc00', wide: true },    // 🐀
  skeleton: { char: '\ud83d\udc80', wide: true },    // 💀
  bear:     { char: '\ud83d\udc3b', wide: true },    // 🐻
  troll:    { char: '\ud83e\uddcc', wide: true },
  dragon:   { char: '\ud83d\udc09', wide: true },    // 🐉
  food:     { char: '\ud83c\udf4e', wide: true },    // 🍎
  dagger:   { char: '\ud83d\udd2a', wide: true },  // 🔪
  throwing_dagger: { char: '\ud83d\udde1\ufe0f', wide: true },  // 🗡️
  sword:    { char: '\u2694\ufe0f', wide: true },         // ⚔️
  helmet:   { char: '\ud83e\ude96', wide: true },         // 🪖
  shield:   { char: '\ud83d\udee1\ufe0f', wide: true },   // 🛡️
  gold:     { char: '\ud83e\ude99', wide: true },         // 🪙
  idol:     { char: '🗿', wide: true },
  merchant: { char: '\ud83e\uddd4', wide: true },    // 🧔
  princess: { char: '\ud83d\udc78', wide: true },    // 👸
  firebolt:  { char: '🔥', wide: true },
  lightning: { char: '⚡', wide: true },
  frost:     { char: '❄️', wide: true },
  whirlwind: { char: '🌪️', wide: true },
  scroll:    { char: '🔥', wide: true },
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
  troll:    { char: 't', wide: false },
  dragon:   { char: 'd', wide: false },
  food:     { char: '%', wide: false },
  dagger:   { char: '|', wide: false },
  throwing_dagger: { char: '-', wide: false },
  sword:    { char: '/', wide: false },
  helmet:   { char: '^', wide: false },
  shield:   { char: ']', wide: false },
  gold:     { char: '$', wide: false },
  idol:     { char: 'I', wide: false },
  merchant: { char: 'M', wide: false },
  princess: { char: 'P', wide: false },
  firebolt:  { char: '~', wide: false },
  lightning: { char: '*', wide: false },
  frost:     { char: '*', wide: false },
  whirlwind: { char: '*', wide: false },
  scroll:    { char: '~', wide: false },
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
