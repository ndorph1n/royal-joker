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
