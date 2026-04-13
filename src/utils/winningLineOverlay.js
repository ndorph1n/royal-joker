import { Container, Graphics } from "pixi.js";

export function createWinningLineOverlay({ gameWindow }) {
  const overlay = new Container({ label: "winning line overlay" });
  overlay.zIndex = 5;
  overlay.eventMode = "none";
  overlay.visible = false;

  const graphics = new Graphics();
  overlay.addChild(graphics);
  gameWindow.addChild(overlay);

  function show(lines = []) {
    graphics.clear();

    if (!lines.length) {
      overlay.visible = false;
      return;
    }

    for (const line of lines) {
      if (line.length < 2) continue;

      const [start, ...rest] = line;

      graphics.moveTo(start.x, start.y);
      rest.forEach((point) => {
        graphics.lineTo(point.x, point.y);
      });
      graphics.stroke({
        width: 5,
        color: 0x8f5200,
        alpha: 0.28,
        cap: "round",
        join: "round",
      });

      graphics.moveTo(start.x, start.y);
      rest.forEach((point) => {
        graphics.lineTo(point.x, point.y);
      });
      graphics.stroke({
        width: 3,
        color: 0xffbc12,
        alpha: 0.95,
        cap: "round",
        join: "round",
      });
    }

    overlay.visible = true;
  }

  function clear() {
    graphics.clear();
    overlay.visible = false;
  }

  function destroy() {
    clear();
    overlay.destroy({ children: true });
  }

  return {
    clear,
    destroy,
    show,
  };
}
