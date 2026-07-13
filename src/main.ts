import Phaser from "phaser";
import "./style.css";
import { CleopatraScene } from "./game/scenes/CleopatraScene";
import { LeonardoScene } from "./game/scenes/LeonardoScene";
import type { LeonardoPhaseId } from "./game/scenes/leonardoSchedule";

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
  scene: [CleopatraScene, LeonardoScene],
};

const game = new Phaser.Game(config);

type CognoDebug = {
  startLeonardo(): void;
  startLeonardoLab(phase: LeonardoPhaseId, paused?: boolean): void;
  finishLeonardoVictory(): void;
  resumeLeonardo(): void;
  pauseLeonardo(): void;
};

const debugEnabled = new URLSearchParams(window.location.search).has("debug");

if (debugEnabled) {
  (window as Window & { __cognoDebug?: CognoDebug }).__cognoDebug = {
    startLeonardo: () => {
      game.scene.stop("CleopatraScene");
      game.scene.stop("LeonardoScene");
      game.scene.start("LeonardoScene", { devMode: true });
    },
    startLeonardoLab: (phase, paused = false) => {
      game.scene.stop("CleopatraScene");
      game.scene.stop("LeonardoScene");
      game.scene.start("LeonardoScene", { debugPhase: phase, allowLab: true });
      if (paused) {
        game.scene.pause("LeonardoScene");
      }
    },
    finishLeonardoVictory: () => {
      if (!game.scene.isActive("LeonardoScene")) {
        return;
      }
      const leonardo = game.scene.getScene("LeonardoScene") as unknown as {
        finish(result: "victory", origin: "lab-ultimate"): void;
      };
      leonardo.finish("victory", "lab-ultimate");
    },
    resumeLeonardo: () => game.scene.resume("LeonardoScene"),
    pauseLeonardo: () => game.scene.pause("LeonardoScene"),
  };
}

function resizeGame(): void {
  const metrics = getRenderMetrics();
  game.scale.resize(metrics.width, metrics.height);
}

window.addEventListener("resize", resizeGame);
window.visualViewport?.addEventListener("resize", resizeGame);
