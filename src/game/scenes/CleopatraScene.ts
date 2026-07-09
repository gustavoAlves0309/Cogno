import Phaser from "phaser";
import { AttackManager } from "../attacks/AttackManager";
import { ArmyOfIllusionsAttack } from "../attacks/ArmyOfIllusionsAttack";
import { ExpandingHieroglyphAttack } from "../attacks/ExpandingHieroglyphAttack";
import { HorusSunAttack } from "../attacks/HorusSunAttack";
import { NileRiseAttack } from "../attacks/NileRiseAttack";
import { SandsOfTimeAttack, type SandsRewindSnapshot } from "../attacks/SandsOfTimeAttack";
import {
  ScarabVolleyAttack,
  SCARAB_REWIND_TRAJECTORY_COUNT,
  type ScarabRewindTrajectory,
} from "../attacks/ScarabVolleyAttack";
import { ScaleOfMaatAttack } from "../attacks/ScaleOfMaatAttack";
import { WadjetConeAttack } from "../attacks/WadjetConeAttack";
import { GameAudio } from "../audio/GameAudio";
import { PlayerController } from "../PlayerController";
import { drawCleopatraPortrait } from "../rendering/CleopatraPortrait";
import type { ArenaBounds, AttackContext, GameMode } from "../types";

const FALLBACK_WIDTH = 390;
const FALLBACK_HEIGHT = 844;
const PHASE_DURATION_MS = 90000;
const ULTIMATE_DURATION_MS = 75000;
const PHASE_TWO_AT_MS = PHASE_DURATION_MS;
const PHASE_THREE_AT_MS = PHASE_DURATION_MS * 2;
const ULTIMATE_AT_MS = PHASE_DURATION_MS * 3;
const FIGHT_DURATION_MS = ULTIMATE_AT_MS + ULTIMATE_DURATION_MS;
const END_MODAL_DELAY_MS = 1350;
const CLEOPATRA_VICTORY_LINES = [
  "So the hourglass favors you.",
  "You crossed my reign and kept your soul.",
  "Remember this victory. Time will not be so kind again.",
];
const CLEOPATRA_DEFEAT_LINES = [
  "History does not remember hesitation.",
  "The Nile rises for those who stand still.",
  "Return, little spark. The crown is not finished.",
];
const FIGHT_PHASES: FightPhaseDefinition[] = [
  {
    id: "phase1",
    title: "Phase 1",
    subtitle: "The Ritual Opens",
    duration: PHASE_DURATION_MS,
    bossPhase: 0,
  },
  {
    id: "phase2",
    title: "Phase 2",
    subtitle: "Serpent Crown",
    duration: PHASE_DURATION_MS,
    bossPhase: 1,
  },
  {
    id: "phase3",
    title: "Phase 3",
    subtitle: "Judgment of Time",
    duration: PHASE_DURATION_MS,
    bossPhase: 2,
  },
  {
    id: "ultimate",
    title: "Ultimate",
    subtitle: "Army of Illusions",
    duration: ULTIMATE_DURATION_MS,
    bossPhase: 2,
  },
];

interface ScriptEvent {
  at: number;
  run: () => void;
  done: boolean;
}

type FightPhaseId = "phase1" | "phase2" | "phase3" | "ultimate";

interface FightPhaseDefinition {
  id: FightPhaseId;
  title: string;
  subtitle: string;
  duration: number;
  bossPhase: number;
}

type PhaseIcon = "cleopatra" | "davinci" | "genghis";

interface MenuBossDefinition {
  icon: PhaseIcon;
  title: string;
  status: string;
  era: string;
  enabled: boolean;
}

interface MemoryNodeLayout {
  icon: PhaseIcon;
  title: string;
  status: string;
  era: string;
  x: number;
  y: number;
  radius: number;
  enabled: boolean;
  selected: boolean;
  index: number;
}

interface MenuMapLayout {
  mapX: number;
  mapY: number;
  mapWidth: number;
  mapHeight: number;
  railY: number;
  titleY: number;
  playY: number;
  dotY: number;
  nodes: MemoryNodeLayout[];
}

const MENU_BOSSES: MenuBossDefinition[] = [
  {
    icon: "cleopatra",
    title: "Cleopatra",
    status: "Unlocked",
    era: "Ancient Egypt",
    enabled: true,
  },
  {
    icon: "davinci",
    title: "da Vinci",
    status: "Sealed",
    era: "Renaissance",
    enabled: false,
  },
  {
    icon: "genghis",
    title: "Genghis Khan",
    status: "Sealed",
    era: "Mongol Empire",
    enabled: false,
  },
];

export class CleopatraScene extends Phaser.Scene {
  private mode: GameMode = "title";
  private readonly arena: ArenaBounds = { x: 52, y: 338, size: 286 };
  private readonly bossPosition = new Phaser.Math.Vector2(FALLBACK_WIDTH / 2, 185);
  private stageWidth = FALLBACK_WIDTH;
  private stageHeight = FALLBACK_HEIGHT;
  private player!: PlayerController;
  private attacks!: AttackManager;
  private stageGraphics!: Phaser.GameObjects.Graphics;
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private logoImage!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private scriptStartedAt = 0;
  private scriptEvents: ScriptEvent[] = [];
  private currentTime = 0;
  private renderScale = 1;
  private finalProgress = 0;
  private logoMarkY = 150;
  private logoMarkScale = 0.6;
  private bossPhase = 0;
  private phaseChangedAt = 0;
  private readonly audio = new GameAudio();
  private endingStartedAt = -1;
  private endButtonsShown = false;
  private readonly endingPlayerPosition = new Phaser.Math.Vector2();
  private endDialogLine = "";
  private hasHorusRewindMemory = false;
  private readonly scarabRewindMemories: ScarabRewindTrajectory[][] = [];
  private scriptedTestPhase: FightPhaseDefinition | null = null;
  private activeScriptDuration = FIGHT_DURATION_MS;
  private menuSelectedIndex = 0;
  private menuPointerDown: { x: number; y: number } | null = null;

  constructor() {
    super("CleopatraScene");
  }

  preload(): void {
    this.load.svg("cogno-logo-clean", "/assets/cogno-logo-clean.svg", { width: 760, height: 210 });
  }

  create(): void {
    this.currentTime = this.game.loop.time;
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, false);
    this.scale.on("resize", this.handleResize, this);

    this.stageGraphics = this.add.graphics().setDepth(0);
    this.arenaGraphics = this.add.graphics().setDepth(10);
    this.uiGraphics = this.add.graphics().setDepth(80);
    this.logoImage = this.add.image(this.stageWidth / 2, this.logoMarkY, "cogno-logo-clean")
      .setOrigin(0.5)
      .setDepth(88)
      .setVisible(false);
    this.attacks = new AttackManager();
    this.player = new PlayerController(this, this.arena);

    this.titleText = this.add.text(this.stageWidth / 2, 42, "COGNO", {
      fontFamily: "Georgia, serif",
      fontSize: "34px",
      color: "#f0cf79",
      letterSpacing: 4,
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(90).setVisible(false);

    this.subtitleText = this.add.text(this.stageWidth / 2, 78, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "13px",
      color: "#9db3c2",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(90).setVisible(false);

    this.promptText = this.add.text(this.stageWidth / 2, this.stageHeight - 108, "TOUCH ANYWHERE TO START", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "12px",
      color: "#f0d58a",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(90);

    this.timerText = this.add.text(this.stageWidth / 2, this.arena.y - 42, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "12px",
      color: "#e8d49b",
      resolution: this.renderScale,
    }).setOrigin(1, 0.5).setDepth(90);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.audio.unlock();
      if (this.mode === "menu") {
        this.menuPointerDown = { x: pointer.worldX, y: pointer.worldY };
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.mode === "title") {
        this.audio.playCue("ui");
        this.showMenu();
        return;
      }

      if (this.mode === "menu") {
        this.handleMenuPointerUp(pointer);
      }
    });

    this.drawStage(0);
    this.drawArena();
    this.showTitle();
  }

  update(time: number, delta: number): void {
    this.currentTime = time;
    this.drawStage(time);
    this.player.update(time, delta);

    const hit = this.attacks.update(time, delta, this.player.state);
    this.drawArena();
    if (hit && this.player.damage(time)) {
      if (this.player.state.stability <= 0) {
        if (this.mode === "real") {
          this.finish("defeat");
        } else if (this.mode === "test") {
          this.audio.playCue("damage");
          this.player.reset();
          this.player.state.invulnerableUntil = time + 700;
        }
      } else {
        this.audio.playCue("damage");
      }
    }

    if (this.mode === "real" || (this.mode === "test" && this.scriptedTestPhase)) {
      this.updateScript(time);
    }

    if ((this.mode === "victory" || this.mode === "defeat") && !this.endButtonsShown) {
      if (time - this.endingStartedAt >= END_MODAL_DELAY_MS) {
        this.endButtonsShown = true;
        this.rebuildButtons();
      }
    }

    this.drawUi(time);
  }

