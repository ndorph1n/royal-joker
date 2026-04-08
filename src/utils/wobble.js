export function wobble(app, reels, textures, GAMEFIELD, visibleHeight) {
  const cols = GAMEFIELD.cols;
  const rows = GAMEFIELD.rows;
  const dimAlpha = 0.35;
  const textureToIndex = new Map(textures.map((t, i) => [t, i]));

  const field = reels.map((reel) =>
    getVisibleSprites(reel, GAMEFIELD, visibleHeight, rows),
  );
  if (field.length < cols || field.some((col) => col.length < rows))
    return () => {};
  field.forEach((col) => {
    col.forEach((sprite) => {
      if (!sprite._anchorFixed) {
        sprite._anchorFixed = true;

        const x = sprite.x;
        const y = sprite.y;

        sprite.anchor.set(0.5);

        sprite.x = x + sprite.width / 2;
        sprite.y = y + sprite.height / 2;
      }
    });
  });
  const shown = field.map((colSprites) =>
    colSprites.map((s) => textureToIndex.get(s.texture)),
  );

  if (shown.some((col) => col.some((idx) => idx == null))) return () => {};

  const winCells = findWinCells(shown, cols, rows);
  if (winCells.size === 0) return () => {};

  const base = new Map(); // Sprite -> {x,y}
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const s = field[c][r];
      base.set(s, { x: s.scale.x, y: s.scale.y, alpha: s.alpha });
    }
  }

  let t = 0;
  let stopped = false;
  let settleTick = null;

  const tick = () => {
    t += app.ticker.deltaMS / 1000;

    const delta = (Math.sin(t * 6) * 0.5 + 0.5) * 0.05;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const s = field[c][r];
        const b = base.get(s);

        if (winCells.has(`${c},${r}`)) {
          s.scale.set(b.x + delta, b.y + delta);
          s.alpha = b.alpha;
        } else {
          s.scale.set(b.x, b.y);
          s.alpha = b.alpha * dimAlpha;
        }
      }
    }
  };

  app.ticker.add(tick);

  return function stop() {
    if (stopped) return;
    stopped = true;
    app.ticker.remove(tick);

    const settleFrom = new Map();
    const settleDuration = 180;
    let elapsed = 0;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const s = field[c][r];
        settleFrom.set(s, { x: s.scale.x, y: s.scale.y, alpha: s.alpha });
      }
    }

    settleTick = () => {
      elapsed += app.ticker.deltaMS;
      const k = Math.min(1, elapsed / settleDuration);
      const eased = easeOutCubic(k);

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const s = field[c][r];
          const from = settleFrom.get(s);
          const b = base.get(s);

          if (from && b) {
            s.scale.set(
              lerp(from.x, b.x, eased),
              lerp(from.y, b.y, eased),
            );
            s.alpha = lerp(from.alpha, b.alpha, eased);
          }
        }
      }

      if (k >= 1) {
        app.ticker.remove(settleTick);
        settleTick = null;
      }
    };

    app.ticker.add(settleTick);
  };
}

function getVisibleSprites(reel, GAMEFIELD, visibleHeight, rows = 3) {
  const top = GAMEFIELD.startY;
  const bottom = GAMEFIELD.startY + visibleHeight;

  return reel.children
    .map((s) => ({ s, gy: s.y + reel.y }))
    .filter(({ gy }) => gy >= top && gy < bottom)
    .sort((a, b) => a.gy - b.gy)
    .slice(0, rows)
    .reverse()
    .map(({ s }) => s);
}

export function findWinCells(shown, cols, rows) {
  const wins = new Set();
  if (cols < 3 || rows < 3) return wins;

  const addLine = (cells) => {
    const v = cells.map(([c, r]) => shown[c][r]);
    if (v[0] === v[1] && v[1] === v[2]) {
      cells.forEach(([c, r]) => wins.add(`${c},${r}`));
    }
  };

  addLine([
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  addLine([
    [0, 1],
    [1, 1],
    [2, 1],
  ]);
  addLine([
    [0, 2],
    [1, 2],
    [2, 2],
  ]);

  addLine([
    [0, 0],
    [1, 1],
    [2, 2],
  ]);
  addLine([
    [0, 2],
    [1, 1],
    [2, 0],
  ]);

  return wins;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
