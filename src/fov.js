import { WALL } from './map.js';

const TORCH_RADIUS = 8;

/**
 * Compute field of view using recursive shadowcasting.
 * Returns a Map of "x,y" -> brightness (0.3–1.0) for all visible tiles.
 */
export function computeFOV(map, ox, oy, radius = TORCH_RADIUS) {
  const visible = new Map();

  // Origin is always visible at full brightness
  visible.set(`${ox},${oy}`, 1.0);

  for (let octant = 0; octant < 8; octant++) {
    castOctant(map, ox, oy, radius, octant, 1, 1.0, 0.0, visible);
  }

  return visible;
}

function brightness(distance, radius) {
  const b = 1.0 - (distance / radius) * 0.7;
  return Math.max(0.3, Math.min(1.0, b));
}

function isOpaque(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return true;
  return map.tiles[y][x] === WALL;
}

// Transform octant-local (row, col) to map coordinates
function transformOctant(ox, oy, octant, row, col) {
  switch (octant) {
    case 0: return { x: ox + col, y: oy - row };
    case 1: return { x: ox + row, y: oy - col };
    case 2: return { x: ox + row, y: oy + col };
    case 3: return { x: ox + col, y: oy + row };
    case 4: return { x: ox - col, y: oy + row };
    case 5: return { x: ox - row, y: oy + col };
    case 6: return { x: ox - row, y: oy - col };
    case 7: return { x: ox - col, y: oy - row };
  }
}

function castOctant(map, ox, oy, radius, octant, row, startSlope, endSlope, visible) {
  if (startSlope < endSlope) return;

  let nextStartSlope = startSlope;

  for (let r = row; r <= radius; r++) {
    let blocked = false;

    for (let col = 0; col <= r; col++) {
      const leftSlope = (col - 0.5) / (r + 0.5);
      const rightSlope = (col + 0.5) / (r - 0.5);

      if (rightSlope < endSlope) continue;
      if (leftSlope > startSlope) break;

      const { x, y } = transformOctant(ox, oy, octant, r, col);
      const dist = Math.sqrt((x - ox) * (x - ox) + (y - oy) * (y - oy));

      if (dist <= radius) {
        const key = `${x},${y}`;
        const b = brightness(dist, radius);
        // Keep the brighter value if seen from multiple octants
        if (!visible.has(key) || visible.get(key) < b) {
          visible.set(key, b);
        }
      }

      if (blocked) {
        if (isOpaque(map, x, y)) {
          nextStartSlope = rightSlope;
        } else {
          blocked = false;
          nextStartSlope = startSlope; // Reset to parent's start slope on unblock
        }
      } else if (isOpaque(map, x, y) && r < radius) {
        blocked = true;
        castOctant(map, ox, oy, radius, octant, r + 1, nextStartSlope, leftSlope, visible);
        nextStartSlope = rightSlope;
      }
    }

    if (blocked) break;
  }
}

export { TORCH_RADIUS };
