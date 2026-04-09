export function createFinalFieldShake({ app, target }) {
  let activeTick = null;
  let resolveActive = null;
  const basePosition = {
    x: target.x,
    y: target.y,
  };

  function clear() {
    if (activeTick) {
      app.ticker.remove(activeTick);
      activeTick = null;
    }
    if (resolveActive) {
      resolveActive();
      resolveActive = null;
    }

    target.position.set(basePosition.x, basePosition.y);
  }

  function play(options = {}) {
    clear();

    const duration = options.duration ?? 900;
    const amplitude = options.amplitude ?? 12;
    const frequency = options.frequency ?? 42;

    return new Promise((resolve) => {
      resolveActive = resolve;
      let elapsed = 0;

      activeTick = () => {
        elapsed += app.ticker.deltaMS;

        const progress = Math.min(1, elapsed / duration);
        const damping = 1 - easeOutCubic(progress);
        const time = elapsed / 1000;
        const offsetX =
          Math.sin(time * frequency) * amplitude * damping +
          Math.cos(time * (frequency * 0.55)) * amplitude * 0.35 * damping;
        const offsetY =
          Math.cos(time * (frequency * 0.9)) * amplitude * 0.55 * damping;

        target.position.set(
          basePosition.x + offsetX,
          basePosition.y + offsetY,
        );

        if (progress >= 1) {
          app.ticker.remove(activeTick);
          activeTick = null;
          target.position.set(basePosition.x, basePosition.y);

          const done = resolveActive;
          resolveActive = null;
          done?.();
        }
      };

      app.ticker.add(activeTick);
    });
  }

  return { play, clear };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
