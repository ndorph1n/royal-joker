import { Assets, Container, Sprite, Texture } from "pixi.js";
import a from "../../assets/icons/1.png";
import b from "../../assets/icons/2.png";
import c from "../../assets/icons/3.png";
import d from "../../assets/icons/4.png";
import e from "../../assets/icons/5.png";
import f from "../../assets/icons/6.png";
import g from "../../assets/icons/7.png";
import h from "../../assets/icons/8.png";
import i from "../../assets/icons/9.png";
import k from "../../assets/icons/10.png";
import l from "../../assets/icons/11.png";
import m from "../../assets/icons/12.png";
import n from "../../assets/icons/13.png";
// import o from "../../assets/icons/14.png";

import { GAMEFIELD } from "./parameters";
import {
  layoutSymbolSprite,
  markSpecialTextures,
  isSpecialTexture,
} from "./layoutSymbolSprite";

export async function initGameField() {
  const images = [a, b, c, d, e, f, g, h, i, k, l, m, n];

  const textures = await Promise.all(images.map((img) => Assets.load(img)));
  markSpecialTextures(textures);

  const fieldContainer = new Container({ label: "slot field" });
  fieldContainer.sortableChildren = true;
  const regularTextures = textures.filter((texture) => !isSpecialTexture(texture));

  const randomSprite = () =>
    regularTextures[Math.floor(Math.random() * regularTextures.length)];

  const reels = [];

  const step = GAMEFIELD.slotH + GAMEFIELD.rowGap;
  const visibleHeight =
    GAMEFIELD.rows * GAMEFIELD.slotH + (GAMEFIELD.rows - 1) * GAMEFIELD.rowGap;

  for (let col = 0; col < GAMEFIELD.cols; col++) {
    const reel = new Container();

    reel.x = GAMEFIELD.startX + col * (GAMEFIELD.slotW + GAMEFIELD.colGap);
    reel.y = GAMEFIELD.startY;

    const mask = new Sprite(Texture.WHITE);
    mask.width = GAMEFIELD.slotW + 20;
    mask.height =
      GAMEFIELD.rows * GAMEFIELD.slotH +
      (GAMEFIELD.rows - 1) * GAMEFIELD.rowGap +
      20;
    mask.x = reel.x - 10;
    mask.y = reel.y - 10;
    fieldContainer.addChild(mask);
    reel.mask = mask;

    for (let row = 0; row < GAMEFIELD.rows + 1; row++) {
      const s = new Sprite(randomSprite());
      layoutSymbolSprite(s, GAMEFIELD, row * step);
      reel.addChild(s);
    }
    reels.push(reel);
    fieldContainer.addChild(reel);
  }
  return { fieldContainer, reels, textures, step, visibleHeight };
}
