import { AnimatedSprite, Container, Rectangle, Texture } from "pixi.js";

export function createFinalGlowEffect({
  gameWindow,
  atlasData,
  atlasTexture,
}) {
  const glowLayer = new Container({ label: "final glow layer" });
  glowLayer.zIndex = 2.9;
  gameWindow.addChild(glowLayer);

  const glowFrames = buildFrames(atlasData, atlasTexture, "glow");

  function clear() {
    glowLayer.removeChildren().forEach((child) => child.destroy());
  }

  function destroy() {
    clear();
    glowLayer.destroy({ children: true });
  }

  function show(symbols = []) {
    clear();
    if (!glowFrames.length || !symbols.length) return;

    const uniqueSymbols = [...new Set(symbols.map((item) => item.sprite))].map(
      (sprite) => symbols.find((item) => item.sprite === sprite),
    );

    uniqueSymbols.forEach((symbol) => {
      const glow = new AnimatedSprite(glowFrames);
      glow.anchor.set(0.5);
      glow.animationSpeed = 0.22;
      glow.loop = true;
      glow.position.set(symbol.point.x, symbol.point.y);
      glow.width = symbol.sprite.width * 1.35;
      glow.height = symbol.sprite.height * 1.35;
      glow.alpha = 0.9;
      glow.blendMode = "screen";
      glowLayer.addChild(glow);
      glow.play();
    });
  }

  return { show, clear, destroy };
}

function buildFrames(atlasData, atlasTexture, animationName) {
  const frameNames =
    atlasData.animations?.[animationName] ?? Object.keys(atlasData.frames ?? {});

  return frameNames
    .map((name) => {
      const frameData = atlasData.frames?.[name]?.frame;
      if (!frameData) return null;

      return new Texture({
        source: atlasTexture.source,
        frame: new Rectangle(frameData.x, frameData.y, frameData.w, frameData.h),
      });
    })
    .filter(Boolean);
}
