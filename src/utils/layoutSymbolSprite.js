export const SPECIAL_SYMBOL_START_INDEX = 9;
const SPECIAL_SYMBOL_SCALE = 1.25;

export function markSpecialTextures(textures) {
  textures.forEach((texture, index) => {
    texture.__isSpecialSymbol = index >= SPECIAL_SYMBOL_START_INDEX;
  });
}

export function isSpecialTexture(texture) {
  return Boolean(texture?.__isSpecialSymbol);
}

export function layoutSymbolSprite(sprite, GAMEFIELD, cellTopY) {
  if (!isSpecialTexture(sprite.texture)) {
    sprite.width = GAMEFIELD.slotW;
    sprite.height = GAMEFIELD.slotH;
    sprite.x = 0;
    sprite.y = cellTopY;
    return;
  }

  const textureWidth = sprite.texture.width || GAMEFIELD.slotW;
  const textureHeight = sprite.texture.height || GAMEFIELD.slotH;
  const scale =
    Math.min(GAMEFIELD.slotW / textureWidth, GAMEFIELD.slotH / textureHeight) *
    SPECIAL_SYMBOL_SCALE;

  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
  sprite.x = (GAMEFIELD.slotW - sprite.width) / 2;
  sprite.y = cellTopY + (GAMEFIELD.slotH - sprite.height) / 2;
}
