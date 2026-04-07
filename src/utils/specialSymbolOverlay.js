import { Container, Sprite } from "pixi.js";

export function createSpecialSymbolOverlay({
  fieldContainer,
  reels,
  visibleHeight,
}) {
  const overlayLayer = new Container({ label: "special symbol overlay" });
  overlayLayer.zIndex = 100;
  fieldContainer.addChild(overlayLayer);

  const clones = new Map();
  let enabled = true;
  let visibleReels = null;

  const sync = () => {
    if (!enabled) {
      hideAll();
      return;
    }

    const activeSprites = new Set();

    for (const [reelIndex, reel] of reels.entries()) {
      if (visibleReels && !visibleReels.has(reelIndex)) continue;

      const visibleTop = reel.y;
      const visibleBottom = reel.y + visibleHeight;
      const visibleSprites = reel.children
        .filter((sprite) => {
          const top = reel.y + sprite.y - sprite.anchor.y * sprite.height;
          const bottom = top + sprite.height;
          return bottom > visibleTop && top < visibleBottom;
        })
        .sort((a, b) => a.y - b.y);

      const edgeSprites = [];
      if (visibleSprites.length > 0) {
        edgeSprites.push(visibleSprites[0]);
      }
      if (visibleSprites.length > 1) {
        edgeSprites.push(visibleSprites[visibleSprites.length - 1]);
      }

      for (const sprite of edgeSprites) {
        let clone = clones.get(sprite);
        if (!clone) {
          clone = new Sprite(sprite.texture);
          clone.eventMode = "none";
          clones.set(sprite, clone);
          overlayLayer.addChild(clone);
        }

        clone.texture = sprite.texture;
        clone.anchor.copyFrom(sprite.anchor);
        clone.position.set(reel.x + sprite.x, reel.y + sprite.y);
        clone.scale.copyFrom(sprite.scale);
        clone.rotation = sprite.rotation;
        clone.alpha = sprite.alpha;
        clone.visible = true;

        activeSprites.add(sprite);
      }
    }

    for (const [sprite, clone] of clones) {
      if (sprite.destroyed || !sprite.parent) {
        overlayLayer.removeChild(clone);
        clone.destroy();
        clones.delete(sprite);
        continue;
      }

      if (!activeSprites.has(sprite)) {
        clone.visible = false;
      }
    }
  };

  const destroy = () => {
    for (const clone of clones.values()) {
      clone.destroy();
    }
    clones.clear();
    overlayLayer.destroy();
  };

  const setEnabled = (value) => {
    enabled = value;
    if (!enabled) {
      hideAll();
      return;
    }

    sync();
  };

  const setVisibleReels = (reelIndexes) => {
    visibleReels =
      Array.isArray(reelIndexes) && reelIndexes.length > 0
        ? new Set(reelIndexes)
        : null;

    if (!enabled) {
      hideAll();
      return;
    }

    sync();
  };

  return { sync, destroy, setEnabled, setVisibleReels };

  function hideAll() {
    for (const clone of clones.values()) {
      clone.visible = false;
    }
  }
}
