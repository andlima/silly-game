---
id: hud-compact-messages
status: not-started
area: web
priority: 70
depends_on: []
description: Compact HUD with emoji equipment, scrollable message log, and smaller standardized buttons
---

# HUD Compact & Scrollable Messages

## Goal

Reclaim screen real estate by compacting the HUD — use emoji glyphs for equipment
instead of verbose labels, shrink and standardize button sizes, and make the message
log scrollable with more history.

## Changes

All changes are in `index.html` (CSS + JS). One constant change in `src/game.js`.

### 1. Emoji Equipment Display

Replace the verbose equipment text with compact emoji representations.

**Current** (JS ~line 732-737):
```
Weapon: Sword +4atk | Helmet: Helmet +1def | Shield: Shield +2def
```

**New format:**
```
🗡️+4 🪖+1 🛡️+2
```

- Import `GLYPHS_ENHANCED` from `src/glyphs.js` (or access via existing imports)
  to map equipment slot → emoji. The mapping:
  - `weapon` slot → if equipped item name is `'Dagger'` use `GLYPHS_ENHANCED.dagger.char`,
    if `'Sword'` use `GLYPHS_ENHANCED.sword.char`
  - `helmet` slot → `GLYPHS_ENHANCED.helmet.char`
  - `shield` slot → `GLYPHS_ENHANCED.shield.char`
- When a slot is empty, show the slot emoji dimmed (CSS opacity 0.3) with no bonus text
- Stat label (`atk`/`def`) can be dropped — the emoji makes it obvious
- Format each slot as: `{emoji}+{bonus}` with a small gap between slots

**JS rendering** (replace lines ~732-737):
```javascript
const eq = game.equipment;
const equipParts = [];
// weapon
if (eq.weapon) {
  const wEmoji = eq.weapon.name === 'Dagger' ? '🗡️' : '⚔️';
  equipParts.push(`${wEmoji}+${eq.weapon.bonus}`);
} else {
  equipParts.push('<span style="opacity:0.3">⚔️</span>');
}
// helmet
if (eq.helmet) {
  equipParts.push(`🪖+${eq.helmet.bonus}`);
} else {
  equipParts.push('<span style="opacity:0.3">🪖</span>');
}
// shield
if (eq.shield) {
  equipParts.push(`🛡️+${eq.shield.bonus}`);
} else {
  equipParts.push('<span style="opacity:0.3">🛡️</span>');
}
document.getElementById('hud-equipment').innerHTML = equipParts.join(' ');
```

### 2. Scrollable Message Log

**`src/game.js`**: Increase `MAX_MESSAGES` from `5` to `20`.

**CSS** — give `#messages` a fixed max-height and scroll:
```css
#messages {
  margin-top: 4px;
  font-size: 14px;
  text-align: left;
  width: 100%;
  max-width: 800px;
  padding: 0 20px;
  line-height: 1.4;
  max-height: 6.5em;      /* ~4-5 visible lines */
  overflow-y: auto;
}
```

**JS** — auto-scroll to bottom after rendering messages:
```javascript
messagesEl.innerHTML = msgHtml;
messagesEl.scrollTop = messagesEl.scrollHeight;
```

Optional: style the scrollbar to match the dark theme (thin, dark track, subtle thumb)
using `::-webkit-scrollbar` styles. Keep it unobtrusive.

### 3. Smaller, Standardized Buttons

**Mobile action bar buttons** (`#action-bar button`):
- Reduce `min-height` from `44px` to `36px`
- Reduce `padding` from `8px 14px` to `6px 10px`
- Reduce `font-size` from `16px` to `14px`
- Keep `min-width: 48px` (down from 60px) — still comfortably tappable

**Desktop HUD buttons** (mute-btn, help-btn inline styles → move to CSS class):
- Move inline styles on `#mute-btn` and `#help-btn` to a shared `.hud-btn` CSS class
- Use `font-size: 14px`, `padding: 1px 6px`

**Action bar padding**: reduce from `10px 12px` to `8px 10px`.

### 4. HUD Gap & Font Tightening

- Reduce `#hud` gap from `16px` to `10px`
- On mobile (`@media max-width: 600px`): gap `6px`

## Verify

- Desktop: HUD shows emoji equipment (e.g. `⚔️+4 🪖+1 🛡️+2`), compact buttons
- Empty equipment slots show dimmed emojis
- Message area scrolls when more than ~4 messages; newest message is always visible
- Mobile: action bar buttons are smaller but still tappable
- No horizontal overflow or layout breakage on narrow viewports (≥320px)
- Game still plays correctly — no functional regressions
