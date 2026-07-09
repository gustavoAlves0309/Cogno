import Phaser from "phaser";
import "./style.css";
import { CleopatraScene } from "./game/scenes/CleopatraScene";

const MAX_RENDER_SCALE = 3;

function getRenderMetrics(): { width: number; height: number; renderScale: number } {
  const renderScale = Math.min(MAX_RENDER_SCALE, Math.max(1, window.devicePixelRatio || 1));

  return {
    width: Math.max(1, Math.round(window.innerWidth * renderScale)),
    height: Math.max(1, Math.round(window.innerHeight * renderScale)),
    renderScale,
  };
}

const initialMetrics = getRenderMetrics();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#05070d",
  width: initialMetrics.width,
  height: initialMetrics.height,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: 1,
    autoCenter: Phaser.Scale.NO_CENTER,
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

const game = new Phaser.Game(config);

function resizeGame(): void {
  const metrics = getRenderMetrics();
  game.scale.resize(metrics.width, metrics.height);
}

window.addEventListener("resize", resizeGame);
window.visualViewport?.addEventListener("resize", resizeGame);
