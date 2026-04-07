import { AnimatedSprite, Container, Rectangle, Texture } from "pixi.js";

export function createLightningEffect({
  app,
  gameWindow,
  reels,
  textures,
  GAMEFIELD,
  visibleHeight,
  atlasData,
  atlasTexture,
  glowAtlasData,
  glowAtlasTexture,
  finalTargetTexture,
}) {
  const backEffectLayer = new Container({ label: "lightning back effect layer" });
  backEffectLayer.zIndex = 2.5;
  const frontEffectLayer = new Container({
    label: "lightning front effect layer",
  });
  frontEffectLayer.zIndex = 5;

  gameWindow.addChild(backEffectLayer);
  gameWindow.addChild(frontEffectLayer);

  const lightningFrames = buildFrames(atlasData, atlasTexture, "lightning");
  const glowFrames = buildFrames(glowAtlasData, glowAtlasTexture, "glow");
  const lightningAnimationSpeed = 0.35;
  let stopFinalTargetFx = null;
  let stopFinalGlowFx = null;
  const activeFxStops = new Set();

  async function playSequence(indexOrder = [10, 11, 12], targetIndex = 9, options = {}) {
    if (!lightningFrames.length || !glowFrames.length) return;
    clear();

    const { onTargetReady, onBoltStart, onBoltComplete } = options;
    const symbols = getVisibleSymbols({
      reels,
      textures,
      GAMEFIELD,
      visibleHeight,
    });

    const target = symbols.find((item) => item.index === targetIndex);
    if (!target) return;
    onTargetReady?.(target);

    const sources = indexOrder.flatMap((sourceIndex) =>
      symbols.filter((item) => item.index === sourceIndex),
    );
    if (!sources.length) return;

    const stopTargetFx = createPulseFx({
      app,
      layer: backEffectLayer,
      symbol: target,
      scaleBoost: 0.25,
      glowAlpha: 0.72,
      glowScale: 1.75,
      speed: 5.5,
      glowFrames,
      glowAnimationSpeed: 0.2,
    });
    activeFxStops.add(stopTargetFx);

    try {
      for (const [boltIndex, source] of sources.entries()) {
        onBoltStart?.({
          boltIndex,
          source,
          target,
          totalBolts: sources.length,
        });
        await playBolt(source, target);
        onBoltComplete?.({
          boltIndex,
          source,
          target,
          totalBolts: sources.length,
        });
      }
    } finally {
      stopTargetFx();
      activeFxStops.delete(stopTargetFx);
    }

    if (finalTargetTexture) {
      target.sprite.texture = finalTargetTexture;
      stopFinalTargetFx = createFinalTargetFx({
        app,
        symbol: target,
      });
      activeFxStops.add(stopFinalTargetFx);
    }

    const finalGlowSymbols = [target, ...sources];
    stopFinalGlowFx = createPersistentGlowFx({
      app,
      layer: backEffectLayer,
      symbols: finalGlowSymbols,
      glowFrames,
    });
    activeFxStops.add(stopFinalGlowFx);
  }

  function destroy() {
    clear();
    backEffectLayer.destroy({ children: true });
    frontEffectLayer.destroy({ children: true });
  }

  function clear() {
    for (const stopFx of [...activeFxStops]) {
      stopFx();
    }
    activeFxStops.clear();
    stopFinalTargetFx = null;
    stopFinalGlowFx = null;
    backEffectLayer.removeChildren().forEach((child) => child.destroy());
    frontEffectLayer.removeChildren().forEach((child) => child.destroy());
  }

  return { playSequence, destroy, clear };

  function playBolt(source, target) {
    return new Promise((resolve) => {
      const bolt = new AnimatedSprite(lightningFrames);
      const dx = target.point.x - source.point.x;
      const dy = target.point.y - source.point.y;
      const distance = Math.hypot(dx, dy);
      const naturalFrame = lightningFrames[0];
      const naturalWidth = naturalFrame.width || 1;
      const widthScale = 1.15;
      const stopSourceFx = createPulseFx({
        app,
        layer: backEffectLayer,
        symbol: source,
        scaleBoost: 0.1,
        glowAlpha: 0.6,
        glowScale: 1.4,
        speed: 9,
        glowFrames,
        glowAnimationSpeed: 0.2,
      });
      activeFxStops.add(stopSourceFx);

      bolt.anchor.set(0.5);
      bolt.position.set(
        (source.point.x + target.point.x) / 2,
        (source.point.y + target.point.y) / 2,
      );
      bolt.rotation = Math.atan2(dy, dx) + Math.PI / 2;
      bolt.width = naturalWidth * widthScale;
      bolt.height = distance;
      bolt.animationSpeed = lightningAnimationSpeed;
      bolt.loop = false;
      bolt.onComplete = () => {
        stopSourceFx();
        activeFxStops.delete(stopSourceFx);
        frontEffectLayer.removeChild(bolt);
        bolt.destroy();
        resolve();
      };

      frontEffectLayer.addChild(bolt);
      bolt.play();
    });
  }
}

