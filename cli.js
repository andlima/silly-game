import { createGame, dispatch, getVisibleTiles, FLOOR, WALL, STAIR } from './src/game.js';
import { GLYPHS, GLYPHS_ASCII, toggleRenderMode, getRenderMode } from './src/glyphs.js';
import { buildState as _buildState } from './src/bot.js';

const BOT_MODE = process.argv.includes('--bot');

let game = createGame();

// ─── Bot protocol ───────────────────────────────────────────────────────────

if (BOT_MODE) {
  const VALID_ACTIONS = new Set(['move', 'wait', 'useFood', 'descend', 'restart']);
  const VALID_DIRS = new Set(['n', 's', 'e', 'w']);

  let prevMessageCount = 0;

  function writeLine(obj) {
    process.stdout.write(JSON.stringify(obj) + '\n');
  }

  function emitState(action) {
    const state = _buildState(game, action, prevMessageCount);
    prevMessageCount = game.messages.length;
    writeLine(state);
  }

  // Write initial state
  emitState(null);

  // Read JSON lines from stdin
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      let action;
      try {
        action = JSON.parse(line);
      } catch {
        writeLine({ error: 'invalid action', detail: 'malformed JSON' });
        continue;
      }

      if (!action || typeof action.type !== 'string' || !VALID_ACTIONS.has(action.type)) {
        writeLine({ error: 'invalid action', detail: `unknown type: ${action?.type}` });
        continue;
      }

      if (action.type === 'move' && !VALID_DIRS.has(action.dir)) {
        writeLine({ error: 'invalid action', detail: `invalid dir: ${action.dir}` });
        continue;
      }

      const prevPos = { x: game.player.x, y: game.player.y };
      game = dispatch(game, action);
      const moved = action.type === 'move' && (game.player.x !== prevPos.x || game.player.y !== prevPos.y);

      emitState({ ...action, _moved: moved });

      if (game.gameOver || game.won) {
        process.exit(0);
      }
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });

} else {
// ─── TUI mode ──────────────────────────────────────────────────────────────

// ANSI color helpers
const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BG_BLACK = `${ESC}40m`;
const FG_WHITE = `${ESC}97m`;
const FG_GREY = `${ESC}37m`;
const FG_GREEN = `${ESC}32m`;
const FG_YELLOW = `${ESC}93m`;
const FG_BLACK = `${ESC}30m`;
const FG_RED = `${ESC}91m`;
const FG_BROWN = `${ESC}33m`;
const FG_CYAN = `${ESC}96m`;
const FG_MAGENTA = `${ESC}95m`;
const CLEAR = `${ESC}2J${ESC}H`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;

// 256-color helpers
const FG_HP_LOST = `${ESC}38;5;238m`;

// Player color: golden foreground
const PLAYER_FG = `${ESC}38;5;220m`; // golden yellow foreground

// Blue-grey wall shade palettes (indexed by position hash for stone texture)
// Remembered tier (explored but not currently visible) — dimmest
const WALL_SHADES_REMEMBERED = [234, 235, 236, 237];
// Dim tier (edge of torch radius, low brightness) — cool blue-grey
const WALL_SHADES_DIM = [59, 60, 60, 66];
// Bright tier (near player, high brightness) — cool blue-grey
const WALL_SHADES_BRIGHT = [66, 67, 67, 103];
// Floor brightness levels (warm yellow-grey tints)
const FLOOR_SHADES = [58, 94, 100, 136];
// Stair brightness levels
const STAIR_SHADES = [23, 30, 37, 44];
// Remembered (explored but not visible) tile colors
const REMEMBERED_FLOOR = `${ESC}38;5;233m`;
const REMEMBERED_STAIR = `${ESC}38;5;237m`;

function fg256(code) {
  return `${ESC}38;5;${code}m`;
}

// Map brightness (0.0–1.0) to a shade index (0–3)
function brightnessToIndex(brightness) {
  if (brightness <= 0.25) return 0;
  if (brightness <= 0.50) return 1;
  if (brightness <= 0.75) return 2;
  return 3;
}

// Position-based wall shade: stable hash from map coordinates
function wallShade(x, y, brightness) {
  const hash = (x * 7 + y * 13) % 4;
  const palette = brightness > 0.5 ? WALL_SHADES_BRIGHT : WALL_SHADES_DIM;
  return palette[hash];
}

function wallShadeRemembered(x, y) {
  const hash = (x * 7 + y * 13) % 4;
  return WALL_SHADES_REMEMBERED[hash];
}

const MONSTER_COLORS = {
  rat: FG_BROWN,
  skeleton: FG_WHITE,
  bear: `${ESC}38;5;130m`,  // brown
  dragon: FG_MAGENTA,
};

const EQUIPMENT_COLORS = {
  dagger: FG_WHITE,
  sword:  FG_WHITE,
  helmet: FG_CYAN,
  shield: FG_CYAN,
};

const KEY_MAP = {
  '\x1b[A': 'n',  // up arrow
  '\x1b[B': 's',  // down arrow
  '\x1b[D': 'w',  // left arrow
  '\x1b[C': 'e',  // right arrow
  'w': 'n', 'W': 'n',
  's': 's', 'S': 's',
  'a': 'w', 'A': 'w',
  'd': 'e', 'D': 'e',
};

function getCellWidth() {
  return getRenderMode() === 'enhanced' ? 2 : 1;
}

function getViewSize() {
  const cellWidth = getCellWidth();
  const termCols = (process.stdout.columns || 80) - 2;
  const cols = Math.floor(termCols / cellWidth);
  const msgLines = 5;
  const rows = (process.stdout.rows || 24) - 4 - msgLines; // HUD + messages
  return { cols: Math.max(10, cols), rows: Math.max(6, rows) };
}

// Render a glyph into a cell (2-col for enhanced, 1-col for ASCII)
function cell(colorCode, glyph) {
  if (getRenderMode() === 'ascii') {
    return `${colorCode}${glyph.char}`;
  }
  if (glyph.wide) {
    return `${colorCode}${glyph.char}`;
  }
  return `${colorCode} ${glyph.char}`;
}

// Blank cell matching current mode width
function blankCell() {
  return getRenderMode() === 'enhanced' ? '  ' : ' ';
}

function hpBar(hp, maxHp) {
  const barWidth = 20;
  const filled = maxHp > 0 ? Math.round((hp / maxHp) * barWidth) : 0;
  const empty = barWidth - filled;
  const pct = maxHp > 0 ? hp / maxHp : 0;
  let color;
  if (pct > 0.6) color = FG_GREEN;
  else if (pct > 0.3) color = FG_YELLOW;
  else color = FG_RED;
  return `HP ${color}[${'#'.repeat(filled)}${FG_HP_LOST}${'.'.repeat(empty)}${color}]${RESET} ${hp}/${maxHp}`;
}

function render() {
  if (game.gameOver) {
    renderGameOver();
    return;
  }
  if (game.won) {
    renderWin();
    return;
  }

  const { cols, rows } = getViewSize();
  const visible = getVisibleTiles(game, cols, rows);

  let out = CLEAR + BG_BLACK;

  for (let vy = 0; vy < visible.length; vy++) {
    let line = '';
    for (let vx = 0; vx < visible[vy].length; vx++) {
      const c = visible[vy][vx];

      if (c.visibility === 'hidden') {
        line += blankCell();
        continue;
      }

      if (c.visibility === 'revealed') {
        if (c.tile === WALL) {
          line += cell(fg256(wallShadeRemembered(c.x, c.y)), GLYPHS.wall);
        } else if (c.tile === STAIR) {
          line += cell(REMEMBERED_STAIR, GLYPHS.stair);
        } else if (c.tile === FLOOR) {
          line += cell(REMEMBERED_FLOOR, GLYPHS.floor);
        } else {
          line += blankCell();
        }
        continue;
      }

      // Visible tiles
      if (c.isPlayer) {
        line += cell(`${PLAYER_FG}`, GLYPHS.player) + `${RESET}${BG_BLACK}`;
      } else if (c.monster) {
        const monsterGlyph = GLYPHS[c.monster.type] || { char: c.monster.char, wide: false };
        if (monsterGlyph.wide) {
          // Emoji renders in native colors, no ANSI override
          line += cell('', monsterGlyph);
        } else {
          const color = MONSTER_COLORS[c.monster.type] || FG_WHITE;
          line += cell(color, monsterGlyph);
        }
      } else if (c.item) {
        const itemGlyph = GLYPHS[c.item.type] || { char: c.item.char, wide: false };
        if (itemGlyph.wide) {
          line += cell('', itemGlyph);
        } else {
          const itemColor = EQUIPMENT_COLORS[c.item.type] || FG_MAGENTA;
          line += cell(itemColor, itemGlyph);
        }
      } else if (c.tile === WALL) {
        const shade = wallShade(c.x, c.y, c.brightness);
        line += cell(fg256(shade), GLYPHS.wall);
      } else if (c.tile === STAIR) {
        const shade = STAIR_SHADES[brightnessToIndex(c.brightness)];
        line += cell(fg256(shade), GLYPHS.stair);
      } else if (c.tile === FLOOR) {
        const shade = FLOOR_SHADES[brightnessToIndex(c.brightness)];
        line += cell(fg256(shade), GLYPHS.floor);
      } else {
        line += blankCell();
      }
    }
    out += line + RESET + '\n';
  }

  const modeLabel = getRenderMode() === 'enhanced' ? '[emoji]' : '[ASCII]';
  out += hpBar(game.player.hp, game.player.maxHp);
  out += `  ${FG_CYAN}Level: ${game.level}${RESET}`;
  out += `  ${FG_MAGENTA}Food: ${game.inventory.food}${RESET}`;
  out += `  ${FG_YELLOW}Gold: ${game.inventory.gold}${RESET}`;
  out += `  ${FG_GREY}${modeLabel}${RESET}`;
  out += `  |  ${FG_GREY}p:food  >/.:descend  Tab:toggle  q:quit${RESET}\n`;

  // Equipment HUD
  const eq = game.equipment;
  const weaponStr = eq.weapon ? `${eq.weapon.name} +${eq.weapon.bonus}atk` : '-';
  const helmetStr = eq.helmet ? `${eq.helmet.name} +${eq.helmet.bonus}def` : '-';
  const shieldStr = eq.shield ? `${eq.shield.name} +${eq.shield.bonus}def` : '-';
  out += `${FG_GREY}Weapon: ${FG_WHITE}${weaponStr}${RESET} ${FG_GREY}| Helmet: ${FG_CYAN}${helmetStr}${RESET} ${FG_GREY}| Shield: ${FG_CYAN}${shieldStr}${RESET}\n`;

  const maxMsgLines = 5;
  const msgs = game.messages.slice(-maxMsgLines);
  for (const msg of msgs) {
    out += `${FG_YELLOW}${msg}${RESET}\n`;
  }
  for (let i = msgs.length; i < maxMsgLines; i++) {
    out += '\n';
  }

  process.stdout.write(out);
}

let helpVisible = false;

function renderHelp() {
  let out = CLEAR + BG_BLACK;
  out += `\n${FG_YELLOW}  === Controls ===${RESET}\n\n`;
  out += `  ${FG_WHITE}Movement${RESET}\n`;
  out += `    ${FG_CYAN}Arrow keys / WASD${RESET}  ${FG_GREY}Move${RESET}\n\n`;
  out += `  ${FG_WHITE}Actions${RESET}\n`;
  out += `    ${FG_CYAN}P${RESET}                  ${FG_GREY}Use food${RESET}\n`;
  out += `    ${FG_CYAN}. or >${RESET}              ${FG_GREY}Descend stairs${RESET}\n`;
  out += `    ${FG_CYAN}5${RESET}                  ${FG_GREY}Wait a turn${RESET}\n\n`;
  out += `  ${FG_WHITE}Toggles${RESET}\n`;
  out += `    ${FG_CYAN}Tab${RESET}                ${FG_GREY}Toggle render mode${RESET}\n`;
  out += `    ${FG_CYAN}R${RESET}                  ${FG_GREY}Restart game${RESET}\n`;
  out += `    ${FG_CYAN}Q${RESET}                  ${FG_GREY}Quit${RESET}\n\n`;
  out += `  ${FG_GREY}Press any key to return to game${RESET}\n`;
  process.stdout.write(out);
}

function renderStats(out) {
  const s = game.stats || {};
  out += `\n${FG_GREY}  -- Stats --${RESET}\n`;
  out += `  ${FG_GREY}Level reached: ${FG_WHITE}${game.level}${RESET}\n`;
  out += `  ${FG_GREY}Monsters slain: ${FG_WHITE}${s.monstersKilled || 0}${RESET}\n`;
  out += `  ${FG_GREY}Gold collected: ${FG_YELLOW}${s.goldCollected || 0}${RESET}\n`;
  out += `  ${FG_GREY}Steps taken: ${FG_WHITE}${s.stepsTaken || 0}${RESET}\n`;
  return out;
}

function renderGameOver() {
  let out = CLEAR + BG_BLACK;
  out += `\n\n${FG_RED}  *** GAME OVER ***${RESET}\n\n`;
  for (const msg of game.messages) {
    out += `  ${FG_YELLOW}${msg}${RESET}\n`;
  }
  out = renderStats(out);
  out += `\n${FG_GREY}  Press r to restart or q to quit${RESET}\n`;
  process.stdout.write(out);
}

function renderWin() {
  let out = CLEAR + BG_BLACK;
  out += `\n\n${FG_GREEN}  *** YOU WIN! ***${RESET}\n\n`;
  out += `  ${FG_YELLOW}You escaped the dungeon on level ${game.level}!${RESET}\n`;
  for (const msg of game.messages) {
    out += `  ${FG_YELLOW}${msg}${RESET}\n`;
  }
  out = renderStats(out);
  out += `\n${FG_GREY}  Press r to restart or q to quit${RESET}\n`;
  process.stdout.write(out);
}

function cleanup() {
  process.stdout.write(SHOW_CURSOR + RESET + CLEAR);
  process.exit(0);
}

// Setup raw stdin
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdout.write(HIDE_CURSOR);

process.stdin.on('data', (key) => {
  if (key === 'q' || key === 'Q' || key === '\x03') {
    cleanup();
    return;
  }

  // Help overlay: any key dismisses it
  if (helpVisible) {
    helpVisible = false;
    render();
    return;
  }

  // Show help
  if (key === '?' || key === 'h' || key === 'H') {
    helpVisible = true;
    renderHelp();
    return;
  }

  if (game.gameOver || game.won) {
    if (key === 'r' || key === 'R') {
      game = dispatch(game, { type: 'restart' });
      render();
    }
    return;
  }

  // Tab key toggles render mode
  if (key === '\t') {
    toggleRenderMode();
    render();
    return;
  }

  const dir = KEY_MAP[key];
  if (dir) {
    game = dispatch(game, { type: 'move', dir });
    render();
    return;
  }

  if (key === '.' || key === '>') {
    game = dispatch(game, { type: 'descend' });
    render();
    return;
  }

  if (key === 'p' || key === 'P') {
    game = dispatch(game, { type: 'useFood' });
    render();
    return;
  }

  if (key === '5') {
    game = dispatch(game, { type: 'wait' });
    render();
  }
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.stdout.on('resize', render);

render();
} // end TUI mode