  private handleResize(): void {
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, true);
  }

  private getLogicalSize(): { width: number; height: number } {
    this.updateRenderScale();

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private updateRenderScale(): number {
    this.renderScale = Phaser.Math.Clamp(window.devicePixelRatio || 1, 1, 3);
    return this.renderScale;
  }

  private getBottomReserve(): number {
    if (this.mode === "title") {
      return Phaser.Math.Clamp(this.stageHeight * 0.14, 76, 112);
    }

    if (this.mode === "test") {
      return Phaser.Math.Clamp(this.stageHeight * 0.34, 216, 250);
    }

    if (this.mode === "real") {
      return Phaser.Math.Clamp(this.stageHeight * 0.34, 170, 280);
    }

    if (this.mode === "victory" || this.mode === "defeat") {
      return Phaser.Math.Clamp(this.stageHeight * 0.22, 140, 178);
    }

    return Phaser.Math.Clamp(this.stageHeight * 0.1, 54, 86);
  }

  private updateTextResolution(): void {
    for (const child of this.children.getChildren()) {
      if (child instanceof Phaser.GameObjects.Text) {
        child.setResolution(this.renderScale);
      }
    }
  }

  private applyLayout(width: number, height: number, preservePlayer: boolean): void {
    this.updateRenderScale();

    const oldArena = { ...this.arena };
    const normalizedPlayerX = this.player ? (this.player.state.position.x - oldArena.x) / oldArena.size : 0.5;
    const normalizedPlayerY = this.player ? (this.player.state.position.y - oldArena.y) / oldArena.size : 0.66;

    this.stageWidth = Math.max(320, Math.floor(width || FALLBACK_WIDTH));
    this.stageHeight = Math.max(480, Math.floor(height || FALLBACK_HEIGHT));

    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(this.renderScale);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, this.stageWidth, this.stageHeight);

    const sidePadding = Phaser.Math.Clamp(this.stageWidth * 0.105, 30, 52);
    const bottomReserve = this.getBottomReserve();
    const topReserve = this.mode === "title"
      ? Phaser.Math.Clamp(this.stageHeight * 0.25, 128, 178)
      : this.mode === "menu"
        ? Phaser.Math.Clamp(this.stageHeight * 0.28, 150, 202)
        : Phaser.Math.Clamp(this.stageHeight * 0.24, 132, 178);
    const sizeByWidth = this.stageWidth - sidePadding * 2;
    const sizeByHeight = this.stageHeight - bottomReserve - topReserve;
    const minArenaSize = this.mode === "real" ? 226 : this.mode === "test" ? 212 : 244;
    const maxArenaSize = this.mode === "real" ? (this.stageHeight < 700 ? 254 : 274) : this.mode === "test" ? 260 : 330;
    const arenaSize = Math.floor(Phaser.Math.Clamp(Math.min(sizeByWidth, sizeByHeight), minArenaSize, maxArenaSize));

    this.arena.size = arenaSize;
    this.arena.x = Math.floor((this.stageWidth - arenaSize) / 2);
    this.arena.y = Math.floor(this.stageHeight - bottomReserve - arenaSize);

    if (this.mode === "title") {
      this.bossPosition.set(this.stageWidth / 2, Phaser.Math.Clamp(this.stageHeight * 0.42, 190, 270));
    } else if (this.mode === "menu") {
      this.bossPosition.set(this.stageWidth / 2, Phaser.Math.Clamp(this.stageHeight * 0.22, 110, 150));
    } else {
      this.bossPosition.set(this.stageWidth / 2, Math.max(82, this.arena.y - Phaser.Math.Clamp(this.arena.size * 0.28, 68, 88)));
    }

    if (this.titleText) {
      const logoBaseScale = Math.min(this.stageWidth / 390, this.stageHeight / 844);

      if (this.mode === "title") {
        this.logoMarkScale = Phaser.Math.Clamp(logoBaseScale * 0.58, 0.5, 0.68);
        this.logoMarkY = Phaser.Math.Clamp(this.stageHeight * 0.46, 300, 390);
      } else if (this.mode === "menu") {
        this.logoMarkScale = Phaser.Math.Clamp(logoBaseScale * 0.31, 0.25, 0.36);
        this.logoMarkY = Phaser.Math.Clamp(this.stageHeight * 0.086, 54, 74);
      }

      const logoBottomY = this.mode === "title" || this.mode === "menu"
        ? this.logoMarkY + 124 * this.logoMarkScale
        : Math.max(30, this.stageHeight * 0.052);
      if (this.logoImage) {
        const logoWidth = this.mode === "title"
          ? Phaser.Math.Clamp(this.stageWidth * 0.78, 280, 340)
          : this.mode === "menu"
            ? Phaser.Math.Clamp(this.stageWidth * 0.48, 172, 214)
            : 0;
        const logoAspect = 760 / 210;
        const logoHeight = logoWidth / logoAspect;
        this.logoImage
          .setTexture("cogno-logo-clean")
          .setPosition(this.stageWidth / 2, this.logoMarkY)
          .setDisplaySize(logoWidth, logoHeight)
          .setVisible(this.mode === "title" || this.mode === "menu");
      }
      this.titleText.setPosition(this.stageWidth / 2, logoBottomY);
      this.titleText.setFontSize(1);
      this.titleText.setVisible(false);
      this.subtitleText.setVisible(false);
      this.subtitleText.setPosition(this.stageWidth / 2, logoBottomY + 38);
      this.promptText.setPosition(this.stageWidth / 2, this.stageHeight - Phaser.Math.Clamp(this.stageHeight * 0.18, 86, 130));
      this.timerText.setPosition(this.stageWidth - 16, this.mode === "menu" || this.mode === "title" ? logoBottomY + 56 : 42);
    }

    if (preservePlayer && this.player) {
      const x = this.arena.x + Phaser.Math.Clamp(normalizedPlayerX, 0, 1) * this.arena.size;
      const y = this.arena.y + Phaser.Math.Clamp(normalizedPlayerY, 0, 1) * this.arena.size;
      this.player.state.position.set(
        Phaser.Math.Clamp(x, this.arena.x + this.player.state.radius, this.arena.x + this.arena.size - this.player.state.radius),
        Phaser.Math.Clamp(y, this.arena.y + this.player.state.radius, this.arena.y + this.arena.size - this.player.state.radius),
      );
    }

    if (this.arenaGraphics) {
      this.drawArena();
    }

    if (this.player) {
      const joystickRadius = Phaser.Math.Clamp(this.stageWidth * 0.095, 34, 42);
      const zoneGap = this.mode === "real" ? 58 : this.mode === "test" ? 166 : 26;
      const minZoneHeight = joystickRadius * 2.55;
      const zoneY = Math.min(this.arena.y + this.arena.size + zoneGap, this.stageHeight - minZoneHeight);
      const zoneHeight = this.stageHeight - zoneY - 8;
      const joystickY = zoneY + zoneHeight / 2;
      this.player.setJoystickLayout(this.stageWidth / 2, joystickY, joystickRadius);
      this.player.setControlZone(0, zoneY, this.stageWidth, zoneHeight);
    }

    if (this.uiGraphics) {
      this.updateTextResolution();
      this.rebuildButtons();
    }
  }

  private showTitle(): void {
    this.mode = "title";
    this.clearButtons();
    this.attacks.clear();
    this.audio.stopMusic();
    this.clearRewindMemory();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.scriptedTestPhase = null;
    this.scriptEvents = [];
    this.activeScriptDuration = FIGHT_DURATION_MS;
    this.player.setVisible(false);
    this.player.setControlEnabled(false);
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.promptText.setVisible(true);
    this.titleText.setText("COGNO");
    this.subtitleText.setText("");
    this.timerText.setVisible(false);
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, false);
  }

  private showMenu(): void {
    this.mode = "menu";
    this.menuSelectedIndex = Phaser.Math.Clamp(this.menuSelectedIndex, 0, MENU_BOSSES.length - 1);
    this.menuPointerDown = null;
    this.clearButtons();
    this.attacks.clear();
    this.audio.stopMusic();
    this.clearRewindMemory();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.scriptedTestPhase = null;
    this.scriptEvents = [];
    this.activeScriptDuration = FIGHT_DURATION_MS;
    this.player.setVisible(false);
    this.player.setControlEnabled(false);
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.promptText.setVisible(false);
    this.titleText.setText("COGNO");
    this.subtitleText.setText("");
    this.timerText.setVisible(false);
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, false);
    this.rebuildButtons();
  }

  private handleMenuPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.menuPointerDown) {
      return;
    }

    const dx = pointer.worldX - this.menuPointerDown.x;
    const dy = pointer.worldY - this.menuPointerDown.y;
    this.menuPointerDown = null;

    if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.25) {
      return;
    }

    this.setMenuSelection(this.menuSelectedIndex + (dx < 0 ? 1 : -1));
  }

  private setMenuSelection(index: number): void {
    const nextIndex = Phaser.Math.Clamp(index, 0, MENU_BOSSES.length - 1);
    if (nextIndex === this.menuSelectedIndex) {
      return;
    }

    this.menuSelectedIndex = nextIndex;
    this.audio.playCue("ui");
    this.rebuildButtons();
  }

  private startRealMode(): void {
    this.mode = "real";
    this.clearButtons();
    this.attacks.clear();
    this.clearRewindMemory();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.player.setVisible(true);
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.promptText.setVisible(false);
    this.timerText.setVisible(false);
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, false);
    this.player.reset();
    this.player.setControlEnabled(true);
    this.scriptStartedAt = this.getNow();
    this.setBossPhase(0, false);
    this.scriptEvents = this.createScript();
    this.scriptedTestPhase = null;
    this.activeScriptDuration = FIGHT_DURATION_MS;
    this.finalProgress = 0;
    this.timerText.setText("");
    this.audio.setPhase(0);
    this.audio.startMusic();
    this.audio.playCue("ui");
    this.rebuildButtons();
  }

  private startTestMode(): void {
    this.mode = "test";
    this.clearButtons();
    this.attacks.clear();
    this.audio.stopMusic();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.scriptedTestPhase = null;
    this.scriptEvents = [];
    this.activeScriptDuration = 0;
    this.player.setVisible(true);
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.promptText.setVisible(false);
    this.timerText.setVisible(true);
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, false);
    this.player.reset();
    this.player.setControlEnabled(true);
    this.clearRewindMemory();
    this.timerText.setText("Phase lab");
    this.rebuildButtons();
  }

  private finish(mode: "victory" | "defeat"): void {
    this.endingPlayerPosition.copy(this.player.state.position);
    this.mode = mode;
    this.clearButtons();
    this.attacks.clear();
    this.clearRewindMemory();
    this.player.setControlEnabled(false);
    this.player.setVisible(false);
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.promptText.setVisible(false);
    this.timerText.setVisible(false);
    const elapsed = this.currentTime - this.scriptStartedAt;
    this.finalProgress = mode === "victory" ? 1 : Phaser.Math.Clamp(elapsed / FIGHT_DURATION_MS, 0, 1);
    this.timerText.setText("");
    this.endingStartedAt = this.currentTime;
    this.endButtonsShown = false;
    this.audio.stopMusic();
    this.audio.playCue(mode === "victory" ? "victory" : "death");
    this.endDialogLine = this.pickEndDialog(mode);
    this.cameras.main.shake(mode === "victory" ? 150 : 230, mode === "victory" ? 0.002 : 0.005);
  }

  private pickEndDialog(mode: "victory" | "defeat"): string {
    const lines = mode === "victory" ? CLEOPATRA_VICTORY_LINES : CLEOPATRA_DEFEAT_LINES;
    return lines[Math.floor(Math.random() * lines.length)] ?? lines[0];
  }

  private createScript(): ScriptEvent[] {
    const events = [
      ...this.createPhaseEvents("phase1", 0),
      ...this.createPhaseEvents("phase2", PHASE_TWO_AT_MS),
      ...this.createPhaseEvents("phase3", PHASE_THREE_AT_MS),
      ...this.createPhaseEvents("ultimate", ULTIMATE_AT_MS),
    ];

    return events.map(([at, run]) => ({ at, run, done: false }));
  }

  private createPhaseScript(phase: FightPhaseDefinition): ScriptEvent[] {
    return this.createPhaseEvents(phase.id, 0).map(([at, run]) => ({ at, run, done: false }));
  }

  private createPhaseEvents(phase: FightPhaseId, offset: number): Array<[number, () => void]> {
    const at = (time: number, run: () => void): [number, () => void] => [offset + time, run];

    if (phase === "phase1") {
      return [
        at(0, () => this.clearRewindMemory()),
        at(900, () => this.spawnScarabVolley()),
        at(8200, () => this.spawnNile(this.arena.y + this.arena.size * 0.72)),
        at(16000, () => this.spawnWadjet("left")),
        at(24200, () => this.spawnHorus()),
        at(35200, () => this.spawnScaleOfMaat()),
        at(41200, () => this.spawnExpandingHieroglyph()),
        at(48600, () => this.spawnScarabVolley()),
        at(55800, () => this.spawnNile(this.arena.y + this.arena.size * 0.48)),
        at(63000, () => this.spawnWadjet("right")),
        at(70400, () => this.spawnHorus()),
        at(80000, () => this.spawnScaleOfMaat()),
        at(84600, () => this.spawnExpandingHieroglyph()),
      ];
    }

    if (phase === "phase2") {
      return [
        at(0, () => this.clearRewindMemory()),
        at(900, () => this.spawnHorus()),
        at(9800, () => this.spawnSandsOfTime()),
        at(15600, () => this.spawnScarabVolley()),
        at(21800, () => this.spawnSandsOfTime()),
        at(27600, () => this.spawnWadjet("right")),
        at(34800, () => this.spawnScaleOfMaat()),
        at(42000, () => this.spawnScarabVolley()),
        at(47400, () => this.spawnScarabVolley()),
        at(53600, () => this.spawnSandsOfTime()),
        at(59400, () => this.spawnNile(this.arena.y + this.arena.size * 0.58)),
        at(65600, () => this.spawnExpandingHieroglyph()),
        at(71600, () => this.spawnHorus()),
        at(80600, () => this.spawnSandsOfTime()),
        at(85200, () => this.spawnWadjet("left")),
      ];
    }

    if (phase === "phase3") {
      return [
        at(0, () => this.clearRewindMemory()),
        at(500, () => this.spawnScarabVolley()),
        at(2100, () => this.spawnHorus()),
        at(10600, () => this.spawnSandsOfTime()),
        at(15400, () => this.spawnScaleOfMaat()),
        at(17900, () => this.spawnExpandingHieroglyph()),
        at(22200, () => this.spawnScarabVolley()),
        at(27000, () => this.spawnNile(this.arena.y + this.arena.size * 0.54)),
        at(31000, () => this.spawnHorus()),
        at(40400, () => this.spawnSandsOfTime()),
        at(44800, () => this.spawnScaleOfMaat()),
        at(47600, () => this.spawnExpandingHieroglyph()),
        at(51400, () => this.spawnScarabVolley()),
        at(56200, () => this.spawnHorus()),
        at(64600, () => this.spawnSandsOfTime()),
        at(69000, () => this.spawnScaleOfMaat()),
        at(72400, () => this.spawnExpandingHieroglyph()),
        at(75800, () => this.spawnNile(this.arena.y + this.arena.size * 0.46)),
        at(79400, () => this.spawnScarabVolley()),
        at(83600, () => this.spawnExpandingHieroglyph()),
        at(86200, () => this.spawnScaleOfMaat()),
      ];
    }

    return [
      at(0, () => this.spawnArmyOfIllusions()),
    ];
  }

  private updateScript(time: number): void {
    const elapsed = time - this.scriptStartedAt;
    if (this.mode === "real") {
      this.setBossPhase(this.getBossPhaseForElapsed(elapsed));
    } else if (this.mode === "test" && this.scriptedTestPhase) {
      this.timerText.setText(
        `${this.scriptedTestPhase.title}: ${this.formatDuration(elapsed)} / ${this.formatDuration(this.activeScriptDuration)}`,
      );
    }

    for (const event of this.scriptEvents) {
      if (!event.done && elapsed >= event.at) {
        event.done = true;
        event.run();
      }
    }

    if (this.mode === "test" && this.scriptedTestPhase && elapsed >= this.activeScriptDuration) {
      this.completeTestPhase();
      return;
    }

    if (this.mode === "real" && elapsed >= FIGHT_DURATION_MS && this.player.state.stability > 0) {
      this.finish("victory");
    }
  }

  private getBossPhaseForElapsed(elapsed: number): number {
    if (elapsed >= PHASE_THREE_AT_MS) {
      return 2;
    }

    if (elapsed >= PHASE_TWO_AT_MS) {
      return 1;
    }

    return 0;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  private setBossPhase(phase: number, feedback = true): void {
    if (this.bossPhase === phase && feedback) {
      return;
    }

    const changed = this.bossPhase !== phase;
    this.bossPhase = phase;
    this.phaseChangedAt = this.getNow();

    if (feedback && changed && this.mode === "real") {
      const flash = phase === 1 ? { r: 60, g: 218, b: 210 } : { r: 232, g: 104, b: 104 };
      this.cameras.main.flash(170, flash.r, flash.g, flash.b, false);
      this.cameras.main.shake(140, phase === 1 ? 0.002 : 0.003);
      this.audio.setPhase(phase);
      this.audio.playCue("phase");
    }
  }

  private startTestPhase(phase: FightPhaseDefinition): void {
    this.clearButtons();
    this.attacks.clear();
    this.clearRewindMemory();
    this.player.reset();
    this.player.setVisible(true);
    this.player.setControlEnabled(true);
    this.scriptedTestPhase = phase;
    this.activeScriptDuration = phase.duration;
    this.scriptStartedAt = this.getNow();
    this.scriptEvents = this.createPhaseScript(phase);
    this.finalProgress = 0;
    this.setBossPhase(phase.bossPhase, false);
    this.audio.setPhase(phase.bossPhase);
    this.audio.startMusic();
    this.audio.playCue("phase");
    this.timerText.setText(`${phase.title}: ${phase.subtitle}`);
    this.rebuildButtons();
  }

  private completeTestPhase(): void {
    const phase = this.scriptedTestPhase;
    this.scriptedTestPhase = null;
    this.scriptEvents = [];
    this.activeScriptDuration = 0;
    this.attacks.clear();
    this.clearRewindMemory();
    this.audio.stopMusic();
    this.timerText.setText(phase ? `${phase.title} complete` : "Phase complete");
  }

  private shouldPrepareSingleTestAttack(): boolean {
    return this.mode === "test" && this.scriptedTestPhase === null;
  }

  private spawnScarabVolley(): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: scarabs charging memory");
    }
    const volleyMemory: ScarabRewindTrajectory[] = [];
    this.scarabRewindMemories.push(volleyMemory);
    if (this.scarabRewindMemories.length > 2) {
      this.scarabRewindMemories.shift();
    }
    this.audio.playCue("scarab");
    this.attacks.add(new ScarabVolleyAttack(this.getAttackContext(), this.getNow(), (trajectory) => {
      volleyMemory.push({
        start: trajectory.start.clone(),
        end: trajectory.end.clone(),
        delay: trajectory.delay,
        travelMs: trajectory.travelMs,
      });
    }));
  }

  private spawnNile(targetY?: number): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: Nile");
    }
    this.audio.playCue("nile");
    this.attacks.add(new NileRiseAttack(this.getAttackContext(), this.getNow(), targetY));
  }

  private spawnWadjet(side?: "left" | "right"): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: Wadjet");
    }
    this.audio.playCue("wadjet");
    this.attacks.add(new WadjetConeAttack(this.getAttackContext(), this.getNow(), side));
  }

  private spawnHorus(): void {
    if (this.shouldPrepareSingleTestAttack()) {
      const label = this.getCompleteScarabRewindMemories().length > 0
        ? "Test: Horus + scarabs ready"
        : "Test: Horus - Sands ready";
      this.prepareTestAttack(label);
    }
    this.hasHorusRewindMemory = true;
    this.audio.playCue("horus");
    this.attacks.add(new HorusSunAttack(this.getAttackContext(), this.getNow()));
  }

  private spawnSandsOfTime(): void {
    const scarabMemories = this.getCompleteScarabRewindMemories();
    const scarabTrajectories = scarabMemories.flatMap((memory) => memory);
    const hasScarabMemory = scarabTrajectories.length >= SCARAB_REWIND_TRAJECTORY_COUNT;
    const hasHorusMemory = this.hasHorusRewindMemory;

    if (!hasScarabMemory && !hasHorusMemory) {
      if (this.shouldPrepareSingleTestAttack()) {
        const label = this.scarabRewindMemories.length > 0
          ? "Let the full Scarabs volley fly before Sands"
          : "Use Scarabs or Horus before Sands";
        this.prepareTestAttack(label);
      }
      this.audio.playCue("ui");
      return;
    }

    const snapshot: SandsRewindSnapshot = {};
    if (hasScarabMemory) {
      snapshot.scarabs = scarabTrajectories.map((trajectory) => ({
        start: trajectory.start.clone(),
        end: trajectory.end.clone(),
        delay: trajectory.delay,
        travelMs: trajectory.travelMs,
      }));
    }
    if (hasHorusMemory) {
      snapshot.horus = true;
    }

    if (this.shouldPrepareSingleTestAttack()) {
      const label = hasScarabMemory && hasHorusMemory
        ? "Test: Sands rewinds combo"
        : hasHorusMemory
          ? "Test: Sands rewinds Horus"
          : "Test: Sands rewinds scarabs";
      this.prepareTestAttack(label);
    }
    this.audio.playCue("sands");
    this.attacks.add(new SandsOfTimeAttack(this.getAttackContext(), this.getNow(), snapshot));
    this.clearRewindMemory();
  }

  private clearRewindMemory(): void {
    this.hasHorusRewindMemory = false;
    this.scarabRewindMemories.length = 0;
  }

  private getCompleteScarabRewindMemories(): ScarabRewindTrajectory[][] {
    return this.scarabRewindMemories.filter((memory) => memory.length >= SCARAB_REWIND_TRAJECTORY_COUNT);
  }

  private spawnScaleOfMaat(): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: Scale of Ma'at");
    }
    this.audio.playCue("maat");
    this.attacks.add(new ScaleOfMaatAttack(this.getAttackContext(), this.getNow()));
  }

  private spawnExpandingHieroglyph(): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: expanding glyph");
    }
    this.audio.playCue("glyph");
    this.attacks.add(new ExpandingHieroglyphAttack(this.getAttackContext(), this.getNow()));
  }

  private spawnArmyOfIllusions(): void {
    if (this.shouldPrepareSingleTestAttack()) {
      this.prepareTestAttack("Test: Army of Illusions");
    }
    this.audio.playCue("army");
    this.attacks.add(new ArmyOfIllusionsAttack(this.getAttackContext(), this.getNow()));
  }

  private prepareTestAttack(label: string): void {
    this.attacks.clear();
    this.player.reset();
    this.timerText.setText(label);
  }

  private getAttackContext(): AttackContext {
    return {
      scene: this,
      arena: this.arena,
      player: this.player.state,
      bossPosition: this.bossPosition,
      stageWidth: this.stageWidth,
      stageHeight: this.stageHeight,
      playCue: (cue) => this.audio.playCue(cue),
    };
  }

  private getNow(): number {
    return this.game.loop.time;
  }

  private drawStage(time: number): void {
    const width = this.stageWidth;
    const height = this.stageHeight;
    const bossX = this.bossPosition.x;
    const bossY = this.bossPosition.y;
    const gameplayBossMax = this.stageHeight < 700 ? 0.6 : 0.68;
    const availableBossScale = this.mode === "menu"
      ? Phaser.Math.Clamp(this.stageHeight / 980, 0.5, 0.78)
      : Phaser.Math.Clamp((this.arena.y + 36) / 250, 0.34, gameplayBossMax);
    const bossScale = Phaser.Math.Clamp(
      Math.min(this.arena.size / 350, availableBossScale),
      this.mode === "menu" ? 0.5 : 0.34,
      this.mode === "menu" ? 0.78 : gameplayBossMax,
    );
    const pulse = 0.5 + Math.sin(time * 0.0016) * 0.5;
    const isCombatPhase = this.mode === "real" || (this.mode === "test" && this.scriptedTestPhase !== null);
    const phase = isCombatPhase || this.mode === "victory" || this.mode === "defeat" ? this.bossPhase : 0;
    const phaseColor = phase === 0 ? 0xd8b65d : phase === 1 ? 0x42d6d2 : 0xe96868;
    const phaseAccent = phase === 0 ? 0xf0cf79 : phase === 1 ? 0x8df7ff : 0xffd36f;
    const phaseAge = Math.max(0, time - this.phaseChangedAt);
    const transitionPulse = this.mode === "real" ? 1 - Phaser.Math.Clamp(phaseAge / 1200, 0, 1) : 0;

    this.stageGraphics.clear();
    if (this.logoImage) {
      const logoVisible = this.mode === "title" || this.mode === "menu";
      this.logoImage
        .setVisible(logoVisible)
        .setAlpha(this.mode === "menu" ? 0.9 + pulse * 0.08 : 1);
    }

    this.stageGraphics.fillGradientStyle(0x05070d, 0x05070d, 0x111a23, 0x05070d, 1);
    this.stageGraphics.fillRect(0, 0, width, height);

    const bandY = this.mode === "menu" || this.mode === "title" ? Math.max(112, this.stageHeight * 0.22) : this.arena.y - 92;
    this.stageGraphics.fillStyle(0x121b24, 0.46);
    this.stageGraphics.fillRect(0, bandY, width, height - bandY);

    this.stageGraphics.lineStyle(1, 0x7a612f, 0.16);
    for (let y = this.mode === "menu" || this.mode === "title" ? 104 : Math.max(110, this.bossPosition.y - 72); y < height; y += 42) {
      this.stageGraphics.lineBetween(24, y, width - 24, y + 16);
    }

    const columnTop = this.mode === "menu" || this.mode === "title" ? Math.max(106, this.stageHeight * 0.18) : Math.max(76, bossY - 92 * bossScale);
    const columnBottom = Math.min(height, this.arena.y + this.arena.size + 36);
    this.stageGraphics.lineStyle(2, 0x2b4650, 0.22);
    for (const x of [34, width - 34]) {
      this.stageGraphics.lineBetween(x, columnTop, x, columnBottom);
      this.stageGraphics.lineBetween(x + (x < width / 2 ? 10 : -10), columnTop + 22, x + (x < width / 2 ? 10 : -10), columnBottom);
    }

    if (this.mode === "title") {
      return;
    }

    if (this.mode === "menu") {
      return;
    }

    this.stageGraphics.fillStyle(phaseColor, 0.09 + pulse * 0.07 + transitionPulse * 0.08);
    this.stageGraphics.fillCircle(bossX, bossY - 6 * bossScale, (92 + phase * 8 + transitionPulse * 16) * bossScale);
    this.stageGraphics.lineStyle(2 + phase, phaseColor, 0.22 + pulse * 0.18 + transitionPulse * 0.24);
    this.stageGraphics.strokeCircle(bossX, bossY - 6 * bossScale, (104 + phase * 8 + transitionPulse * 18) * bossScale);
    this.stageGraphics.lineStyle(1.5, phaseAccent, 0.12 + phase * 0.08 + transitionPulse * 0.18);
    this.stageGraphics.strokeCircle(bossX, bossY - 6 * bossScale, (126 + phase * 10 + transitionPulse * 12) * bossScale);

    if (isCombatPhase && phase > 0) {
      const orbitCount = phase === 1 ? 6 : 9;
      for (let index = 0; index < orbitCount; index += 1) {
        const angle = time * (phase === 1 ? 0.0012 : 0.0018) + (Math.PI * 2 * index) / orbitCount;
        const radius = (106 + phase * 10) * bossScale;
        const glyphX = bossX + Math.cos(angle) * radius;
        const glyphY = bossY - 6 * bossScale + Math.sin(angle) * radius * 0.62;
        this.stageGraphics.fillStyle(index % 2 === 0 ? phaseAccent : 0xd8b65d, phase === 1 ? 0.42 : 0.5);
        this.stageGraphics.fillCircle(glyphX, glyphY, (2.2 + phase * 0.9 + pulse) * bossScale);
      }
    }

    if (isCombatPhase && phase === 2) {
      this.stageGraphics.lineStyle(2, 0xe96868, 0.32 + pulse * 0.18);
      for (let index = 0; index < 7; index += 1) {
        const angle = -Math.PI * 0.95 + index * (Math.PI * 0.32);
        const start = new Phaser.Math.Vector2(
          bossX + Math.cos(angle) * 74 * bossScale,
          bossY - 52 * bossScale + Math.sin(angle) * 26 * bossScale,
        );
        const end = new Phaser.Math.Vector2(
          bossX + Math.cos(angle) * 116 * bossScale,
          bossY - 58 * bossScale + Math.sin(angle) * 42 * bossScale,
        );
        this.stageGraphics.lineBetween(start.x, start.y, end.x, end.y);
      }
    }

    drawCleopatraPortrait(this.stageGraphics, bossX, bossY, bossScale, { pulse });
  }

  private drawArena(): void {
    const { x, y, size } = this.arena;
    this.arenaGraphics.clear();

    if (this.mode === "menu" || this.mode === "title") {
      return;
    }

    this.arenaGraphics.fillStyle(0x040b12, 0.92);
    this.arenaGraphics.fillRect(x - 18, y - 18, size + 36, size + 36);
    this.arenaGraphics.fillStyle(0x07131b, 0.96);
    this.arenaGraphics.fillRect(x, y, size, size);
    this.arenaGraphics.fillStyle(0x0e2430, 0.28);
    this.arenaGraphics.fillRect(x + 7, y + 7, size - 14, size - 14);

    const gridStep = size / 13;
    this.arenaGraphics.lineStyle(1, 0x31545e, 0.36);
    for (let offset = gridStep; offset < size; offset += gridStep) {
      this.arenaGraphics.lineBetween(x + offset, y, x + offset, y + size);
      this.arenaGraphics.lineBetween(x, y + offset, x + size, y + offset);
    }

    this.arenaGraphics.lineStyle(3, 0xe8ca7f, 0.92);
    this.arenaGraphics.strokeRect(x, y, size, size);
    this.arenaGraphics.lineStyle(1, 0x44d2dc, 0.34);
    this.arenaGraphics.strokeRect(x - 9, y - 9, size + 18, size + 18);
    this.arenaGraphics.lineStyle(1, 0xd7ad52, 0.3);
    this.arenaGraphics.strokeRect(x - 18, y - 18, size + 36, size + 36);

    this.arenaGraphics.lineStyle(3, 0xf0ce75, 0.9);
    const corner = Math.max(24, size * 0.09);
    this.arenaGraphics.lineBetween(x - 6, y - 6, x + corner, y - 6);
    this.arenaGraphics.lineBetween(x - 6, y - 6, x - 6, y + corner);
    this.arenaGraphics.lineBetween(x + size + 6, y - 6, x + size - corner, y - 6);
    this.arenaGraphics.lineBetween(x + size + 6, y - 6, x + size + 6, y + corner);
    this.arenaGraphics.lineBetween(x - 6, y + size + 6, x + corner, y + size + 6);
    this.arenaGraphics.lineBetween(x - 6, y + size + 6, x - 6, y + size - corner);
    this.arenaGraphics.lineBetween(x + size + 6, y + size + 6, x + size - corner, y + size + 6);
    this.arenaGraphics.lineBetween(x + size + 6, y + size + 6, x + size + 6, y + size - corner);

    this.arenaGraphics.fillStyle(0xd4574d, 0.58);
    for (const [glyphX, glyphY] of [
      [x + size * 0.18, y + size * 0.18],
      [x + size * 0.82, y + size * 0.18],
      [x + size * 0.18, y + size * 0.82],
      [x + size * 0.82, y + size * 0.82],
    ]) {
      this.arenaGraphics.fillTriangle(glyphX, glyphY - 4, glyphX - 5, glyphY + 5, glyphX + 5, glyphY + 5);
    }
  }

  private drawUi(time: number): void {
    this.uiGraphics.clear();

    if (this.mode === "title") {
      const pulse = 0.58 + Math.sin(time * 0.004) * 0.28;
      this.promptText.setAlpha(pulse);
      return;
    }

    if (this.mode === "menu") {
      this.drawMenuUi(time);
      return;
    }

    if (this.mode === "victory" || this.mode === "defeat") {
      this.drawEndAnimation(time);
      if (this.endButtonsShown) {
        this.drawEndModal(time);
      }
      return;
    }

    if (this.mode === "real") {
      this.drawHearts(24, 38, 4.7, 21);
      return;
    }

    if (this.mode === "test") {
      return;
    }
  }

  private drawHearts(startX: number, y: number, radius: number, gap: number): void {
    for (let index = 0; index < this.player.state.maxStability; index += 1) {
      const x = startX + index * gap;
      const alpha = index < this.player.state.stability ? 0.95 : 0.2;
      this.uiGraphics.fillStyle(0xe96868, alpha);
      this.uiGraphics.fillCircle(x, y, radius);
      this.uiGraphics.fillCircle(x + radius * 1.23, y, radius);
      this.uiGraphics.fillTriangle(x - radius, y + radius * 0.6, x + radius * 2.25, y + radius * 0.6, x + radius * 0.62, y + radius * 2.55);
      this.uiGraphics.lineStyle(1, 0xffb0a8, alpha * 0.42);
      this.uiGraphics.lineBetween(x - radius * 0.1, y + radius * 0.1, x + radius * 1.35, y + radius * 1.65);
    }
  }

  private drawMenuUi(time: number): void {
    const pulse = 0.5 + Math.sin(time * 0.002) * 0.5;
    const layout = this.getMenuMapLayout();
    const centerX = this.stageWidth / 2;
    const active = layout.nodes[this.menuSelectedIndex] ?? layout.nodes[0]!;
    const lastUnlockedIndex = MENU_BOSSES.reduce((last, boss, index) => boss.enabled ? index : last, 0);
    const unlockedWidth = MENU_BOSSES.length > 1
      ? (layout.mapWidth - 104) * (lastUnlockedIndex / (MENU_BOSSES.length - 1))
      : 0;

    this.uiGraphics.fillStyle(0x061018, 0.2);
    this.uiGraphics.fillRoundedRect(layout.mapX, layout.mapY, layout.mapWidth, layout.mapHeight, 18);

    this.uiGraphics.lineStyle(1, 0xd8b65d, 0.18);
    this.uiGraphics.lineBetween(layout.mapX + 18, layout.mapY + 8, layout.mapX + layout.mapWidth - 18, layout.mapY - 4);
    this.uiGraphics.lineBetween(layout.mapX + 16, layout.mapY + layout.mapHeight - 10, layout.mapX + layout.mapWidth - 16, layout.mapY + layout.mapHeight - 2);

    this.uiGraphics.fillGradientStyle(0x0d2730, 0x07131b, 0x07131b, 0x0d2730, 0.1, 0.24, 0.24, 0.1);
    this.uiGraphics.fillRect(0, layout.railY - 54, this.stageWidth, 108);

    this.uiGraphics.lineStyle(1, 0x42d6d2, 0.16);
    for (let index = 0; index < 6; index += 1) {
      const y = layout.mapY + 40 + index * Math.max(42, layout.mapHeight / 7);
      this.uiGraphics.lineBetween(layout.mapX + 22, y, layout.mapX + layout.mapWidth - 24, y + 10);
    }

    this.uiGraphics.lineStyle(7, 0x2b4650, 0.58);
    this.uiGraphics.lineBetween(-16, layout.railY, this.stageWidth + 16, layout.railY);
    this.uiGraphics.lineStyle(4, 0xd8b65d, 0.64);
    this.uiGraphics.lineBetween(0, layout.railY, centerX, layout.railY);
    this.uiGraphics.lineStyle(1, 0xf0cf79, 0.42);
    this.uiGraphics.lineBetween(0, layout.railY - 5, this.stageWidth, layout.railY - 5);

    this.uiGraphics.fillStyle(0x04080e, 0.54);
    this.uiGraphics.fillCircle(active.x, active.y, active.radius * (1.22 + pulse * 0.05));
    this.uiGraphics.lineStyle(2, 0xd8b65d, 0.28 + pulse * 0.22);
    this.uiGraphics.strokeCircle(active.x, active.y, active.radius * (1.24 + pulse * 0.06));
    this.uiGraphics.lineStyle(1, 0x42d6d2, 0.24 + pulse * 0.16);
    this.uiGraphics.strokeCircle(active.x, active.y, active.radius * (0.94 + pulse * 0.04));

    const progressX = layout.mapX + 52;
    const progressY = layout.dotY;
    const progressWidth = layout.mapWidth - 104;
    this.uiGraphics.lineStyle(4, 0x2b4650, 0.7);
    this.uiGraphics.lineBetween(progressX, progressY, progressX + progressWidth, progressY);
    this.uiGraphics.lineStyle(4, 0xf0cf79, 0.82);
    this.uiGraphics.lineBetween(progressX, progressY, progressX + unlockedWidth, progressY);

    for (let index = 0; index < MENU_BOSSES.length; index += 1) {
      const x = MENU_BOSSES.length === 1
        ? centerX
        : progressX + (progressWidth * index) / (MENU_BOSSES.length - 1);
      const selected = index === this.menuSelectedIndex;
      const enabled = MENU_BOSSES[index]?.enabled ?? false;
      const dotStroke = selected ? (enabled ? 0xf0cf79 : 0x8df7ff) : enabled ? 0xf0cf79 : 0x7f8f92;
      const dotFill = selected ? (enabled ? 0xf0cf79 : 0x8df7ff) : enabled ? 0xf0cf79 : 0x26313a;
      this.uiGraphics.fillStyle(0x07131b, 0.96);
      this.uiGraphics.fillCircle(x, progressY, selected ? 10 : 8);
      this.uiGraphics.lineStyle(selected ? 2 : 1.4, dotStroke, selected ? 0.98 : 0.64);
      this.uiGraphics.strokeCircle(x, progressY, selected ? 10 : 8);
      this.uiGraphics.fillStyle(dotFill, selected ? 0.95 : 0.68);
      this.uiGraphics.fillCircle(x, progressY, selected ? 4.8 : 3.4);
    }
  }

  private getMenuMapLayout(): MenuMapLayout {
    const compact = this.stageHeight < 640;
    const mapWidth = Math.min(this.stageWidth - 28, 368);
    const mapX = (this.stageWidth - mapWidth) / 2;
    const minBelowLogo = this.logoMarkY + 112 * this.logoMarkScale + 34;
    const mapY = Math.max(minBelowLogo, compact ? 144 : 154);
    const mapHeight = Math.max(420, this.stageHeight - mapY - 22);
    const centerX = this.stageWidth / 2;
    const activeRadius = Phaser.Math.Clamp(this.stageWidth * (compact ? 0.145 : 0.155), 50, 64);
    const lockedRadius = Phaser.Math.Clamp(this.stageWidth * 0.106, 34, 44);
    const railY = mapY + (compact ? 124 : 166);
    const sideOffset = mapWidth * 0.51;
    const titleY = railY + (compact ? 78 : 92);
    const playY = titleY + (compact ? 76 : 90);
    const dotY = mapY + mapHeight - (compact ? 42 : 54);

    return {
      mapX,
      mapY,
      mapWidth,
      mapHeight,
      railY,
      titleY,
      playY,
      dotY,
      nodes: MENU_BOSSES.map((boss, index) => {
        const offset = index - this.menuSelectedIndex;
        const selected = index === this.menuSelectedIndex;
        return {
          ...boss,
          index,
          selected,
          x: centerX + offset * sideOffset,
          y: railY,
          radius: selected ? activeRadius : lockedRadius,
        };
      }),
    };
  }

  private drawMenuTrail(points: Array<{ x: number; y: number }>, pulse: number): void {
    this.uiGraphics.lineStyle(4, 0x2b4650, 0.22);
    for (let index = 0; index < points.length - 1; index += 1) {
      this.uiGraphics.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    }

    this.uiGraphics.lineStyle(2, 0xd8b65d, 0.42);
    for (let index = 0; index < 3; index += 1) {
      this.uiGraphics.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    }
    this.uiGraphics.lineStyle(2, 0x34515a, 0.38);
    for (let index = 3; index < points.length - 1; index += 1) {
      this.uiGraphics.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    }

    let bead = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
      const steps = Math.max(2, Math.floor(distance / 18));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const x = Phaser.Math.Linear(start.x, end.x, t);
        const y = Phaser.Math.Linear(start.y, end.y, t);
        const unlocked = index < 3;
        const alpha = unlocked ? 0.5 + Math.sin(bead * 0.9 + pulse * 3) * 0.14 : 0.18;
        this.uiGraphics.fillStyle(unlocked ? 0xf0cf79 : 0x34515a, alpha);
        this.uiGraphics.fillCircle(x, y, unlocked ? 2.3 : 1.8);
        bead += 1;
      }
    }
  }

  private drawEndAnimation(time: number): void {
    const age = Math.max(0, time - this.endingStartedAt);
    const progress = Phaser.Math.Clamp(age / END_MODAL_DELAY_MS, 0, 1);
    const eased = Phaser.Math.Easing.Cubic.Out(progress);
    const x = this.endingPlayerPosition.x;
    const y = this.endingPlayerPosition.y;

    if (this.mode === "victory") {
      this.uiGraphics.fillStyle(0xf0cf79, 0.1 + (1 - progress) * 0.12);
      this.uiGraphics.fillCircle(x, y, 24 + eased * 96);
      this.uiGraphics.lineStyle(2, 0xf0cf79, 0.8 * (1 - progress));
      this.uiGraphics.strokeCircle(x, y, 12 + eased * 84);
      this.uiGraphics.lineStyle(1.5, 0x8df7ff, 0.54 * (1 - progress));
      this.uiGraphics.strokeCircle(x, y, 28 + eased * 112);

      for (let index = 0; index < 22; index += 1) {
        const angle = -Math.PI / 2 + Math.sin(index * 11.7) * 0.58;
        const distance = eased * (46 + (index % 6) * 18);
        const dustX = x + Math.cos(angle) * distance + Math.sin(index * 3.1) * 16;
        const dustY = y + Math.sin(angle) * distance - eased * (36 + index * 1.7);
        const alpha = Phaser.Math.Clamp(0.72 - progress * 0.6, 0, 0.72);
        this.uiGraphics.fillStyle(index % 3 === 0 ? 0x8df7ff : 0xf0cf79, alpha);
        this.uiGraphics.fillCircle(dustX, dustY, 2.2 + (index % 4) * 0.45);
      }

      return;
    }

    this.uiGraphics.fillStyle(0xe96868, 0.11 * (1 - progress));
    this.uiGraphics.fillCircle(x, y, 20 + eased * 68);
    this.uiGraphics.lineStyle(2, 0xff8b87, 0.82 * (1 - progress));
    this.uiGraphics.strokeCircle(x, y, 10 + eased * 58);

    for (let index = 0; index < 28; index += 1) {
      const angle = (Math.PI * 2 * index) / 28 + Math.sin(index * 2.3) * 0.36;
      const distance = eased * (22 + (index % 7) * 9);
      const shardX = x + Math.cos(angle) * distance;
      const shardY = y + Math.sin(angle) * distance + eased * (index % 2 === 0 ? 10 : -8);
      const alpha = Phaser.Math.Clamp(0.88 - progress * 0.76, 0, 0.88);
      const radius = 1.8 + (index % 4) * 0.55;
      this.uiGraphics.fillStyle(index % 3 === 0 ? 0xff8b87 : 0xf0cf79, alpha);
      this.uiGraphics.fillCircle(shardX, shardY, radius);
      this.uiGraphics.lineStyle(1, 0x8df7ff, alpha * 0.28);
      this.uiGraphics.lineBetween(x, y, shardX, shardY);
    }
  }

  private drawEndModal(time: number): void {
    const boxWidth = Math.min(346, this.stageWidth - 28);
    const boxHeight = 306;
    const boxX = (this.stageWidth - boxWidth) / 2;
    const boxY = Math.max(112, (this.stageHeight - boxHeight) / 2 - 8);
    const progress = this.finalProgress;
    const modalAge = Math.max(0, time - this.endingStartedAt - END_MODAL_DELAY_MS);
    const modalAlpha = Phaser.Math.Clamp(modalAge / 260, 0, 1);
    const accent = this.mode === "victory" ? 0xe8ca7f : 0xe96868;
    const mutedAccent = this.mode === "victory" ? 0x8df7ff : 0xffb0a8;

    this.uiGraphics.fillStyle(0x02060a, 0.62 * modalAlpha);
    this.uiGraphics.fillRect(0, 0, this.stageWidth, this.stageHeight);
    this.uiGraphics.fillStyle(0x07131b, 0.96 * modalAlpha);
    this.uiGraphics.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 8);
    this.uiGraphics.lineStyle(2, accent, 0.86 * modalAlpha);
    this.uiGraphics.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 8);

    this.drawResultPortrait(boxX + 58, boxY + 82, 34, modalAlpha);

    const bubbleX = boxX + 104;
    const bubbleY = boxY + 52;
    const bubbleWidth = boxWidth - 126;
    const bubbleHeight = 66;
    this.uiGraphics.fillStyle(0x0b1821, 0.9 * modalAlpha);
    this.uiGraphics.fillRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    this.uiGraphics.lineStyle(1.4, mutedAccent, 0.38 * modalAlpha);
    this.uiGraphics.strokeRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    this.uiGraphics.fillStyle(0x0b1821, 0.9 * modalAlpha);
    this.uiGraphics.fillTriangle(bubbleX, bubbleY + 42, bubbleX - 14, bubbleY + 52, bubbleX, bubbleY + 58);

    const barX = boxX + 42;
    const barY = boxY + 179;
    const barWidth = boxWidth - 84;
    const markers = [
      0,
      PHASE_TWO_AT_MS / FIGHT_DURATION_MS,
      PHASE_THREE_AT_MS / FIGHT_DURATION_MS,
      ULTIMATE_AT_MS / FIGHT_DURATION_MS,
      1,
    ];
    this.uiGraphics.lineStyle(2, 0x7f8f92, 0.5 * modalAlpha);
    this.uiGraphics.lineBetween(barX, barY, barX + barWidth, barY);
    this.uiGraphics.lineStyle(3, accent, 0.82 * modalAlpha);
    this.uiGraphics.lineBetween(barX, barY, barX + barWidth * progress, barY);

    for (let index = 0; index < markers.length; index += 1) {
      const markerProgress = markers[index] ?? 0;
      const markerX = barX + barWidth * markerProgress;
      const isEnd = index === markers.length - 1;
      const reached = progress >= markerProgress;
      const markerHeight = index === 0 || isEnd ? 20 : 26;
      this.uiGraphics.lineStyle(index === 0 || isEnd ? 2 : 3, reached ? accent : 0x7f8f92, (reached ? 0.86 : 0.46) * modalAlpha);
      this.uiGraphics.lineBetween(markerX, barY - markerHeight * 0.5, markerX, barY + markerHeight * 0.5);
      this.uiGraphics.fillStyle(reached ? accent : 0x26313a, (reached ? 0.88 : 0.72) * modalAlpha);
      this.uiGraphics.fillCircle(markerX, barY, index === 0 || isEnd ? 3.2 : 4.2);

      if (isEnd) {
        this.uiGraphics.lineStyle(1.7, reached ? accent : 0x7f8f92, (reached ? 0.82 : 0.5) * modalAlpha);
        this.uiGraphics.lineBetween(markerX, barY - 25, markerX, barY - 8);
        this.uiGraphics.fillStyle(reached ? accent : 0x7f8f92, (reached ? 0.86 : 0.52) * modalAlpha);
        this.uiGraphics.fillTriangle(markerX + 1, barY - 25, markerX + 19, barY - 20, markerX + 1, barY - 15);
      }
    }

    const playerX = Phaser.Math.Clamp(barX + barWidth * progress, barX, barX + barWidth);
    this.uiGraphics.fillStyle(0x061018, 0.92 * modalAlpha);
    this.uiGraphics.fillCircle(playerX, barY, 10);
    this.uiGraphics.fillStyle(0xf8f1d1, 0.96 * modalAlpha);
    this.uiGraphics.fillCircle(playerX, barY, 5.7);
    this.uiGraphics.lineStyle(2, mutedAccent, 0.76 * modalAlpha);
    this.uiGraphics.strokeCircle(playerX, barY, 10.5);

    this.uiGraphics.lineStyle(1, 0x26313a, 0.78 * modalAlpha);
    this.uiGraphics.lineBetween(boxX + 40, boxY + 214, boxX + boxWidth - 40, boxY + 214);
  }

  private rebuildButtons(): void {
    this.clearButtons();

    const centerX = this.stageWidth / 2;

    if (this.mode === "menu") {
      const layout = this.getMenuMapLayout();
      const active = layout.nodes[this.menuSelectedIndex] ?? layout.nodes[0]!;
      const heading = this.add.text(this.stageWidth / 2, layout.mapY + 18, "MEMORY PATH", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "11px",
        color: "#8fa8b0",
        resolution: this.renderScale,
      }).setOrigin(0.5).setDepth(102);
      const progress = this.add.text(this.stageWidth / 2, layout.mapY + 35, `${this.menuSelectedIndex + 1} / ${MENU_BOSSES.length}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "10px",
        color: "#d8b65d",
        resolution: this.renderScale,
      }).setOrigin(0.5).setDepth(102);
      heading.setData("ui-button", true);
      progress.setData("ui-button", true);
      for (const node of layout.nodes) {
        this.makeMemoryNode(
          node,
          node.selected && node.enabled ? () => this.startRealMode() : undefined,
          () => this.setMenuSelection(node.index),
          layout,
        );
      }
      const arrowGap = active.radius * 1.82;
      this.makeMenuArrow(active.x - arrowGap, layout.railY, -1, this.menuSelectedIndex > 0);
      this.makeMenuArrow(active.x + arrowGap, layout.railY, 1, this.menuSelectedIndex < MENU_BOSSES.length - 1);
      this.makeMenuDots(layout);
      this.makeLabel(centerX, layout.playY + 55, active.enabled ? "Swipe to browse memories" : "Clear the previous memory to unlock", 10, active.enabled ? "#78919b" : "#a87856");
      return;
    }

    if (this.mode === "real") {
      this.makeButton(this.stageWidth - 44, 42, "Lab", () => this.startTestMode(), 58);
      return;
    }

    if (this.mode === "test") {
      const buttonWidth = Math.min(156, Math.max(130, this.stageWidth * 0.39));
      const col1 = this.stageWidth * 0.29;
      const col2 = this.stageWidth * 0.71;
      const row1 = this.arena.y + this.arena.size + 44;
      const row2 = row1 + 42;
      this.makeButton(48, 42, "Menu", () => this.showMenu(), 70);
      this.makeButton(col1, row1, "Phase 1", () => this.startTestPhase(FIGHT_PHASES[0]!), buttonWidth);
      this.makeButton(col2, row1, "Phase 2", () => this.startTestPhase(FIGHT_PHASES[1]!), buttonWidth);
      this.makeButton(col1, row2, "Phase 3", () => this.startTestPhase(FIGHT_PHASES[2]!), buttonWidth);
      this.makeButton(col2, row2, "Ultimate", () => this.startTestPhase(FIGHT_PHASES[3]!), buttonWidth);
      return;
    }

    if (this.mode === "victory" || this.mode === "defeat") {
      if (!this.endButtonsShown) {
        return;
      }

      const boxWidth = Math.min(346, this.stageWidth - 28);
      const boxHeight = 306;
      const boxX = (this.stageWidth - boxWidth) / 2;
      const boxY = Math.max(112, (this.stageHeight - boxHeight) / 2 - 8);
      const title = this.mode === "victory" ? "MEMORY CLEARED" : "MEMORY LOST";
      const accent = this.mode === "victory" ? "#f0d58a" : "#ff8b87";
      this.makeLabel(centerX, boxY + 31, title, 23, accent, "Georgia, serif");

      const quote = this.add.text(boxX + 116, boxY + 62, this.endDialogLine, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "12px",
        color: "#d7e5e8",
        resolution: this.renderScale,
        wordWrap: { width: boxWidth - 154, useAdvancedWrap: true },
        align: "left",
        lineSpacing: 2,
      }).setOrigin(0, 0).setDepth(101);
      quote.setData("ui-button", true);

      this.makeEndActionButton(centerX - 66, boxY + 262, "Retry", "retry", () => this.startRealMode());
      this.makeEndActionButton(centerX + 66, boxY + 262, "Menu", "menu", () => this.showMenu());
    }
  }

  private makeMemoryNode(
    node: MemoryNodeLayout,
    onPlay?: () => void,
    onSelect?: () => void,
    layout?: MenuMapLayout,
  ): void {
    const alpha = node.enabled ? 1 : 0.42;
    const graphics = this.add.graphics().setDepth(101);
    const iconScale = node.icon === "cleopatra" ? node.radius * 0.82 : node.radius * 0.74;
    this.drawPhaseIcon(graphics, node.icon, node.x, node.y, iconScale, alpha);

    graphics.lineStyle(node.selected ? 3 : 2, node.enabled ? 0xf0cf79 : 0x34515a, node.enabled ? 0.96 : 0.62);
    graphics.strokeCircle(node.x, node.y, node.radius);
    graphics.lineStyle(1.5, node.enabled ? 0x42d6d2 : 0x2b4650, node.selected ? 0.56 : 0.34);
    graphics.strokeCircle(node.x, node.y, node.radius * (node.selected ? 1.14 : 1.08));

    if (!node.enabled) {
      graphics.fillStyle(0x02060a, 0.5);
      graphics.fillCircle(node.x, node.y, node.radius * 0.78);
      graphics.lineStyle(2, 0xd8b65d, 0.42);
      graphics.strokeRoundedRect(node.x - 9, node.y - 1, 18, 15, 3);
      graphics.lineBetween(node.x - 5, node.y - 1, node.x - 5, node.y - 7);
      graphics.lineBetween(node.x + 5, node.y - 1, node.x + 5, node.y - 7);
      graphics.lineBetween(node.x - 5, node.y - 7, node.x + 5, node.y - 7);
    }

    graphics.setData("ui-button", true);

    const hitRadius = node.selected ? node.radius * 1.22 : node.radius * 1.42;
    const hit = this.add.circle(node.x, node.y, hitRadius, 0xffffff, 0.001)
      .setDepth(103)
      .setInteractive({ useHandCursor: true });
    hit.setData("ui-button", true);
    hit.on("pointerup", () => {
      if (!node.selected && onSelect) {
        onSelect();
        return;
      }
      if (node.selected && onPlay) {
        onPlay();
      }
    });

    if (!node.selected || !layout) {
      return;
    }

    const title = this.add.text(node.x, layout.titleY, node.title, {
      fontFamily: "Georgia, serif",
      fontSize: "29px",
      color: node.enabled ? "#f3d37a" : "#78919b",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(102);

    const era = this.add.text(node.x, layout.titleY + 29, node.era.toUpperCase(), {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "10px",
      color: "#8fa8b0",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(102);

    const status = this.add.text(node.x, layout.titleY + 45, node.status, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "12px",
      color: node.enabled ? "#8edbd6" : "#a87856",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(102);

    title.setData("ui-button", true);
    era.setData("ui-button", true);
    status.setData("ui-button", true);

    const playWidth = 118;
    const playY = layout.playY;
    const playGraphics = this.add.graphics().setDepth(101);
    playGraphics.fillStyle(node.enabled ? 0xe4c46d : 0x14232c, node.enabled ? 0.94 : 0.86);
    playGraphics.fillRoundedRect(node.x - playWidth / 2, playY - 16, playWidth, 32, 10);
    playGraphics.lineStyle(1, node.enabled ? 0xf6df9a : 0x34515a, node.enabled ? 0.76 : 0.62);
    playGraphics.strokeRoundedRect(node.x - playWidth / 2, playY - 16, playWidth, 32, 10);
    const playHit = this.add.rectangle(node.x, playY, playWidth, 32, 0xffffff, 0.001)
      .setDepth(103)
      .setInteractive({ useHandCursor: node.enabled });
    const playText = this.add.text(node.x, playY, node.enabled ? "Play" : "Locked", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "13px",
      color: node.enabled ? "#061018" : "#78919b",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(102);

    if (node.enabled && onPlay) {
      playHit.on("pointerup", onPlay);
      playText.setInteractive({ useHandCursor: true }).on("pointerup", onPlay);
      title.setInteractive({ useHandCursor: true }).on("pointerup", onPlay);
      status.setInteractive({ useHandCursor: true }).on("pointerup", onPlay);
    }
    playHit.on("pointerover", () => playGraphics.setAlpha(1));
    playHit.on("pointerout", () => playGraphics.setAlpha(0.94));

    playGraphics.setData("ui-button", true);
    playHit.setData("ui-button", true);
    playText.setData("ui-button", true);
  }

  private makeMenuArrow(x: number, y: number, direction: -1 | 1, enabled: boolean): void {
    const alpha = enabled ? 0.92 : 0.22;
    const hit = this.add.rectangle(x, y, 44, 82, 0xffffff, 0.001)
      .setDepth(103)
      .setInteractive({ useHandCursor: enabled });
    const text = this.add.text(x, y - 1, direction < 0 ? "<" : ">", {
      fontFamily: "Georgia, serif",
      fontSize: "34px",
      color: enabled ? "#f0cf79" : "#4c636d",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(102);

    if (enabled) {
      hit.on("pointerup", () => this.setMenuSelection(this.menuSelectedIndex + direction));
      text.setInteractive({ useHandCursor: true }).on("pointerup", () => this.setMenuSelection(this.menuSelectedIndex + direction));
    }

    hit.setAlpha(alpha);
    text.setAlpha(alpha);
    hit.setData("ui-button", true);
    text.setData("ui-button", true);
  }

  private makeMenuDots(layout: MenuMapLayout): void {
    const progressX = layout.mapX + 52;
    const progressWidth = layout.mapWidth - 104;
    for (let index = 0; index < MENU_BOSSES.length; index += 1) {
      const x = MENU_BOSSES.length === 1
        ? this.stageWidth / 2
        : progressX + (progressWidth * index) / (MENU_BOSSES.length - 1);
      const hit = this.add.circle(x, layout.dotY, 18, 0xffffff, 0.001)
        .setDepth(103)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => this.setMenuSelection(index));
      hit.setData("ui-button", true);
    }
  }

  private drawPhaseIcon(
    graphics: Phaser.GameObjects.Graphics,
    icon: PhaseIcon,
    x: number,
    y: number,
    scale: number,
    alpha: number,
  ): void {
    graphics.clear();
    graphics.fillStyle(0x07131b, 0.92 * alpha);
    graphics.fillCircle(x, y, scale * 1.04);
    graphics.lineStyle(1.5, 0xd8b65d, 0.72 * alpha);
    graphics.strokeCircle(x, y, scale * 1.08);

    if (icon === "cleopatra") {
      drawCleopatraPortrait(graphics, x, y + scale * 0.02, scale / 104, { alpha, halo: true });
      return;
    }

    if (icon === "davinci") {
      graphics.lineStyle(1, 0xd8b65d, 0.34 * alpha);
      graphics.strokeCircle(x, y, scale * 0.74);
      graphics.lineBetween(x - scale * 0.6, y + scale * 0.34, x + scale * 0.6, y - scale * 0.34);
      graphics.fillStyle(0x6a3f2a, alpha);
      graphics.fillRoundedRect(x - scale * 0.5, y - scale * 0.64, scale, scale * 0.26, scale * 0.08);
      graphics.fillStyle(0xd19a63, alpha);
      graphics.fillEllipse(x, y - scale * 0.08, scale * 0.56, scale * 0.68);
      graphics.fillStyle(0xe7d6b7, 0.92 * alpha);
      graphics.fillTriangle(x - scale * 0.42, y + scale * 0.12, x + scale * 0.42, y + scale * 0.12, x, y + scale * 0.88);
      graphics.lineStyle(2, 0x2a1a12, 0.7 * alpha);
      graphics.lineBetween(x - scale * 0.26, y - scale * 0.08, x - scale * 0.04, y - scale * 0.02);
      graphics.lineBetween(x + scale * 0.04, y - scale * 0.02, x + scale * 0.26, y - scale * 0.08);
      graphics.lineStyle(1.5, 0x42d6d2, 0.72 * alpha);
      graphics.strokeCircle(x + scale * 0.54, y + scale * 0.48, scale * 0.2);
      graphics.lineBetween(x + scale * 0.42, y + scale * 0.58, x + scale * 0.7, y + scale * 0.76);
      return;
    }

    graphics.fillStyle(0x2a2c32, alpha);
    graphics.fillTriangle(x - scale * 0.72, y - scale * 0.18, x, y - scale * 0.86, x + scale * 0.72, y - scale * 0.18);
    graphics.lineStyle(2, 0xd8b65d, 0.72 * alpha);
    graphics.lineBetween(x - scale * 0.62, y - scale * 0.17, x + scale * 0.62, y - scale * 0.17);
    graphics.fillStyle(0xc98845, alpha);
    graphics.fillEllipse(x, y + scale * 0.04, scale * 0.58, scale * 0.74);
    graphics.fillStyle(0x1d1514, alpha);
    graphics.fillEllipse(x - scale * 0.22, y + scale * 0.25, scale * 0.38, scale * 0.14);
    graphics.fillEllipse(x + scale * 0.22, y + scale * 0.25, scale * 0.38, scale * 0.14);
    graphics.fillStyle(0x783532, 0.95 * alpha);
    graphics.fillRoundedRect(x - scale * 0.44, y - scale * 0.33, scale * 0.88, scale * 0.1, scale * 0.04);
    graphics.fillStyle(0x4a3328, 0.9 * alpha);
    graphics.fillTriangle(x - scale * 0.72, y + scale * 0.76, x - scale * 0.2, y + scale * 0.26, x, y + scale * 0.82);
    graphics.fillTriangle(x + scale * 0.72, y + scale * 0.76, x + scale * 0.2, y + scale * 0.26, x, y + scale * 0.82);
  }

  private drawResultPortrait(x: number, y: number, scale: number, alpha: number): void {
    const s = scale;
    this.uiGraphics.fillStyle(0x071018, 0.82 * alpha);
    this.uiGraphics.fillCircle(x, y, s * 1.2);
    this.uiGraphics.lineStyle(1.5, 0xd8b65d, 0.72 * alpha);
    this.uiGraphics.strokeCircle(x, y, s * 1.18);
    this.uiGraphics.lineStyle(1, 0x2b4650, 0.5 * alpha);
    this.uiGraphics.strokeCircle(x, y - s * 0.05, s * 0.9);

    drawCleopatraPortrait(this.uiGraphics, x, y + s * 0.02, s / 88, { alpha });
  }

  private makeEndActionButton(
    x: number,
    y: number,
    label: string,
    icon: "retry" | "menu",
    onClick: () => void,
  ): void {
    const width = 112;
    const height = 38;
    const rect = this.add.rectangle(x, y, width, height, 0x111923, 0.94)
      .setStrokeStyle(1.4, 0xd8b65d, 0.72)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    const iconGraphics = this.add.graphics().setDepth(101);
    this.drawEndButtonIcon(iconGraphics, icon, icon === "retry" ? x - 35 : x - 32, y);

    const text = this.add.text(x + 11, y, label, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "13px",
      color: "#f0d58a",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    rect.on("pointerover", () => rect.setFillStyle(0x1b2a34, 0.98));
    rect.on("pointerout", () => rect.setFillStyle(0x111923, 0.94));
    rect.on("pointerup", onClick);
    text.on("pointerup", onClick);
    rect.setData("ui-button", true);
    text.setData("ui-button", true);
    iconGraphics.setData("ui-button", true);
  }

  private drawEndButtonIcon(graphics: Phaser.GameObjects.Graphics, icon: "retry" | "menu", x: number, y: number): void {
    graphics.clear();
    graphics.lineStyle(2, 0x8df7ff, 0.82);

    if (icon === "retry") {
      const radius = 12.5;
      const thickness = 4.8;
      const startAngle = Phaser.Math.DegToRad(36);
      const endAngle = Phaser.Math.DegToRad(316);
      graphics.lineStyle(thickness, 0x8df7ff, 0.94);
      graphics.beginPath();
      graphics.arc(x, y, radius, startAngle, endAngle, false);
      graphics.strokePath();

      const endX = x + Math.cos(endAngle) * radius;
      const endY = y + Math.sin(endAngle) * radius;
      const tangentX = -Math.sin(endAngle);
      const tangentY = Math.cos(endAngle);
      const normalX = -tangentY;
      const normalY = tangentX;
      const tipX = endX + tangentX * 8.6;
      const tipY = endY + tangentY * 8.6;
      const baseX = endX - tangentX * 3.2;
      const baseY = endY - tangentY * 3.2;
      const halfBase = 7.3;

      graphics.fillStyle(0x8df7ff, 0.96);
      graphics.fillCircle(endX, endY, thickness * 0.48);
      graphics.fillTriangle(
        tipX,
        tipY,
        baseX + normalX * halfBase,
        baseY + normalY * halfBase,
        baseX - normalX * halfBase,
        baseY - normalY * halfBase,
      );
      return;
    }

    graphics.lineBetween(x - 10, y - 7, x + 10, y - 7);
    graphics.lineBetween(x - 10, y, x + 10, y);
    graphics.lineBetween(x - 10, y + 7, x + 10, y + 7);
    graphics.fillStyle(0xd8b65d, 0.78);
    graphics.fillCircle(x - 14, y - 7, 2);
    graphics.fillCircle(x - 14, y, 2);
    graphics.fillCircle(x - 14, y + 7, 2);
  }

  private makeLabel(
    x: number,
    y: number,
    label: string,
    fontSize: number,
    color: string,
    fontFamily = "Trebuchet MS, sans-serif",
  ): void {
    const text = this.add.text(x, y, label, {
      fontFamily,
      fontSize: `${fontSize}px`,
      color,
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(101);
    text.setData("ui-button", true);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, explicitWidth?: number): void {
    const maxWidth = this.mode === "test" ? this.stageWidth * 0.42 : this.stageWidth * 0.72;
    const width = explicitWidth ?? Math.min(label.length > 10 ? 154 : 132, maxWidth);
    const height = this.mode === "test" || this.mode === "real" || this.mode === "victory" || this.mode === "defeat" ? 32 : 42;
    const rect = this.add.rectangle(x, y, width, height, 0x111923, 0.92)
      .setStrokeStyle(1, 0xd8b65d, 0.65)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: this.mode === "test" || (width < 142 && label.length > 9) ? "12px" : "14px",
      color: "#f0d58a",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    rect.on("pointerover", () => rect.setFillStyle(0x1c2b36, 0.96));
    rect.on("pointerout", () => rect.setFillStyle(0x111923, 0.92));
    rect.on("pointerup", onClick);
    text.on("pointerup", onClick);
    rect.setData("ui-button", true);
    text.setData("ui-button", true);
  }

  private clearButtons(): void {
    for (const child of [...this.children.getChildren()]) {
      if (child.getData("ui-button")) {
        child.destroy();
      }
    }
  }
}
