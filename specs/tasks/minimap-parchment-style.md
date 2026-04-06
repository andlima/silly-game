---
id: minimap-parchment-style
status: not-started
area: web
priority: 50
depends_on: []
description: Restyle the minimap overlay to resemble a parchment/physical map using earth-tone colors and an ornate border
---

# Minimap Parchment Style

## Goal

Replace the current grey-on-black minimap aesthetic with a warm parchment/physical
map look. The minimap should feel like an in-world artifact — aged paper with
ink markings — rather than a debug overlay.

## Changes

All changes are in the minimap rendering block of `index.html` (lines ~707-745).
No structural or behavioral changes — only colors, border, and minor drawing tweaks.

### 1. Parchment Background

Replace the dark transparent background with a warm parchment tone:

- Border fill: dark brown `#5c3a1e` (was `#111`)
- Background fill: parchment tan `#d4b896` (was `rgba(0,0,0,0.6)`)
- Increase border thickness to 2px for a more substantial frame

### 2. Earth-Tone Tile Palette

Replace the grey tile colors with map-appropriate earth tones:

| Element | Current | New |
|---------|---------|-----|
| Wall (out of FOV) | `#666` | `#8b6d4b` (medium brown) |
| Wall (in FOV) | `#999` | `#6b4226` (dark brown, ink-drawn) |
| Floor (out of FOV) | `#333` | `#c4a46c` (faded tan) |
| Floor (in FOV) | `#555` | `#d4b896` (bright parchment — blends with background to show "explored") |
| Stairs | `#5599dd` | `#2a4d6e` (dark ink blue) |
| Player | `#ffcc00` | `#c8962d` (gold/amber) |
| Monsters | `#cc3333` | `#8b1a1a` (crimson ink) |

### 3. Rounded Corners

Use `ctx.roundRect` (with a small radius like 4px) plus clipping to give the
minimap softened corners instead of sharp rectangles. If `roundRect` is not
available in the target browsers, fall back to sharp corners (no polyfill needed).

### 4. FOV Distinction

Walls in FOV should appear darker/bolder (like fresh ink) while out-of-FOV walls
appear lighter/faded. This inverts the current brightness relationship but makes
thematic sense: "you drew these walls when you saw them, and the ink has faded."

Floors in FOV should closely match the parchment background (the area you can
currently see is "clear paper"), while out-of-FOV floors are a slightly different
shade to indicate explored territory.

## Files to Modify

- `index.html` — minimap rendering block only (~lines 707-745)

## Acceptance Criteria

- [ ] Minimap background is a warm parchment/tan color, not dark/transparent
- [ ] Border is dark brown, 2px thick
- [ ] All tile colors use earth tones (browns, tans) instead of greys
- [ ] Stairs, player, and monster markers use ink-appropriate colors
- [ ] FOV vs revealed tiles are visually distinguishable
- [ ] Minimap corners are rounded (soft fallback if `roundRect` unavailable)
- [ ] Minimap toggle (`M` key / mobile button) still works as before
- [ ] No changes to minimap size, position, or scale