function createFinalTargetFx({ app, symbol }) {
  const base = {
    x: symbol.sprite.x,
    y: symbol.sprite.y,
    width: symbol.sprite.width,
    height: symbol.sprite.height,
    rotation: symbol.sprite.rotation,
    anchorX: symbol.sprite.anchor.x,
    anchorY: symbol.sprite.anchor.y,
  };
  const center = {
    x: symbol.sprite.x + symbol.sprite.width / 2,
    y: symbol.sprite.y + symbol.sprite.height / 2,
  };

  symbol.sprite.anchor.set(0.5);
  symbol.sprite.position.set(center.x, center.y);

  let elapsed = 0;

  const tick = () => {
    elapsed += app.ticker.deltaMS / 1000;
    const pulse = Math.sin(elapsed * 4.6) * 0.5 + 0.5;
    const sway = Math.sin(elapsed * 3.1) * 0.08;
    const scale = 1.16 + pulse * 0.12;

    symbol.sprite.width = base.width * scale;
    symbol.sprite.height = base.height * scale;
    symbol.sprite.position.set(center.x, center.y);
    symbol.sprite.rotation = base.rotation + sway;
  };

  app.ticker.add(tick);

  return () => {
    app.ticker.remove(tick);
    symbol.sprite.anchor.set(base.anchorX, base.anchorY);
    symbol.sprite.width = base.width;
    symbol.sprite.height = base.height;
    symbol.sprite.position.set(base.x, base.y);
    symbol.sprite.rotation = base.rotation;
  };
}

function createPersistentGlowFx({ app, layer, symbols, glowFrames }) {
  const uniqueSymbols = [...new Set(symbols.map((item) => item.sprite))].map(
    (sprite) => symbols.find((item) => item.sprite === sprite),
  );
  const glows = uniqueSymbols.map((symbol) => {
    const glow = new AnimatedSprite(glowFrames);
    glow.anchor.set(0.5);
    glow.animationSpeed = 0.24;
    glow.loop = true;
    glow.play();
    glow.position.set(symbol.point.x, symbol.point.y);
    glow.alpha = symbol.index === 9 ? 0.82 : 0.62;
    layer.addChild(glow);
    layer.setChildIndex(glow, 0);

    return {
      symbol,
      glow,
      baseWidth: symbol.sprite.width,
      baseHeight: symbol.sprite.height,
      baseAlpha: glow.alpha,
      baseScale: symbol.index === 9 ? 1.75 : 1.35,
      speed: symbol.index === 9 ? 3.8 : 4.6,
      phase: symbol.index === 9 ? 0 : Math.PI / 3,
    };
  });

  let elapsed = 0;

  const tick = () => {
    elapsed += app.ticker.deltaMS / 1000;

    for (const item of glows) {
      const pulse = Math.sin(elapsed * item.speed + item.phase) * 0.5 + 0.5;
      const glowScale = item.baseScale + pulse * 0.12;
      const sprite = item.symbol.sprite;

      glowPositionFromSprite(item.glow, item.symbol, sprite);
      item.glow.width = item.baseWidth * 1.15 * glowScale;
      item.glow.height = item.baseHeight * 1.15 * glowScale;
      item.glow.alpha = item.baseAlpha * (0.82 + pulse * 0.18);
    }
  };

  app.ticker.add(tick);

  return () => {
    app.ticker.remove(tick);
    for (const item of glows) {
      layer.removeChild(item.glow);
      item.glow.destroy();
    }
  };
}

