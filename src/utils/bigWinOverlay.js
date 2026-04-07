import {
  BlurFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";

export function createBigWinOverlay({
  app,
  scene,
  cashOutButton,
  cashOutBg,
  cashOutText,
  bigWinTexture,
  pointTexture,
}) {
  const overlay = new Container({ label: "big win overlay" });
  overlay.zIndex = 20;
  overlay.sortableChildren = true;
  scene.addChild(overlay);

  const backdrop = new Graphics({ visible: false });
  backdrop.zIndex = 0;
  backdrop.filters = [new BlurFilter({ strength: 18, quality: 4 })];

  const bigWin = new Sprite({
    texture: bigWinTexture,
    anchor: 0.5,
    visible: false,
  });
  bigWin.zIndex = 1;

  const amountText = new Text({
    text: "",
    style: new TextStyle({
      fill: 0xfff1b5,
      fontFamily: "Arial",
      fontSize: 56,
      fontWeight: "700",
      stroke: { color: 0x6f2f00, width: 6, join: "round" },
    }),
    anchor: 0.5,
    visible: false,
  });
  amountText.zIndex = 2;

  const hand = new Sprite({
    texture: pointTexture,
    anchor: { x: 0.5, y: 0.5 },
    visible: false,
  });
  hand.scale.x = -1;
  hand.zIndex = 3;

  overlay.addChild(backdrop, bigWin, amountText, hand);

  let showTimeout = null;
  let activateTimeout = null;
  let introTick = null;
  let handTick = null;

  setCashOutActive(false);

  function schedule(amount = "200 €") {
    clear();

    showTimeout = setTimeout(() => {
      showTimeout = null;
      showBigWin(amount);

      activateTimeout = setTimeout(() => {
        activateTimeout = null;
        hideBigWin();
        setCashOutActive(true);
        showHand();
      }, 2000);
    }, 1000);
  }

  function clear() {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (activateTimeout) {
      clearTimeout(activateTimeout);
      activateTimeout = null;
    }
    if (introTick) {
      app.ticker.remove(introTick);
      introTick = null;
    }
    if (handTick) {
      app.ticker.remove(handTick);
      handTick = null;
    }

    hideBigWin();
    hand.visible = false;
    backdrop.visible = false;
    bigWin.scale.set(1);
    amountText.text = "";
    setCashOutActive(false);
  }

  return { schedule, clear };

  function showBigWin(amount) {
    const firstStageDuration = 220;
    const secondStageDuration = 120;
    const totalDuration = firstStageDuration + secondStageDuration;
    let elapsed = 0;

    updateBackdrop();
    backdrop.visible = true;
    bigWin.visible = true;
    amountText.visible = true;
    amountText.text = amount;

    bigWin.position.set(0, -20);
    amountText.position.set(0, 92);
    bigWin.scale.set(0);

    introTick = () => {
      elapsed += app.ticker.deltaMS;
      let scale = 1;

      if (elapsed <= firstStageDuration) {
        const phase = Math.min(1, elapsed / firstStageDuration);
        scale = lerp(0, 1.05, easeOutCubic(phase));
      } else {
        const phase = Math.min(
          1,
          (elapsed - firstStageDuration) / secondStageDuration,
        );
        scale = lerp(1.05, 1, easeOutCubic(phase));
      }

      bigWin.scale.set(scale);

      if (elapsed >= totalDuration) {
        app.ticker.remove(introTick);
        introTick = null;
        bigWin.scale.set(1);
      }
    };

    app.ticker.add(introTick);
  }

  function showHand() {
    const baseX = cashOutButton.x + cashOutButton.width - 8;
    const baseY = cashOutButton.y + cashOutButton.height - 10;
    let elapsed = 0;

    hand.visible = true;
    hand.width = 86;
    hand.height = 86;
    hand.position.set(baseX, baseY);

    handTick = () => {
      elapsed += app.ticker.deltaMS / 1000;
      const wave = Math.sin(elapsed * 3.8) * 0.5 + 0.5;

      hand.position.set(baseX + wave * 14, baseY - wave * 8);
    };

    app.ticker.add(handTick);
  }

  function setCashOutActive(active) {
    cashOutButton.eventMode = active ? "static" : "none";
    cashOutButton.cursor = active ? "pointer" : "default";
    cashOutButton.alpha = active ? 1 : 0.75;
    redrawCashOut(active);
    cashOutText.style.fill = active ? 0xffffff : 0xe4e7eb;
  }

  function redrawCashOut(active) {
    cashOutBg.clear();
    if (active) {
      cashOutBg
        .roundRect(0, 0, 170, 56, 14)
        .fill({ color: 0xe09b18, alpha: 1 })
        .stroke({ color: 0xffe3a1, width: 3, alpha: 0.95 });
      return;
    }

    cashOutBg
      .roundRect(0, 0, 170, 56, 14)
      .fill({ color: 0x7b7f86, alpha: 0.9 })
      .stroke({ color: 0xaeb3ba, width: 2, alpha: 0.5 });
  }

  function hideBigWin() {
    backdrop.visible = false;
    bigWin.visible = false;
    amountText.visible = false;
  }

  function updateBackdrop() {
    const scaleX = scene.scale.x || 1;
    const scaleY = scene.scale.y || 1;
    const width = app.screen.width / scaleX;
    const height = app.screen.height / scaleY;

    backdrop.clear();
    backdrop
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0x740000, alpha: 0.745 });
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
