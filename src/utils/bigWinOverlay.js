import {
  BlurFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";

export function createBigWinOverlay({ app, scene, bigWinTexture }) {
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

  overlay.addChild(backdrop, bigWin, amountText);

  let showTimeout = null;
  let introTick = null;

  function schedule(amount = "200 EUR", options = {}) {
    clear();
    const delay = options.delay ?? 0;

    showTimeout = setTimeout(() => {
      showTimeout = null;
      showBigWin(amount);
    }, delay);
  }

  function clear() {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (introTick) {
      app.ticker.remove(introTick);
      introTick = null;
    }

    backdrop.visible = false;
    bigWin.visible = false;
    amountText.visible = false;
    bigWin.scale.set(1);
    amountText.text = "";
  }

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

  function updateBackdrop() {
    const scaleX = scene.scale.x || 1;
    const scaleY = scene.scale.y || 1;
    const width = app.screen.width / scaleX;
    const height = app.screen.height / scaleY;

    backdrop.clear();
    backdrop
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0x65007e, alpha: 0.25 });
  }

  return { schedule, clear };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
