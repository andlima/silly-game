import { createGame, dispatch, getVisibleTiles, FLOOR, WALL, STAIR } from './src/game.js';

let game = createGame();

// ANSI color helpers
const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BG_BLACK = `${ESC}40m`;
const FG_WHITE = `${ESC}97m`;
const FG_GREY = `${ESC}37m`;
const FG_GREEN = `${ESC}32m`;
const FG_YELLOW = `${ESC}93m`;
const BG_YELLOW = `${ESC}43m`;
const FG_BLACK = `${ESC}30m`;
const FG_RED = `${ESC}91m`;
const FG_BROWN = `${ESC}33m`;
const FG_CYAN = `${ESC}96m`;
const FG_MAGENTA = `${ESC}95m`;
const CLEAR = `${ESC}2J${ESC}H`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;

const MONSTER_COLORS = {
  rat: FG_BROWN,
  goblin: FG_GREEN,
  orc: `${ESC}38;5;208m`,  // orange
  troll: FG_MAGENTA,
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

function getViewSize() {
  const cols = (process.stdout.columns || 80) - 2;
  const msgLines = Math.min(game.messages.length, 5);
  const rows = (process.stdout.rows || 24) - 4 - msgLines; // HUD + messages
  return { cols: Math.max(10, cols), rows: Math.max(6, rows) };
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
      const cell = visible[vy][vx];
      if (cell.isPlayer) {
        line += `${BG_YELLOW}${FG_BLACK}@${RESET}${BG_BLACK}`;
      } else if (cell.monster) {
        const color = MONSTER_COLORS[cell.monster.type] || FG_WHITE;
        line += `${color}${cell.monster.char}`;
      } else if (cell.item) {
        line += `${FG_MAGENTA}${cell.item.char}`;
      } else if (cell.tile === WALL) {
        line += `${FG_WHITE}#`;
      } else if (cell.tile === STAIR) {
        line += `${FG_CYAN}>`;
      } else if (cell.tile === FLOOR) {
        line += `${FG_GREEN}.`;
      } else {
        line += ' ';
      }
    }
    out += line + RESET + '\n';
  }

  out += `${FG_RED}HP: ${game.player.hp}/${game.player.maxHp}${RESET}`;
  out += `  ${FG_CYAN}Level: ${game.level}${RESET}`;
  out += `  ${FG_MAGENTA}Potions: ${game.inventory.potions}${RESET}`;
  out += `  |  ${FG_GREY}p:potion  >/.:descend  q:quit${RESET}\n`;

  for (const msg of game.messages) {
    out += `${FG_YELLOW}${msg}${RESET}\n`;
  }

  process.stdout.write(out);
}

function renderGameOver() {
  let out = CLEAR + BG_BLACK;
  out += `\n\n${FG_RED}  *** GAME OVER ***${RESET}\n\n`;
  for (const msg of game.messages) {
    out += `  ${FG_YELLOW}${msg}${RESET}\n`;
  }
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

  if (game.gameOver || game.won) {
    if (key === 'r' || key === 'R') {
      game = dispatch(game, { type: 'restart' });
      render();
    }
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
    game = dispatch(game, { type: 'usePotion' });
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
