import Phaser from "phaser";
import "./style.css";
import { CleopatraScene } from "./game/scenes/CleopatraScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#05070d",
  width: 390,
  height: 844,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  input: {
    activePointers: 3,
  },
  scene: [CleopatraScene],
};

new Phaser.Game(config);
