import {
  Application,
  Assets,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";

import bgImg from "../assets/bg.png";
import gameFieldBgImg from "../assets/rj/field.png";
import coinsDecorBackImg from "../assets/rj/coin-decor.png";
import coinsDecorFrontImg from "../assets/rj/coin-decor-f.png";
import coinDecorImg from "../assets/rj/coin-decor-c.png";
import glowAtlas from "../assets/glow/glow.json";
import glowImg from "../assets/glow/glow.png";
import bigWinImg from "../assets/big-win.png";
import royalJokerSign from "../assets/rj/royal-joker.png";

import { GAMEFIELD } from "./utils/parameters";
import { getCoverScale } from "./utils/screenCover";
import { createBigWinOverlay } from "./utils/bigWinOverlay";
import { createCoinConfetti } from "./utils/coinConfetti";
import { createFinalFieldShake } from "./utils/finalFieldShake";
import { createFinalGlowEffect } from "./utils/finalGlowEffect";
import { createFinalSymbolMotion } from "./utils/finalSymbolMotion";
import { createSpinner } from "./utils/spin";
import { initGameField } from "./utils/initGameField";
import { createSpecialSymbolOverlay } from "./utils/specialSymbolOverlay";
import { getVisibleSymbols } from "./utils/visibleSymbols";
import { findWinCells, wobble } from "./utils/wobble";
import { SOUNDS } from "./utils/sounds";
import { TEXT, formatCurrency } from "./utils/textContent";

(async () => {
  const pixiContainer = document.getElementById("pixi-container");
  const cashoutModal = document.getElementById("cashout-modal");
  const greeting = document.querySelector(".greeting");
  const greetingTitle = document.querySelector(".greeting__title");
  const greetingButton = document.querySelector(".greeting__button");
  const greetingButtonText = document.querySelector(".greeting__button-text");
  const spinButton = document.querySelector(".spin");
  const balanceIntro = document.querySelector(".balance-intro");
  const betUpgrade = document.querySelector(".bet-upgrade");
  const betUpgradeMessage = document.querySelector(".bet-upgrade__message");
  const betUpgradePointer = document.querySelector(".bet-upgrade__pointer");
  const modalTitle = document.querySelector(".modal__title");
  const modalButton = document.querySelector(".modal__button");
  const controls = document.querySelector(".controls");
  const balanceLabel = document.querySelector(".balance__label");
  const balanceAmount = document.querySelector(".balance__amount");
  const winLabel = document.querySelector(".win");
  const winAmount = document.querySelector(".win__amount");
  const bet = document.querySelector(".bet");
  const betLabel = document.querySelector(".bet__label");
  const betAmount = document.querySelector(".bet__amount");
  const app = new Application();

  let spinCount = 0;
  let currentBet = TEXT.controls.initialBet;
  let betUpgradePending = false;
  let gameStarted = false;
  let soundEnabled = false;
  let finalModalTimeout = null;
  const symbolTextEntries = new Set();

  applyStaticTexts();

  const counters = {
    balance: createAnimatedValue(0, (value) => {
      if (balanceAmount) {
        balanceAmount.textContent = formatCurrency(value);
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
  const glowTexture = await Assets.load(glowImg);
  const bigWinTexture = await Assets.load(bigWinImg);
  const coinsBackDecorTexture = await Assets.load(coinsDecorBackImg);
  const coinsFrontDecorTexture = await Assets.load(coinsDecorFrontImg);
  const coinDecorTexture = await Assets.load(coinDecorImg);
  const royalJokerSignTexture = await Assets.load(royalJokerSign);

  const coinsDecoreContainer = new Container({
    label: "coins decor container",
    zIndex: 20,
  });

  const coinsBackDecor = new Sprite({
    label: "coins decor image",
    texture: coinsBackDecorTexture,
    anchor: { x: 0.5, y: 1 },
    zIndex: 2,
  });

  const coinsFrontDecor = new Sprite({
    label: "coins front decor image",
    texture: coinsFrontDecorTexture,
    anchor: { x: 0.5, y: 1 },
    zIndex: 4,
  });

  const coinDecor = new Sprite({
    label: "coin decor image",
    texture: coinDecorTexture,
    anchor: { x: 0.5, y: 0.5 },
    zIndex: 3,
  });

  const royalJoker = new Sprite({
    label: "royal joker sign",
    texture: royalJokerSignTexture,
    anchor: { x: 0.5, y: 0.5 },
    zIndex: 5,
  });

  coinsDecoreContainer.addChild(
    coinsBackDecor,
    coinsFrontDecor,
    coinDecor,
    royalJoker,
  );

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

  const fieldVignetteLayer = new Container({
    label: "field vignette layer",
    zIndex: 3.2,
  });

  buildFieldVignettes(fieldVignetteLayer, gameFieldBg);

  coinsBackDecor.width = gameFieldBg.width * 0.75;
  coinsBackDecor.height = gameFieldBg.height * 0.2;
  coinsBackDecor.position.set(0, -gameFieldBg.height / 2);
  coinsFrontDecor.width = gameFieldBg.width * 0.75;
  coinsFrontDecor.height = gameFieldBg.height * 0.13;
  coinsFrontDecor.position.set(0, -gameFieldBg.height / 2 + 2);
  coinDecor.width = 110;
  coinDecor.height = 110;
  coinDecor.position.set(0, -gameFieldBg.height / 2 - 80);
  royalJoker.width = gameFieldBg.width * 0.65;
  royalJoker.height = gameFieldBg.height * 0.125;
  royalJoker.position.set(0, -gameFieldBg.height / 2 - 10);

  const coinDecorBaseY = coinDecor.y;
  const coinDecorBaseScaleX = coinDecor.scale.x;
  const coinDecorBaseScaleY = coinDecor.scale.y;
  const coinDecorBounceHeight = 50;
  const coinDecorBounceDuration = 1200;
  const coinDecorPauseDuration = 4000;
  const coinDecorCycleDuration =
    coinDecorBounceDuration + coinDecorPauseDuration;
  const coinDecorSpinWindow = 0.45;
  let coinDecorElapsed = 0;

  app.ticker.add(({ deltaMS }) => {
    coinDecorElapsed = (coinDecorElapsed + deltaMS) % coinDecorCycleDuration;

    if (coinDecorElapsed > coinDecorBounceDuration) {
      coinDecor.y = coinDecorBaseY;
      coinDecor.scale.set(coinDecorBaseScaleX, coinDecorBaseScaleY);
      return;
    }

    const progress = coinDecorElapsed / coinDecorBounceDuration;
    const bounceProgress = Math.sin(progress * Math.PI);
    const apexDistance = Math.abs(progress - 0.5);
    const spinProgress = Math.max(0, 1 - apexDistance / coinDecorSpinWindow);

    coinDecor.y = coinDecorBaseY - bounceProgress * coinDecorBounceHeight;
    coinDecor.scale.y = coinDecorBaseScaleY;

    if (spinProgress > 0) {
      coinDecor.scale.x =
        coinDecorBaseScaleX *
        Math.max(0.08, Math.abs(Math.cos(spinProgress * Math.PI * 2)));
    } else {
      coinDecor.scale.x = coinDecorBaseScaleX;
    }
  });

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
    fieldVignetteLayer,
    coinsDecoreContainer,
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
    const topPadding = width < 680 ? 120 : 100;
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

  const coinConfetti = createCoinConfetti({
    app,
    gameWindow,
    coinTexture: coinDecorTexture,
  });
  const finalFieldShake = createFinalFieldShake({
    app,
    target: gameWindow,
  });
  const finalGlowEffect = createFinalGlowEffect({
    gameWindow,
    atlasData: glowAtlas,
    atlasTexture: glowTexture,
  });
  const finalSymbolMotion = createFinalSymbolMotion({ app });

  const bigWinOverlay = createBigWinOverlay({
    app,
    scene,
    bigWinTexture,
  });

  window.addEventListener("click", () => {
    if (!soundEnabled) {
      SOUNDS.theme.play();
      SOUNDS.theme.loop = true;
      soundEnabled = true;
    }
  });

  spinButton?.addEventListener("click", async () => {
    spinButton.classList.remove("spin--glow");

    if (!gameStarted) return;
    if (betUpgradePending) return;
    if (spinner.isSpinning()) return;
    if (spinCount >= 4) return;
    if (counters.balance.target < currentBet) return;

    const currentSpinIndex = spinCount;

    SOUNDS.click.currentTime = 0;
    SOUNDS.click.play();

    spinButton.disabled = true;

    SOUNDS.spinning.currentTime = 0;
    SOUNDS.spinning.play();

    counters.balance.animateTo(counters.balance.target - currentBet, {
      duration: 320,
    });
    counters.win.animateTo(0, {
      duration: 320,
    });

    clearSymbolTexts();
    bigWinOverlay.clear();
    coinConfetti.clear();
    finalFieldShake.clear();
    finalGlowEffect.clear();
    finalSymbolMotion.clear();
    hideFinalModal();
    specialSymbolOverlay.setEnabled(false);
    specialSymbolOverlay.setVisibleReels([]);
    const settledReels = [];

    switch (currentSpinIndex) {
      case 0:
        resultIdx = [
          [1, 3, 3],
          [7, 3, 1],
          [3, 0, 6],
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
          [1, 1, 0],
          [4, 2, 0],
          [3, 8, 0],
        ];
        break;

      case 3:
        resultIdx = [
          [2, 9, 4],
          [2, 9, 4],
          [2, 9, 4],
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

    if (currentSpinIndex === 0) {
      SOUNDS.win.currentTime = 0;
      SOUNDS.win.play();

      const winningCenterSymbol = getWinningCenterSymbol(
        getVisibleSymbolsByWinCells({
          symbols: getVisibleSymbols({
            reels,
            textures,
            GAMEFIELD,
            visibleHeight,
          }),
          winCells: findWinCells(resultIdx, GAMEFIELD.cols, GAMEFIELD.rows),
        }),
      );

      if (winningCenterSymbol) {
        showSymbolText({
          id: "first-spin-win",
          text: TEXT.game.firstSpinSymbolWin,
          symbol: winningCenterSymbol,
          style: getSymbolTextStyle({
            fontSize: 34,
            fill: 0xfff1b5,
            strokeColor: 0x6f2f00,
            strokeWidth: 6,
          }),
          yOffset: -15,
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

    if (currentSpinIndex === 1 || currentSpinIndex === 2) {
      counters.win.animateTo(0, {
        duration: 450,
      });
    }

    if (currentSpinIndex === 2) {
      SOUNDS.win.currentTime = 0;
      SOUNDS.win.play();

      const winningCenterSymbol = getWinningCenterSymbol(
        getVisibleSymbolsByWinCells({
          symbols: getVisibleSymbols({
            reels,
            textures,
            GAMEFIELD,
            visibleHeight,
          }),
          winCells: findWinCells(resultIdx, GAMEFIELD.cols, GAMEFIELD.rows),
        }),
      );

      if (winningCenterSymbol) {
        showSymbolText({
          id: "upgrade-spin-win",
          text: TEXT.game.upgradeSpinSymbolWin,
          symbol: winningCenterSymbol,
          style: getSymbolTextStyle({
            fontSize: 34,
            fill: 0xfff1b5,
            strokeColor: 0x6f2f00,
            strokeWidth: 6,
          }),
          yOffset: -15,
          duration: 1000,
        });
      }

      counters.balance.animateTo(
        counters.balance.target + TEXT.game.upgradeSpinWin,
        {
          duration: 850,
        },
      );
      counters.win.animateTo(TEXT.game.upgradeSpinWin, {
        duration: 850,
      });
    }

    if (currentSpinIndex === 3) {
      const finalVisibleSymbols = getVisibleSymbols({
        reels,
        textures,
        GAMEFIELD,
        visibleHeight,
      });

      finalGlowEffect.show(finalVisibleSymbols);
      finalSymbolMotion.play(finalVisibleSymbols);

      SOUNDS.win.currentTime = 0;
      SOUNDS.win.play();

      SOUNDS.megaWin.currentTime = 0;
      SOUNDS.megaWin.play();

      finalFieldShake.play({
        duration: 1400,
        amplitude: 10,
        frequency: 40,
      });

      await coinConfetti.play({
        duration: 2500,
        perSide: 50,
        secondBurstDelay: 1000,
        secondBurstScale: 0.9,
      });

      bigWinOverlay.schedule(TEXT.game.bigWinAmount, { delay: 0 });
      queueFinalModal();
      counters.win.animateTo(TEXT.game.finalSpinWin, {
        duration: 1400,
      });
      SOUNDS.cheers.currentTime = 0;
      SOUNDS.cheers.play();
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

        if (currentSpinIndex === 2) {
          showBetUpgradePrompt();
          return;
        }

        if (spinCount < 4 && counters.balance.target >= currentBet) {
          spinButton.disabled = false;
        }
      },
      currentSpinIndex === 0 || currentSpinIndex === 2 ? 1000 : 200,
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
    counters.win.animateTo(0, { duration: 400 });
    spinButton?.classList.add("spin--glow");

    greeting?.classList.add("hidden");
    setTimeout(() => {
      greeting?.remove();
      showBalanceIntro();
    }, 200);
  });

  bet?.addEventListener("click", (event) => {
    if (!betUpgradePending) return;

    event.preventDefault();
    event.stopPropagation();

    SOUNDS.click.currentTime = 0;
    SOUNDS.click.play();

    setCurrentBet(TEXT.controls.upgradedBet);
    hideBetUpgradePrompt();

    if (spinCount < 5 && counters.balance.target >= currentBet) {
      spinButton.disabled = false;
    }
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
      modalTitle.innerHTML = `${TEXT.modal.title}<br>${TEXT.modal.subtitle}`;
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
    setCurrentBet(currentBet);
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

  function showBalanceIntro() {
    if (!balanceIntro) return;

    balanceIntro.textContent = `BALANCE +${formatCurrency(TEXT.game.startBalance)}`;
    balanceIntro.classList.remove("balance-intro--show");
    void balanceIntro.offsetWidth;
    balanceIntro.classList.add("balance-intro--show");
  }

  function setCurrentBet(value) {
    currentBet = value;

    if (betAmount) {
      betAmount.textContent = formatCurrency(currentBet);
    }
  }

  function showBetUpgradePrompt() {
    if (!betUpgrade || !bet || !betUpgradeMessage) return;

    betUpgradePending = true;
    betUpgradeMessage.textContent = TEXT.game.upgradeBetPrompt;
    document.body.classList.add("bet-upgrade-active");
    betUpgrade.removeAttribute("hidden");
    positionBetUpgradePrompt();
    window.addEventListener("resize", positionBetUpgradePrompt);
  }

  function hideBetUpgradePrompt() {
    betUpgradePending = false;
    document.body.classList.remove("bet-upgrade-active");
    betUpgrade?.setAttribute("hidden", "");
    window.removeEventListener("resize", positionBetUpgradePrompt);
  }

  function positionBetUpgradePrompt() {
    if (!bet || !betUpgradeMessage || !betUpgradePointer) return;

    const rect = bet.getBoundingClientRect();
    const messageX = rect.left + rect.width / 2;
    const messageY = rect.top - 78;
    const pointerX = rect.left + rect.width - 26;
    const pointerY = rect.top + 23;

    betUpgradeMessage.style.left = `${messageX}px`;
    betUpgradeMessage.style.top = `${messageY}px`;
    betUpgradeMessage.style.transform = "translate(-50%, -100%)";

    betUpgradePointer.style.left = `${pointerX}px`;
    betUpgradePointer.style.top = `${pointerY}px`;
  }

  function queueFinalModal() {
    if (!cashoutModal) return;

    if (finalModalTimeout) {
      clearTimeout(finalModalTimeout);
    }

    finalModalTimeout = setTimeout(() => {
      finalModalTimeout = null;
      bigWinOverlay.clear();
      document.body.classList.add("final-cta-active");
      cashoutModal.removeAttribute("hidden");
    }, 1850);
  }

  function hideFinalModal() {
    if (finalModalTimeout) {
      clearTimeout(finalModalTimeout);
      finalModalTimeout = null;
    }

    document.body.classList.remove("final-cta-active");
    cashoutModal?.setAttribute("hidden", "");
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

function buildFieldVignettes(container, gameFieldBg) {
  const fieldWidth = gameFieldBg.width - 25;
  const fieldHeight = gameFieldBg.height;
  const bandHeight = fieldHeight * 0.25;

  const topGradient = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "rgba(0, 0, 0, 0.35)" },
      { offset: 1, color: "rgba(0, 0, 0, 0)" },
    ],
  });

  const bottomGradient = new FillGradient({
    type: "linear",
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "rgba(0, 0, 0, 0.35)" },
      { offset: 1, color: "rgba(0, 0, 0, 0)" },
    ],
  });

  const topBand = new Graphics({ label: "top field vignette" });
  topBand
    .rect(-fieldWidth / 2, -fieldHeight / 2 + 5, fieldWidth, bandHeight)
    .fill(topGradient);

  const bottomBand = new Graphics({ label: "bottom field vignette" });
  bottomBand
    .rect(
      -fieldWidth / 2,
      fieldHeight / 2 - bandHeight - 5,
      fieldWidth,
      bandHeight,
    )
    .fill(bottomGradient);

  container.addChild(topBand, bottomBand);
}

function getWinningCenterSymbol(symbols) {
  if (!symbols.length) return null;
  if (symbols.length === 1) return symbols[0];

  const medianX = [...symbols].sort((a, b) => a.point.x - b.point.x)[
    Math.floor(symbols.length / 2)
  ].point.x;
  const medianY = [...symbols].sort((a, b) => a.point.y - b.point.y)[
    Math.floor(symbols.length / 2)
  ].point.y;

  const exactMatch = symbols.find(
    (symbol) => symbol.point.x === medianX && symbol.point.y === medianY,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const centerX =
    symbols.reduce((sum, symbol) => sum + symbol.point.x, 0) / symbols.length;
  const centerY =
    symbols.reduce((sum, symbol) => sum + symbol.point.y, 0) / symbols.length;

  return [...symbols].sort((left, right) => {
    const leftDistance = Math.hypot(
      left.point.x - centerX,
      left.point.y - centerY,
    );
    const rightDistance = Math.hypot(
      right.point.x - centerX,
      right.point.y - centerY,
    );

    return leftDistance - rightDistance;
  })[0];
}

function getVisibleSymbolsByWinCells({ symbols, winCells }) {
  if (!symbols.length || !winCells.size) return [];

  const sortedX = [...new Set(symbols.map((symbol) => symbol.point.x))].sort(
    (a, b) => a - b,
  );
  const sortedY = [...new Set(symbols.map((symbol) => symbol.point.y))].sort(
    (a, b) => b - a,
  );

  return symbols.filter((symbol) => {
    const col = sortedX.indexOf(symbol.point.x);
    const row = sortedY.indexOf(symbol.point.y);

    return winCells.has(`${col},${row}`);
  });
}
