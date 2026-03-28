import { createGame, dispatch, getVisibleTiles, FLOOR, WALL } from './src/game.js';

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
const CLEAR = `${ESC}2J${ESC}H`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;

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
  const rows = (process.stdout.rows || 24) - 3; // leave room for HUD
  return { cols: Math.max(10, cols), rows: Math.max(6, rows) };
}

function render() {
  const { cols, rows } = getViewSize();
  const visible = getVisibleTiles(game, cols, rows);

  let out = CLEAR + BG_BLACK;

  for (let vy = 0; vy < visible.length; vy++) {
    let line = '';
    for (let vx = 0; vx < visible[vy].length; vx++) {
      const cell = visible[vy][vx];
      if (cell.isPlayer) {
        line += `${BG_YELLOW}${FG_BLACK}@${RESET}${BG_BLACK}`;
      } else if (cell.tile === WALL) {
        line += `${FG_WHITE}#`;
      } else if (cell.tile === FLOOR) {
        line += `${FG_GREEN}.`;
      } else {
        line += ' ';
      }
    }
    out += line + RESET + '\n';
  }

  out += `${FG_GREY}Position: (${game.player.x}, ${game.player.y})  |  q to quit${RESET}\n`;

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
  if (key === 'q' || key === 'Q' || key === '\x03') { // q or Ctrl-C
    cleanup();
    return;
  }

  const dir = KEY_MAP[key];
  if (dir) {
    game = dispatch(game, { type: 'move', dir });
    render();
  }
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.stdout.on('resize', render);

render();
