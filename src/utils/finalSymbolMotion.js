export function createFinalSymbolMotion({ app }) {
  let activeTick = null;
  let activeSymbols = [];

  function clear() {
    if (activeTick) {
      app.ticker.remove(activeTick);
      activeTick = null;
    }

    for (const item of activeSymbols) {
      item.sprite.position.set(item.baseX, item.baseY);
      item.sprite.scale.set(item.baseScaleX, item.baseScaleY);
      item.sprite.rotation = item.baseRotation;
      item.sprite.alpha = item.baseAlpha;
    }

    activeSymbols = [];
  }

  function play(symbols = []) {
    clear();
    if (!symbols.length) return;

    const uniqueSymbols = [...new Set(symbols.map((item) => item.sprite))].map(
      (sprite) => symbols.find((item) => item.sprite === sprite),
    );

    activeSymbols = uniqueSymbols.map((symbol, index) => {
      const sprite = symbol.sprite;

      if (!sprite._anchorFixed) {
        sprite._anchorFixed = true;

        const x = sprite.x;
        const y = sprite.y;

        sprite.anchor.set(0.5);
        sprite.x = x + sprite.width / 2;
        sprite.y = y + sprite.height / 2;
      }

      return {
        sprite,
        baseX: sprite.x,
        baseY: sprite.y,
        baseScaleX: sprite.scale.x,
        baseScaleY: sprite.scale.y,
        baseRotation: sprite.rotation,
        baseAlpha: sprite.alpha,
        swayPhase: index * 0.55 + Math.random() * 0.35,
        bobPhase: index * 0.38 + Math.random() * 0.35,
      };
    });

    let elapsed = 0;

    activeTick = () => {
      elapsed += app.ticker.deltaMS / 1000;

      for (const item of activeSymbols) {
        const sway = Math.sin(elapsed * 3.6 + item.swayPhase);
        const bob = Math.cos(elapsed * 4.4 + item.bobPhase);
        const breathe = Math.sin(elapsed * 5.1 + item.swayPhase) * 0.5 + 0.5;

        item.sprite.position.set(
          item.baseX + sway * 3.2,
          item.baseY + bob * 2.4,
        );
        item.sprite.rotation = item.baseRotation + sway * 0.05;
        item.sprite.scale.set(
          item.baseScaleX * (1 + breathe * 0.05),
          item.baseScaleY * (1 + breathe * 0.05),
        );
        item.sprite.alpha = item.baseAlpha;
      }
    };

    app.ticker.add(activeTick);
  }

  return { play, clear };
}
