import { Container, Sprite } from "pixi.js";

const DEFAULT_BOUNDS = {
  width: 600,
  height: 520,
};

export function createCoinConfetti({ app, gameWindow, coinTexture }) {
  const confettiLayer = new Container({ label: "coin confetti layer" });
  confettiLayer.zIndex = 19;
  gameWindow.addChild(confettiLayer);

  let activeTick = null;
  let resolveActive = null;

  function clear() {
    if (activeTick) {
      app.ticker.remove(activeTick);
      activeTick = null;
    }
    if (resolveActive) {
      resolveActive();
      resolveActive = null;
    }

    confettiLayer.removeChildren().forEach((child) => child.destroy());
  }

  function destroy() {
    clear();
    confettiLayer.destroy({ children: true });
  }

  function play(options = {}) {
    clear();

    const duration = options.duration ?? 1900;
    const perSide = options.perSide ?? 26;
    const secondBurstDelay = options.secondBurstDelay ?? 300;
    const secondBurstScale = options.secondBurstScale ?? 0.8;
    const width = options.width ?? DEFAULT_BOUNDS.width;
    const height = options.height ?? DEFAULT_BOUNDS.height;
    const leftX = -width / 2 - 40;
    const rightX = width / 2 + 40;
    const particles = [];
    let secondBurstTriggered = false;

    spawnBurst({
      particles,
      perSide,
      leftX,
      rightX,
      height,
      intensity: 1,
    });

    return new Promise((resolve) => {
      resolveActive = resolve;
      let elapsed = 0;

      activeTick = () => {
        const deltaSeconds = app.ticker.deltaMS / 1000;
        elapsed += app.ticker.deltaMS;

        if (!secondBurstTriggered && elapsed >= secondBurstDelay) {
          secondBurstTriggered = true;
          spawnBurst({
            particles,
            perSide: Math.max(8, Math.round(perSide * secondBurstScale)),
            leftX,
            rightX,
            height,
            intensity: 0.92,
          });
        }

        for (const particle of particles) {
          particle.vy += particle.gravity * deltaSeconds;
          particle.x += particle.vx * deltaSeconds;
          particle.y += particle.vy * deltaSeconds;

          const progress = Math.min(1, elapsed / duration);
          const fadeIn = Math.min(1, elapsed / 180);
          const fadeOut =
            progress > 0.82 ? 1 - (progress - 0.82) / 0.18 : 1;
          const wobble = Math.cos(elapsed / 1000 * 18 + particle.phase);

          particle.sprite.position.set(
            particle.x +
              Math.sin(elapsed / 1000 * 6 + particle.phase) * particle.drift,
            particle.y,
          );
          particle.sprite.rotation += particle.rotationSpeed * deltaSeconds;
          particle.sprite.scale.set(
            particle.scale * Math.max(0.18, Math.abs(wobble)),
            particle.scale,
          );
          particle.sprite.alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
        }

        if (elapsed >= duration) {
          app.ticker.remove(activeTick);
          activeTick = null;
          confettiLayer.removeChildren().forEach((child) => child.destroy());

          const done = resolveActive;
          resolveActive = null;
          done?.();
        }
      };

      app.ticker.add(activeTick);
    });
  }

  return { play, clear, destroy };

  function spawnBurst({
    particles,
    perSide,
    leftX,
    rightX,
    height,
    intensity,
  }) {
    for (const side of ["left", "right"]) {
      const fromLeft = side === "left";

      for (let index = 0; index < perSide; index++) {
        const sprite = new Sprite({
          texture: coinTexture,
          anchor: 0.5,
        });
        const scale = randomRange(0.15, 0.28) * randomRange(0.95, 1.08);

        sprite.position.set(
          fromLeft ? leftX : rightX,
          randomRange(-height * 0.24, height * 0.24),
        );
        sprite.scale.set(scale);
        sprite.rotation = Math.random() * Math.PI * 2;
        sprite.alpha = 0;
        confettiLayer.addChild(sprite);

        particles.push({
          sprite,
          x: sprite.x,
          y: sprite.y,
          vx: randomRange(420, 760) * intensity * (fromLeft ? 1 : -1),
          vy: randomRange(-880, -460) * intensity,
          gravity: randomRange(1180, 1620),
          rotationSpeed:
            randomRange(6, 12) * (Math.random() > 0.5 ? 1 : -1),
          drift: randomRange(-30, 30),
          phase: Math.random() * Math.PI * 2,
          scale,
        });
      }
    }
  }
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
