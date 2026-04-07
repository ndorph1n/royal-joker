import { Sprite } from "pixi.js";
import { isSpecialTexture, layoutSymbolSprite } from "./layoutSymbolSprite";

export function createSpinner({
  app,
  reels,
  textures,
  GAMEFIELD,
  step,
  visibleHeight,
}) {
  let spinning = false;
  const regularTextures = textures.filter((texture) => !isSpecialTexture(texture));

  const randomTexture = () =>
    regularTextures[Math.floor(Math.random() * regularTextures.length)];

  function topY(reel) {
    let m = Infinity;
    for (const s of reel.children) m = Math.min(m, s.y);
    return m;
  }

  function addSpriteOnTop(reel, texture) {
    const s = new Sprite(texture);
    layoutSymbolSprite(s, GAMEFIELD, topY(reel) - step);
    reel.addChild(s);
  }

  function removeOffscreenBottom(reel) {
    const bottomLine = GAMEFIELD.startY + visibleHeight + step;
    for (const s of [...reel.children]) {
      if (s.y + reel.y > bottomLine) {
        reel.removeChild(s);
        s.destroy();
      }
    }
  }

  function ensureEnoughSpritesAbove(reel, queue) {
    const topLine = GAMEFIELD.startY - step;
    while (topY(reel) + reel.y > topLine) {
      const tex = queue.length ? queue.shift() : randomTexture();
      addSpriteOnTop(reel, tex);
    }
  }

  function snapTargetY(reel) {
    const offset = (reel.y - GAMEFIELD.startY) % step;
    return reel.y - offset;
  }

  function smoothSnap(reel, targetY, duration = 90, onComplete = null) {
    return new Promise((resolve) => {
      let t = 0;
      const fromY = reel.y;

      const fn = () => {
        t += app.ticker.deltaMS;
        const k = Math.min(1, t / duration);
        const eased = easeOutCubic(k);
        reel.y = fromY + (targetY - fromY) * eased;

        if (k >= 1) {
          reel.y = targetY;
          app.ticker.remove(fn);
          if (typeof onComplete === "function") {
            onComplete();
          }
          resolve();
        }
      };

      app.ticker.add(fn);
    });
  }

  function spin(resultTextures, opts = {}) {
    if (spinning) return Promise.resolve(false);
    spinning = true;

    const {
      maxSpeed = 2200,
      accelTime = 250,
      runTime = 700,
      stopGap = 180,
      decelTime = 450,
      snapTime = 90,

      decelExtraSteps = 2,
      onReelStop = null,
      onReelSettled = null,
    } = opts;

    const states = reels.map((reel, col) => ({
      reel,
      col,
      phase: "accel", // accel | run | decel | snapping | done
      t: 0,
      speed: 0,
      stopAt: runTime + col * stopGap,

      queue: [],

      decelT: 0,
      decelFromY: 0,
      decelToY: 0,

      snapStarted: false,
    }));

    return new Promise((resolve) => {
      const update = () => {
        const dtMS = app.ticker.deltaMS;
        const dt = dtMS / 1000;

        let doneCount = 0;

        for (const st of states) {
          const reel = st.reel;
          st.t += dtMS;

          if (st.phase === "accel") {
            const k = Math.min(1, st.t / accelTime);
            st.speed = maxSpeed * easeOutQuad(k);

            reel.y += st.speed * dt;

            removeOffscreenBottom(reel);
            ensureEnoughSpritesAbove(reel, st.queue);

            if (st.t >= accelTime) st.phase = "run";
          } else if (st.phase === "run") {
            st.speed = maxSpeed;
            reel.y += st.speed * dt;

            removeOffscreenBottom(reel);
            ensureEnoughSpritesAbove(reel, st.queue);

            if (st.t >= st.stopAt) {
              st.phase = "decel";
              st.decelT = 0;

              st.queue = [...resultTextures[st.col], randomTexture()];

              st.decelFromY = reel.y;

              const steps = st.queue.length + decelExtraSteps;

              const offset = (reel.y - GAMEFIELD.startY) % step;
              const snapForward = (step - offset) % step;

              st.decelToY = reel.y + steps * step + snapForward;

              if (typeof onReelStop === "function") onReelStop(st.col);
            }
          } else if (st.phase === "decel") {
            st.decelT += dtMS;

            const k = Math.min(1, st.decelT / decelTime);
            const eased = easeOutCubic(k);

            reel.y = lerp(st.decelFromY, st.decelToY, eased);

            removeOffscreenBottom(reel);
            ensureEnoughSpritesAbove(reel, st.queue);
            if (k >= 1) {
              st.phase = "snapping";

              st.snapStarted = false;
            }
          } else if (st.phase === "snapping") {
            if (!st.snapStarted) {
              st.snapStarted = true;
              const targetY = snapTargetY(reel);
              smoothSnap(reel, targetY, snapTime, () => {
                normalizeReel(reel, GAMEFIELD, visibleHeight, step);
                if (typeof onReelSettled === "function") {
                  onReelSettled(st.col);
                }
                st.phase = "done";
              });
            }
          } else if (st.phase === "done") {
            doneCount++;
          }
        }

        if (doneCount === states.length) {
          app.ticker.remove(update);
          spinning = false;
          resolve(true);
        }
      };

      app.ticker.add(update);
    });
  }

  return { spin, isSpinning: () => spinning };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function normalizeReel(reel, GAMEFIELD, visibleHeight, step) {
  const targetReelY = GAMEFIELD.startY;

  const dy = reel.y - targetReelY;
  if (dy === 0) return;

  for (const s of reel.children) {
    s.y += dy;
  }

  reel.y = targetReelY;

  const top = GAMEFIELD.startY - 2 * step;
  const bottom = GAMEFIELD.startY + visibleHeight + 2 * step;

  for (const s of [...reel.children]) {
    const gy = s.y + reel.y;
    if (gy < top || gy > bottom) {
      reel.removeChild(s);
      s.destroy();
    }
  }
}
