import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";

import bgImg from "../assets/bg.png";
import gameFieldBgImg from "../assets/rj/field.png";
import chickenDecorImg from "../assets/chicken-dec.png";
import lightningAtlas from "../assets/lightning.json";
import lightningImg from "../assets/lightning.png";
import glowAtlas from "../assets/glow/glow.json";
import glowImg from "../assets/glow/glow.png";
import finalSpecialImg from "../assets/icons/10-1.png";
import bigWinImg from "../assets/big-win.png";
import pointImg from "../assets/point.png";

import { GAMEFIELD } from "./utils/parameters";
import { getCoverScale } from "./utils/screenCover";
import { createBigWinOverlay } from "./utils/bigWinOverlay";
import { createSpinner } from "./utils/spin";
import { initGameField } from "./utils/initGameField";
import {
  createLightningEffect,
  getVisibleSymbols,
} from "./utils/lightningEffect";
import { createSpecialSymbolOverlay } from "./utils/specialSymbolOverlay";
import { wobble } from "./utils/wobble";
import { SOUNDS } from "./utils/sounds";
import {
  TEXT,
  formatCurrency,
  formatFreeSpins,
  formatMultiplier,
} from "./utils/textContent";

(async () => {
  const pixiContainer = document.getElementById("pixi-container");
  const cashoutModal = document.getElementById("cashout-modal");
  const greeting = document.querySelector(".greeting");
  const greetingTitle = document.querySelector(".greeting__title");
  const greetingButton = document.querySelector(".greeting__button");
  const greetingButtonText = document.querySelector(".greeting__button-text");
  const spinButton = document.querySelector(".spin");
  const modalTitle = document.querySelector(".modal__title");
  const modalButton = document.querySelector(".modal__button");
  const controls = document.querySelector(".controls");
  const balanceLabel = document.querySelector(".balance__label");
  const balanceAmount = document.querySelector(".balance__amount");
  const freeSpinsAmount = document.querySelector(".balance__fs");
  const winLabel = document.querySelector(".win");
  const winAmount = document.querySelector(".win__amount");
  const betLabel = document.querySelector(".bet__label");
  const betAmount = document.querySelector(".bet__amount");
  const app = new Application();

  let spinCount = 0;
  let gameStarted = false;
  let soundEnabled = false;
  const symbolTextEntries = new Set();

  applyStaticTexts();

  const counters = {
    balance: createAnimatedValue(0, (value) => {
      if (balanceAmount) {
        balanceAmount.textContent = formatCurrency(value);
      }
    }),
    freeSpins: createAnimatedValue(0, (value) => {
      if (freeSpinsAmount) {
        freeSpinsAmount.textContent = formatFreeSpins(value);
      }
    }),
    win: createAnimatedValue(0, (value) => {
      if (winAmount) {
        winAmount.textContent = formatCurrency(value);
      }
    }),
  };

  let resultIdx = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  await app.init({
    background: "#000000",
    resizeTo: pixiContainer,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  pixiContainer.appendChild(app.canvas);

  const bgTexture = await Assets.load(bgImg);
  const gameFieldBgTexture = await Assets.load(gameFieldBgImg);
  const lightningTexture = await Assets.load(lightningImg);
  const glowTexture = await Assets.load(glowImg);
  const finalSpecialTexture = await Assets.load(finalSpecialImg);
  const bigWinTexture = await Assets.load(bigWinImg);
  const pointTexture = await Assets.load(pointImg);
  const chickenDecorTexture = await Assets.load(chickenDecorImg);

  const chickenDecor = new Sprite({
    label: "chicken decor image",
    texture: chickenDecorTexture,
    anchor: { x: 0.5, y: 1 },
  });
  chickenDecor.zIndex = 2.1;

  const bg = new Sprite({
    label: "background image",
    texture: bgTexture,
    anchor: 0.5,
  });

  const scene = new Container({ label: "scene root" });
  scene.sortableChildren = true;

  const gameFieldBg = new Sprite({
    label: "game field background image",
    texture: gameFieldBgTexture,
    anchor: 0.5,
    width: GAMEFIELD.width,
    height: GAMEFIELD.height,
    zIndex: 2,
  });

  const cashOutButton = new Container({
    label: "cash out button",
    eventMode: "none",
  });
  cashOutButton.zIndex = 4;
  cashOutButton.on("pointertap", () => {
    if (cashOutButton.eventMode !== "static") return;
    SOUNDS.cheers.currentTime = 0;
    SOUNDS.cheers.play();
    cashoutModal?.removeAttribute("hidden");
  });

  const cashOutBg = new Graphics();
  cashOutBg
    .roundRect(0, 0, 170, 56, 14)
    .fill({ color: 0x7b7f86, alpha: 0.9 })
    .stroke({ color: 0xaeb3ba, width: 2, alpha: 0.5 });

  const cashOutText = new Text({
    text: TEXT.game.cashOut,
    style: new TextStyle({
      fill: 0xe4e7eb,
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "700",
    }),
    anchor: 0.5,
  });

  cashOutText.position.set(cashOutBg.width / 2, 28);
  cashOutButton.alpha = 0.75;
  cashOutButton.addChild(cashOutBg, cashOutText);

  chickenDecor.width = gameFieldBg.width * 0.65;
  chickenDecor.height = gameFieldBg.height * 0.4;
  chickenDecor.position.set(0, -gameFieldBg.height / 2 + 20);
  cashOutButton.position.set(-75, gameFieldBg.height / 2 + 18);

  const gameWindow = new Container({
    label: "game window",
  });
  gameWindow.sortableChildren = true;

  const symbolTextLayer = new Container({ label: "symbol text layer" });
  symbolTextLayer.zIndex = 6;

  app.stage.addChild(bg, scene);
  scene.addChild(gameWindow);
  gameWindow.addChild(
    gameFieldBg,
    chickenDecor,
    cashOutButton,
    symbolTextLayer,
  );

  const updateLayout = () => {
    const { width, height } = app.screen;
    bg.position.set(width / 2, height / 2);

    const bgScale = getCoverScale(
      bgTexture.width,
      bgTexture.height,
      width,
      height,
    );
    bg.scale.set(bgScale);

    const controlsHeight = controls?.getBoundingClientRect().height ?? 0;
    const horizontalPadding = width < 680 ? 16 : 32;
    const topPadding = width < 680 ? 20 : 28;
    const bottomPadding = controlsHeight + (width < 680 ? 16 : 28);
    const layoutBounds = getSceneLayoutBounds(gameWindow);
    const availableWidth = Math.max(1, width - horizontalPadding * 2);
    const availableHeight = Math.max(1, height - topPadding - bottomPadding);
    const gameScale = Math.min(
      availableWidth / layoutBounds.width,
      availableHeight / layoutBounds.height,
    );
    const boundsCenterX = layoutBounds.x + layoutBounds.width / 2;
    const boundsCenterY = layoutBounds.y + layoutBounds.height / 2;

    scene.scale.set(gameScale);
    scene.position.set(
      width / 2 - boundsCenterX * gameScale,
      topPadding + availableHeight / 2 - boundsCenterY * gameScale,
    );
  };

  app.renderer.on("resize", updateLayout);
  updateLayout();

  const { fieldContainer, reels, textures, step, visibleHeight } =
    await initGameField();

  fieldContainer.zIndex = 3;
  fieldContainer.position.set(
    -GAMEFIELD.width / 2 + GAMEFIELD.startX,
    -GAMEFIELD.height / 2,
  );

  gameWindow.addChild(fieldContainer);
  updateLayout();

  const specialSymbolOverlay = createSpecialSymbolOverlay({
    fieldContainer,
    reels,
    visibleHeight,
  });
  app.ticker.add(specialSymbolOverlay.sync);

  const spinner = createSpinner({
    app,
    reels,
    textures,
    GAMEFIELD,
    step,
    visibleHeight,
  });

  const lightningEffect = createLightningEffect({
    app,
    gameWindow,
    reels,
    textures,
    GAMEFIELD,
    visibleHeight,
    atlasData: lightningAtlas,
    atlasTexture: lightningTexture,
    glowAtlasData: glowAtlas,
    glowAtlasTexture: glowTexture,
    finalTargetTexture: finalSpecialTexture,
  });

  const bigWinOverlay = createBigWinOverlay({
    app,
    scene,
    cashOutButton,
    cashOutBg,
    cashOutText,
    bigWinTexture,
    pointTexture,
  });

  window.addEventListener("click", () => {
    if (!soundEnabled) {
      SOUNDS.theme.play();
      SOUNDS.theme.loop = true;
      soundEnabled = true;
    }
  });

  spinButton?.addEventListener("click", async () => {
    if (!gameStarted) return;
    if (spinner.isSpinning()) return;
    if (spinCount >= 4) return;
    if (counters.freeSpins.target <= 0) return;

    SOUNDS.click.currentTime = 0;
    SOUNDS.click.play();

    spinButton.disabled = true;

    SOUNDS.spinning.currentTime = 0;
    SOUNDS.spinning.play();

    counters.win.animateTo(0, { duration: 220 });
    counters.freeSpins.animateTo(counters.freeSpins.target - 1, {
      duration: 320,
    });

    clearSymbolTexts();
    bigWinOverlay.clear();
    lightningEffect.clear();
    specialSymbolOverlay.setEnabled(false);
    specialSymbolOverlay.setVisibleReels([]);
    const settledReels = [];

    switch (spinCount) {
      case 0:
        resultIdx = [
          [7, 0, 3],
          [7, 2, 1],
          [7, 0, 3],
        ];
        break;

      case 1:
        resultIdx = [
          [7, 4, 5],
          [1, 2, 1],
          [6, 3, 3],
        ];
        break;

      case 2:
        resultIdx = [
          [1, 1, 3],
          [4, 2, 5],
          [3, 8, 0],
        ];
        break;

      case 3:
        resultIdx = [
          [0, 10, 11],
          [9, 2, 1],
          [12, 0, 11],
        ];
        break;
    }

    const resultTextures = resultIdx.map((col) => col.map((i) => textures[i]));

    await spinner.spin(resultTextures, {
      runTime: 720,
      stopGap: 370,
      maxSpeed: 2500,
      decelTime: 450,
      snapTime: 100,
      decelExtraSteps: 0,
      onReelStop: () => {},
      onReelSettled: (col) => {
        if (!settledReels.includes(col)) {
          settledReels.push(col);
        }

        specialSymbolOverlay.setVisibleReels(settledReels);
        specialSymbolOverlay.setEnabled(true);
      },
    });

    let stopWobble = null;

    if (spinCount === 0) {
      SOUNDS.win.currentTime = 0;
      SOUNDS.win.play();

      const plumSymbols = getVisibleSymbols({
        reels,
        textures,
        GAMEFIELD,
        visibleHeight,
      })
        .filter((item) => item.index === 7)
        .sort((a, b) => a.point.x - b.point.x);

      const middlePlum = plumSymbols[Math.floor(plumSymbols.length / 2)];
      if (middlePlum) {
        showSymbolText({
          id: "first-spin-plum",
          text: TEXT.game.firstSpinSymbolWin,
          symbol: middlePlum,
          style: getSymbolTextStyle({
            fontSize: 34,
            fill: 0xfff1b5,
            strokeColor: 0x6f2f00,
            strokeWidth: 6,
          }),
          yOffset: -40,
          duration: 1000,
        });
      }

      counters.balance.animateTo(
        counters.balance.target + TEXT.game.firstSpinWin,
        {
          duration: 850,
        },
      );
      counters.win.animateTo(TEXT.game.firstSpinWin, {
        duration: 850,
      });
    }

    if (spinCount === 1 || spinCount === 2) {
      counters.win.animateTo(0, {
        duration: 450,
      });
    }

    if (spinCount === 3) {
      SOUNDS.win.currentTime = 0;
      SOUNDS.win.play();

      let multiplierValue = 0;

      SOUNDS.megaWin.currentTime = 0;
      SOUNDS.megaWin.play();

      await lightningEffect.playSequence([10, 11, 12], 9, {
        onTargetReady: (target) => {
          showSymbolText({
            id: "final-multiplier",
            text: "",
            symbol: target,
            style: getSymbolTextStyle({
              fontSize: 32,
              fill: 0xfff1b5,
              strokeColor: 0x6f2f00,
              strokeWidth: 6,
            }),
            yOffset: -60,
            persistent: true,
          });
        },
        onBoltStart: ({ boltIndex, target }) => {
          multiplierValue += TEXT.game.finalMultiplierSteps[boltIndex] ?? 0;
          updateSymbolText(
            "final-multiplier",
            formatMultiplier(multiplierValue),
            target,
          );
        },
      });

      bigWinOverlay.schedule(TEXT.game.bigWinAmount);
      counters.win.animateTo(TEXT.game.finalSpinWin, {
        duration: 1400,
      });
      counters.balance.animateTo(
        counters.balance.target + TEXT.game.finalSpinWin,
        {
          duration: 1400,
        },
      );
    }

    stopWobble?.();
    stopWobble = wobble(app, reels, textures, GAMEFIELD, visibleHeight);
    specialSymbolOverlay.setVisibleReels(reels.map((_, index) => index));
    specialSymbolOverlay.setEnabled(true);

    setTimeout(
      () => {
        stopWobble?.();
        stopWobble = null;

        if (spinCount < 4 && counters.freeSpins.target > 0) {
          spinButton.disabled = false;
        }
      },
      spinCount === 0 || spinCount === 3 ? 1000 : 200,
    );

    spinCount++;
  });

  greetingButton?.addEventListener("click", () => {
    if (gameStarted) return;
    gameStarted = true;

    SOUNDS.click.currentTime = 0.05;
    SOUNDS.click.volume = 0.5;
    SOUNDS.click.play();

    counters.balance.animateTo(TEXT.game.startBalance, { duration: 1500 });
    counters.freeSpins.animateTo(TEXT.game.startFs, { duration: 1500 });

    greeting?.classList.add("hidden");
    setTimeout(() => {
      greeting?.remove();
    }, 200);
  });

  modalButton?.addEventListener("click", () => {
    FbPlayableAd.onCTAClick();
  });

  function showSymbolText({
    id,
    text,
    symbol,
    style,
    yOffset = 0,
    duration = 0,
    persistent = false,
  }) {
    removeSymbolText(id);

    const label = new Text({
      text,
      style,
      anchor: 0.5,
    });

    label.alpha = 0;
    label.scale.set(0.84);
    setSymbolTextPosition(label, symbol, yOffset);
    symbolTextLayer.addChild(label);

    const entry = {
      id,
      label,
      symbol,
      yOffset,
      timeoutId: null,
      tick: null,
    };

    let elapsed = 0;
    entry.tick = () => {
      elapsed += app.ticker.deltaMS;
      const progress = Math.min(1, elapsed / 220);
      const eased = easeOutCubic(progress);

      setSymbolTextPosition(label, entry.symbol, entry.yOffset);
      label.alpha = eased;
      label.scale.set(0.84 + eased * 0.16);
    };

    app.ticker.add(entry.tick);

    if (!persistent && duration > 0) {
      entry.timeoutId = setTimeout(() => {
        removeSymbolText(id);
      }, duration);
    }

    symbolTextEntries.add(entry);
  }

  function updateSymbolText(id, text, symbol) {
    const entry = [...symbolTextEntries].find((item) => item.id === id);
    if (!entry) return;

    entry.label.text = text;
    entry.symbol = symbol ?? entry.symbol;
    setSymbolTextPosition(entry.label, entry.symbol, entry.yOffset);
  }

  function clearSymbolTexts() {
    for (const entry of [...symbolTextEntries]) {
      removeSymbolText(entry.id);
    }
  }

  function removeSymbolText(id) {
    const entry = [...symbolTextEntries].find((item) => item.id === id);
    if (!entry) return;

    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }
    if (entry.tick) {
      app.ticker.remove(entry.tick);
    }

    symbolTextLayer.removeChild(entry.label);
    entry.label.destroy();
    symbolTextEntries.delete(entry);
  }

  function setSymbolTextPosition(label, symbol, yOffset) {
    label.position.set(
      symbol.point.x,
      symbol.point.y - symbol.sprite.height / 2 - yOffset,
    );
  }

  function applyStaticTexts() {
    if (greetingTitle) {
      greetingTitle.innerHTML = TEXT.greeting.titleHtml;
    }
    if (greetingButton) {
      greetingButtonText.textContent = TEXT.greeting.playButton;
    }
    if (modalTitle) {
      modalTitle.textContent = TEXT.modal.title;
    }
    if (modalButton) {
      modalButton.textContent = TEXT.modal.ctaButton;
    }
    if (balanceLabel) {
      setLeadingText(balanceLabel, `${TEXT.controls.balanceLabel} `);
    }
    if (winLabel) {
      setLeadingText(winLabel, `${TEXT.controls.winLabel} `);
    }
    if (betLabel) {
      setLeadingText(betLabel, `${TEXT.controls.betLabel} `);
    }
    if (betAmount) {
      betAmount.textContent = formatCurrency(TEXT.controls.initialBet);
    }
  }

  function setLeadingText(element, nextText) {
    const textNode = [...element.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE,
    );

    if (textNode) {
      textNode.textContent = nextText;
      return;
    }

    element.prepend(document.createTextNode(nextText));
  }
})();

function createAnimatedValue(initialValue, onUpdate) {
  let value = initialValue;
  let target = initialValue;
  let frameId = null;

  onUpdate(value);

  return {
    get target() {
      return target;
    },
    animateTo(nextValue, options = {}) {
      const startValue = value;
      const targetValue = nextValue;
      const duration = options.duration ?? 900;
      const startTime = performance.now();

      target = targetValue;

      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        value = lerp(startValue, targetValue, easeOutCubic(progress));
        onUpdate(value);

        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
          return;
        }

        value = targetValue;
        frameId = null;
        onUpdate(value);
      };

      frameId = requestAnimationFrame(tick);
    },
  };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getSceneLayoutBounds(container) {
  const bounds = container.getLocalBounds();

  if (bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  return {
    x: -GAMEFIELD.width / 2,
    y: -GAMEFIELD.height / 2,
    width: GAMEFIELD.width,
    height: GAMEFIELD.height + 74,
  };
}

function getSymbolTextStyle({ fontSize, fill, strokeColor, strokeWidth }) {
  return new TextStyle({
    fill,
    fontFamily: "Arial",
    fontSize,
    fontWeight: "700",
    stroke: { color: strokeColor, width: strokeWidth, join: "round" },
  });
}
