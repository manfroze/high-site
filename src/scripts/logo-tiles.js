/**
 * Small static logo-tiles forming a ring inside a card, matching the look of
 * the .icon-column strip on the right edge of the page.
 *
 * The strip's generator lives inline in index.astro and is ~800 lines, most of
 * it interactive (migration, click handling, the keyboard easter egg). Only
 * the visual vocabulary is shared here — palette, multiply blending, red
 * diamonds, two-tone triangles, and the 400ms neighbour swap — because a
 * border needs far less than the strip does. Palette changes have to be made
 * in both places.
 */

// The strip's own palette. Deliberately not the --cyan/--pink CSS variables,
// which are darker; these are the transparent-logo colors the strip uses.
const CYAN = '#92f0ed';
const PINK = '#ebb0ff';
const RED = '#e70006';

const SWAP_INTERVAL = 3000;
const SWAP_DURATION = 400;

function pickColor() {
  const r = Math.random();
  if (r < 0.06) return RED;
  if (r < 0.53) return CYAN;
  return PINK;
}

/** Picks a tile description. Every cell is filled — the ring has no gaps. */
function pickTile() {
  const roll = Math.random();
  if (roll < 0.05) return { kind: 'diamond', colors: [RED] };
  if (roll < 0.12) return { kind: 'triangle', colors: [CYAN, PINK] };

  const first = pickColor();
  if (roll < 0.58) return { kind: 'solid', colors: [first] };

  let second = pickColor();
  if (first === RED && second === RED) second = Math.random() < 0.5 ? CYAN : PINK;
  return { kind: 'solid', colors: [first, second] };
}

const overlaps = (a, b) => a.colors.some((c) => b.colors.includes(c));

/** Where an element sits in a cell — diamonds are inset and rotated. */
function place(el, x, y, w, h) {
  if (el.dataset.diamond === '1') {
    el.style.left = `${x + w * 0.15}px`;
    el.style.top = `${y + h * 0.15}px`;
  } else {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}

function buildElements(tile, x, y, w, h) {
  const els = [];

  if (tile.kind === 'diamond') {
    const d = document.createElement('div');
    d.className = 'logo-tile';
    d.dataset.diamond = '1';
    d.style.cssText =
      `position:absolute;width:${w * 0.7}px;height:${h * 0.7}px;` +
      `background:${RED};transform:rotate(45deg);`;
    place(d, x, y, w, h);
    els.push(d);
    return els;
  }

  if (tile.kind === 'triangle') {
    const bg = document.createElement('div');
    bg.className = 'logo-tile';
    bg.style.cssText =
      `position:absolute;width:${w}px;height:${h}px;background:${CYAN};mix-blend-mode:multiply;`;
    place(bg, x, y, w, h);
    els.push(bg);

    const tri = document.createElement('div');
    tri.className = 'logo-tile';
    tri.style.cssText =
      `position:absolute;width:${w}px;height:${h}px;background:${PINK};` +
      `clip-path:polygon(100% 0%, 0% 100%, 100% 100%);mix-blend-mode:multiply;`;
    place(tri, x, y, w, h);
    els.push(tri);
    return els;
  }

  for (const color of tile.colors) {
    const sq = document.createElement('div');
    sq.className = 'logo-tile';
    sq.style.cssText =
      `position:absolute;width:${w}px;height:${h}px;background:${color};mix-blend-mode:multiply;`;
    place(sq, x, y, w, h);
    els.push(sq);
  }
  return els;
}

const signature = (cell) =>
  cell.els.map((el) => el.style.background).sort().join('|');

/**
 * Draws a one-tile-thick ring inside `container` and animates it.
 *
 * Tile width and height are derived independently so the card's width and
 * height each hold a whole number of tiles — tiles come out slightly
 * non-square rather than leaving a clipped remainder at the corners.
 */
export function createTileFrame(container, target = 14) {
  let cells = [];
  let tileW = target;
  let tileH = target;
  let timer = null;

  function build() {
    const { width, height } = container.getBoundingClientRect();
    if (width < target * 2 || height < target * 2) return;

    container.replaceChildren();
    cells = [];

    const cols = Math.max(2, Math.round(width / target));
    const rows = Math.max(2, Math.round(height / target));
    tileW = width / cols;
    tileH = height / rows;

    // Walk the ring in order, so neighbours in this list are neighbours on
    // screen — both the anti-clump check and swapping rely on that.
    const positions = [];
    for (let c = 0; c < cols; c++) positions.push([c * tileW, 0]);
    for (let r = 1; r < rows - 1; r++) positions.push([(cols - 1) * tileW, r * tileH]);
    for (let c = cols - 1; c >= 0; c--) positions.push([c * tileW, (rows - 1) * tileH]);
    for (let r = rows - 2; r >= 1; r--) positions.push([0, r * tileH]);

    let previous = null;
    for (const [x, y] of positions) {
      let tile = pickTile();
      for (let attempt = 0; attempt < 12 && previous && overlaps(tile, previous); attempt++) {
        tile = pickTile();
      }
      const els = buildElements(tile, x, y, tileW, tileH);
      els.forEach((el) => container.appendChild(el));
      cells.push({ x, y, els });
      previous = tile;
    }
  }

  /** Exchanges one element between two adjacent cells, as the strip does. */
  function swap() {
    if (cells.length < 2) return;

    // Try a few random neighbour pairs; skip ones that would look identical.
    for (let attempt = 0; attempt < 8; attempt++) {
      const i = Math.floor(Math.random() * cells.length);
      const j = (i + 1) % cells.length;
      const a = cells[i];
      const b = cells[j];
      if (!a.els.length || !b.els.length) continue;
      if (signature(a) === signature(b)) continue;

      const ia = Math.floor(Math.random() * a.els.length);
      const ib = Math.floor(Math.random() * b.els.length);
      const elA = a.els[ia];
      const elB = b.els[ib];

      a.els.splice(ia, 1, elB);
      b.els.splice(ib, 1, elA);

      const transition = `left ${SWAP_DURATION}ms ease-in-out, top ${SWAP_DURATION}ms ease-in-out`;
      elA.style.transition = transition;
      place(elA, b.x, b.y, tileW, tileH);
      elB.style.transition = transition;
      place(elB, a.x, a.y, tileW, tileH);

      window.setTimeout(() => {
        elA.style.transition = '';
        elB.style.transition = '';
      }, SWAP_DURATION + 100);
      return;
    }
  }

  const start = () => {
    if (!timer) timer = window.setInterval(swap, SWAP_INTERVAL);
  };
  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  return { build, swap, start, stop };
}

/**
 * Draws the frame, redraws on resize, and swaps tiles only while the card is
 * on screen — the same restraint the Extravagaria gradient uses. Honours
 * prefers-reduced-motion by rendering the tiles without animating them.
 */
export function watchTileFrame(container, target = 14) {
  const frame = createTileFrame(container, target);
  frame.build();

  const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');

  if ('ResizeObserver' in window) {
    let last = 0;
    new ResizeObserver(() => {
      // Rebuild only on real size changes; a swap must not retrigger this.
      const w = Math.round(container.getBoundingClientRect().width);
      if (w === last) return;
      last = w;
      frame.build();
    }).observe(container);
  }

  let onScreen = !('IntersectionObserver' in window);
  const sync = () => {
    if (onScreen && !stillness.matches) frame.start();
    else frame.stop();
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: '200px' }
    ).observe(container);
  }

  stillness.addEventListener?.('change', sync);
  sync();

  return frame;
}
