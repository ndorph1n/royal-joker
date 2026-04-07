import themeSound from "../../assets/sounds/theme.mp3";
import clickSound from "../../assets/sounds/click.mp3";
import megaWinSound from "../../assets/sounds/mega-win.mp3";
import spinningSound from "../../assets/sounds/spinning.mp3";
import winSound from "../../assets/sounds/win.mp3";
import cheersSound from "../../assets/sounds/cheers.mp3";

export const SOUNDS = {
  theme: new Audio(themeSound),
  spinning: new Audio(spinningSound),
  click: new Audio(clickSound),
  win: new Audio(winSound),
  megaWin: new Audio(megaWinSound),
  cheers: new Audio(cheersSound),
};