function glowPositionFromSprite(glow, symbol, sprite) {
  const centerDx =
    sprite.x +
    sprite.width / 2 -
    (symbol.sprite.x + symbol.sprite.width / 2 - (sprite.x - symbol.sprite.x));
  const centerDy =
    sprite.y +
    sprite.height / 2 -
    (symbol.sprite.y + symbol.sprite.height / 2 - (sprite.y - symbol.sprite.y));

  glow.position.set(
    symbol.point.x + (sprite.x + sprite.width / 2 - (symbol.sprite.x + symbol.sprite.width / 2)),
    symbol.point.y + (sprite.y + sprite.height / 2 - (symbol.sprite.y + symbol.sprite.height / 2)),
  );
}

function buildFrames(atlasData, atlasTexture, animationName) {
  const frameNames =
    atlasData.animations?.[animationName] ?? Object.keys(atlasData.frames);

  return frameNames.map((name) => {
    const frameData = atlasData.frames[name]?.frame;
    return new Texture({
      source: atlasTexture.source,
      frame: new Rectangle(frameData.x, frameData.y, frameData.w, frameData.h),
    });
  });
}

export function getVisibleSymbols({ reels, textures, GAMEFIELD, visibleHeight }) {
  const textureToIndex = new Map(
    textures.map((texture, index) => [texture, index]),
  );
  const visibleTop = GAMEFIELD.startY;
  const visibleBottom = GAMEFIELD.startY + visibleHeight;
  const symbols = [];

  reels.forEach((reel) => {
    reel.children
      .filter((sprite) => {
        const top = reel.y + sprite.y - sprite.anchor.y * sprite.height;
        const bottom = top + sprite.height;
        return bottom > visibleTop && top < visibleBottom;
      })
      .forEach((sprite) => {
        symbols.push({
          sprite,
          index: textureToIndex.get(sprite.texture),
          point: {
            x:
              -GAMEFIELD.width / 2 +
              GAMEFIELD.startX +
              reel.x +
              sprite.x +
              sprite.width / 2,
            y:
              -GAMEFIELD.height / 2 +
              GAMEFIELD.startY +
              reel.y +
              sprite.y +
              sprite.height / 2,
          },
        });
      });
  });

  return symbols;
}

function createPulseFx({
  app,
  layer,
  symbol,
  scaleBoost,
  glowAlpha,
  glowScale,
  speed,
  glowFrames,
  glowAnimationSpeed,
}) {
  const glow = new AnimatedSprite(glowFrames);
  glow.anchor.set(0.5);
  glow.animationSpeed = glowAnimationSpeed;
  glow.loop = true;
  glow.play();
  glow.position.set(symbol.point.x, symbol.point.y);
  glow.alpha = glowAlpha;
  layer.addChild(glow);
  layer.setChildIndex(glow, 0);

  const base = {
    x: symbol.sprite.x,
    y: symbol.sprite.y,
    width: symbol.sprite.width,
    height: symbol.sprite.height,
  };

  let elapsed = 0;

  const tick = () => {
    elapsed += app.ticker.deltaMS / 1000;
    const wave = Math.sin(elapsed * speed) * 0.5 + 0.5;
    const scale = 1 + scaleBoost * (0.55 + wave * 0.45);
    const glowPulse = glowScale + wave * 0.08;
    const centerDx =
      symbol.sprite.x + symbol.sprite.width / 2 - (base.x + base.width / 2);
    const centerDy =
      symbol.sprite.y + symbol.sprite.height / 2 - (base.y + base.height / 2);

    setSpriteScaleAroundCenter(symbol.sprite, base, scale);
    glow.position.set(symbol.point.x + centerDx, symbol.point.y + centerDy);
    glow.width = base.width * 1.15 * glowPulse;
    glow.height = base.height * 1.15 * glowPulse;
    glow.alpha = glowAlpha * (0.8 + wave * 0.35);
  };

  app.ticker.add(tick);

  return () => {
    app.ticker.remove(tick);
    setSpriteScaleAroundCenter(symbol.sprite, base, 1);
    layer.removeChild(glow);
    glow.destroy();
  };
}

function setSpriteScaleAroundCenter(sprite, base, scale) {
  const width = base.width * scale;
  const height = base.height * scale;

  sprite.width = width;
  sprite.height = height;
  sprite.x = base.x - (width - base.width) / 2;
  sprite.y = base.y - (height - base.height) / 2;
}
