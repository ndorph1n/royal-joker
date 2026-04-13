import { AnimatedSprite, Container, Rectangle, Texture } from "pixi.js";

export function createWinningFireEffect({
  gameWindow,
  atlasData,
  atlasTexture,
}) {
  const horizontalOffsetFactor = 0.04;
  const fireLayer = new Container({ label: "winning fire layer" });
  fireLayer.zIndex = 2.8;
  fireLayer.eventMode = "none";
  gameWindow.addChild(fireLayer);

  const fireFrames = buildFrames(atlasData, atlasTexture, "fire");

  function show(symbols = []) {
    clear();
    if (!fireFrames.length || !symbols.length) return;

    const uniqueSymbols = [...new Set(symbols.map((item) => item.sprite))].map(
      (sprite) => symbols.find((item) => item.sprite === sprite),
    );

    uniqueSymbols.forEach((symbol) => {
      const fire = new AnimatedSprite(fireFrames);
      fire.anchor.set(0.5, 1);
      fire.animationSpeed = 0.28;
      fire.loop = true;
      fire.position.set(
        symbol.point.x + symbol.sprite.width * horizontalOffsetFactor,
        symbol.point.y + symbol.sprite.height * 0.56,
      );
      fire.width = symbol.sprite.width;
      fire.height = symbol.sprite.height;
      fire.alpha = 0.95;
      fireLayer.addChild(fire);
      fire.play();
    });
  }

  function clear() {
    fireLayer.removeChildren().forEach((child) => child.destroy());
  }

  function destroy() {
    clear();
    fireLayer.destroy({ children: true });
  }

  return { show, clear, destroy };
}

function buildFrames(atlasData, atlasTexture, animationName) {
  const frameNames =
    atlasData.animations?.[animationName] ??
    Object.keys(atlasData.frames ?? {});

  return frameNames
    .map((name) => {
      const frameData = atlasData.frames?.[name]?.frame;
      if (!frameData) return null;

      return new Texture({
        source: atlasTexture.source,
        frame: new Rectangle(
          frameData.x,
          frameData.y,
          frameData.w,
          frameData.h,
        ),
      });
    })
    .filter(Boolean);
}
