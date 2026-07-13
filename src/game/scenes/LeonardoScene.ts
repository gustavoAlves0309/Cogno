import Phaser from "phaser";
import { AttackManager } from "../attacks/AttackManager";
import { LeonardoAsaEmEstudoAttack } from "../attacks/LeonardoAsaEmEstudoAttack";
import { LeonardoCarroBlindadoAttack } from "../attacks/LeonardoCarroBlindadoAttack";
import { LeonardoPonteSalvadoraAttack } from "../attacks/LeonardoPonteSalvadoraAttack";
import { LeonardoPontoDeFugaAttack } from "../attacks/LeonardoPontoDeFugaAttack";
import { LeonardoSfumatoAttack } from "../attacks/LeonardoSfumatoAttack";
import { LeonardoValvulaCoracaoAttack } from "../attacks/LeonardoValvulaCoracaoAttack";
import { GameAudio, type LeonardoCue } from "../audio/GameAudio";
import {
  createDamageWindowLedger,
  consumeDamageWindow,
  retainDamageWindows,
} from "../mechanics/damageWindowLedger";
import {
  getPerspectiveDuration,
  getPerspectiveProfileLabel,
  type PerspectiveProfile,
} from "../mechanics/leonardoPerspectiveTimeline";
import {
  getWingDuration,
  getWingProfileLabel,
  getWingTimelineSnapshot,
  type WingProfile,
  type WingTimelineSnapshot,
} from "../mechanics/leonardoWingTimeline";
import { PlayerController } from "../PlayerController";
import {
  isLabAvailable,
  readGameProgression,
  recordNormalVictory,
  type GameProgressionProfile,
} from "../progression/GameProgression";
import {
  drawLeonardoKnowledgeSeal,
  drawLeonardoPortrait,
  LEONARDO_MEMORY_PALETTE,
  type LeonardoCastFamily,
  type LeonardoWingPageInput,
} from "../rendering/LeonardoPortrait";
import { drawLeonardoArenaVisuals, type LeonardoVisualStage } from "../rendering/LeonardoArenaVisuals";
import { drawLeonardoHudVisuals } from "../rendering/LeonardoHudVisuals";
import {
  drawMemoryAbsorptionVisuals,
  getMemoryAbsorptionBossState,
  MEMORY_ABSORPTION_DURATION_MS,
} from "../rendering/MemoryAbsorptionVisuals";
import type { ArenaBounds, AttackContext, GameMode } from "../types";
import {
  createLeonardoFightSchedule,
  getLeonardoFightDuration,
  getLeonardoPhase,
  getLeonardoPhaseForElapsed,
  type LeonardoAttackId,
  type LeonardoAttackScriptEntry,
  type LeonardoPhaseDefinition,
  type LeonardoPhaseId,
  type LeonardoScriptEventDefinition,
} from "./leonardoSchedule";

const FALLBACK_WIDTH = 390;
const FALLBACK_HEIGHT = 844;
const PHASE_TRANSITION_MS = 1850;
const DEFEAT_MODAL_DELAY_MS = 1350;
const LEONARDO_VICTORY_LINES = [
  "Observe. Teste. Corrija. Agora, siga além de mim.",
  "O desenho nunca termina; apenas aprende a respirar.",
  "Você leu a máquina antes que ela pudesse lê-lo.",
];
const LEONARDO_DEFEAT_LINES = [
  "O primeiro estudo nunca é a resposta.",
  "Observe novamente. A falha também desenha.",
  "Ainda falta uma linha para entender o todo.",
];
const LEONARDO_ATTACK_CUES: Record<LeonardoAttackId, LeonardoCue> = {
  ponto: "ink",
  asa: "wing",
  ponte: "bridge",
  carro: "gear",
  valvula: "pulse",
  sfumato: "sfumato",
};

type EndOrigin = "real" | "lab-ultimate";

interface ScriptEvent {
  definition: LeonardoScriptEventDefinition;
  done: boolean;
}

interface ButtonRecord {
  graphics: Phaser.GameObjects.Graphics;
  hit: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

type LeonardoLabState = "selector" | "profiles" | "running" | "complete";
type LeonardoLabStudy = "ponto" | "asa";

type LeonardoLabSelection =
  | { attack: "ponto"; profile: PerspectiveProfile }
  | { attack: "asa"; profile: WingProfile };

export class LeonardoScene extends Phaser.Scene {
  private mode: GameMode = "real";
  private readonly arena: ArenaBounds = { x: 52, y: 338, size: 286 };
  private readonly bossPosition = new Phaser.Math.Vector2(FALLBACK_WIDTH / 2, 185);
  private stageWidth = FALLBACK_WIDTH;
  private stageHeight = FALLBACK_HEIGHT;
  private renderScale = 1;
  private currentTime = 0;
  private player!: PlayerController;
  private attacks!: AttackManager;
  private stageGraphics!: Phaser.GameObjects.Graphics;
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private phaseTitleText!: Phaser.GameObjects.Text;
  private phaseSubtitleText!: Phaser.GameObjects.Text;
  private readonly buttons: ButtonRecord[] = [];
  private readonly audio = new GameAudio();

  private scriptStartedAt = 0;
  private scriptEvents: ScriptEvent[] = [];
  private labState: LeonardoLabState = "selector";
  private labStudy: LeonardoLabStudy | null = null;
  private labSelection: LeonardoLabSelection | null = null;
  private labElapsedMs = 0;
  private damageWindowLedger = createDamageWindowLedger();
  private currentFightPhaseId: LeonardoPhaseId | null = null;
  private announcedFightPhase: LeonardoPhaseDefinition | null = null;
  private phaseAnnouncementStartedAt = -PHASE_TRANSITION_MS;
  private bossCastFamily: LeonardoCastFamily | null = null;
  private bossCastStartedAt = Number.NEGATIVE_INFINITY;
  private bossCastDuration = 1;
  private ultimateOpeningStartedAt = Number.NEGATIVE_INFINITY;

  private hudRenderedStability = 3;
  private hudLostSealIndex = -1;
  private hudStabilityChangedAt = Number.NEGATIVE_INFINITY;
  private endingStartedAt = -1;
  private endButtonsShown = false;
  private endOrigin: EndOrigin = "real";
  private endDialogLine = "";
  private readonly endingPlayerPosition = new Phaser.Math.Vector2();
  private readonly endingPlayerArenaAnchor = new Phaser.Math.Vector2(0.5, 0.66);
  private debugLaunchPhase: LeonardoPhaseId | null = null;
  private progressionProfile: GameProgressionProfile = readGameProgression();
  private devMode = false;
  private allowLab = false;
  private readonly handleAudioUnlock = (): void => this.audio.unlock();

  constructor() {
    super("LeonardoScene");
  }

  init(data?: { debugPhase?: LeonardoPhaseId; devMode?: boolean; allowLab?: boolean }): void {
    const profile = readGameProgression();
    this.devMode = data?.devMode ?? profile.devMode;
    this.progressionProfile = { ...profile, devMode: this.devMode };
    this.allowLab = data?.allowLab ?? isLabAvailable("leonardo", this.progressionProfile);
    this.debugLaunchPhase = data?.debugPhase ?? null;
  }

  create(): void {
    this.currentTime = this.game.loop.time;
    this.mode = "real";
    this.currentFightPhaseId = null;
    this.announcedFightPhase = null;
    this.labState = "selector";
    this.labStudy = null;
    this.labSelection = null;
    this.labElapsedMs = 0;
    this.damageWindowLedger = createDamageWindowLedger();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.stageGraphics = undefined!;
    this.arenaGraphics = undefined!;
    this.uiGraphics = undefined!;
    this.timerText = undefined!;
    this.phaseTitleText = undefined!;
    this.phaseSubtitleText = undefined!;
    this.player = undefined!;
    this.attacks = undefined!;
    const size = this.getLogicalSize();
    this.stageGraphics = this.add.graphics().setDepth(0);
    this.arenaGraphics = this.add.graphics().setDepth(10);
    this.uiGraphics = this.add.graphics().setDepth(80);
    this.attacks = new AttackManager();
    this.player = new PlayerController(this, this.arena);

    this.timerText = this.add.text(this.stageWidth - 16, 40, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "14px",
      color: "#f2ddaa",
      resolution: this.renderScale,
    }).setOrigin(1, 0.5).setDepth(92);
    this.phaseTitleText = this.add.text(this.stageWidth / 2, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#f2d99d",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(93).setVisible(false);
    this.phaseSubtitleText = this.add.text(this.stageWidth / 2, 0, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "11px",
      color: "#a9cbd2",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(93).setVisible(false);

    this.applyLayout(size.width, size.height, false);
    this.scale.off("resize", this.handleResize, this);
    this.scale.on("resize", this.handleResize, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.input.off("pointerdown", this.handleAudioUnlock);
    this.input.on("pointerdown", this.handleAudioUnlock);
    if (this.debugLaunchPhase && this.allowLab) {
      this.startTestMode();
      this.startPerspectiveLab(this.getDebugLabProfile(this.debugLaunchPhase));
    } else {
      this.startRealMode();
    }
  }

  update(time: number, delta: number): void {
    this.currentTime = time;
    this.player.update(time, delta);

    if (this.mode === "real") {
      this.updateScript(time);
    } else if (this.isLabRunActive()) {
      this.updateLab(time);
    }

    const hit = this.attacks.update(time, delta, this.player.state);
    if (hit && this.shouldApplyAttackDamage(time) && this.player.damage(time)) {
      this.audio.playCue("damage");
      if (this.player.state.stability <= 0) {
        if (this.mode === "real") {
          this.finish("defeat");
        } else if (this.isLabRunActive()) {
          this.player.restoreStability(time, 700);
        }
      }
    }
    this.damageWindowLedger = retainDamageWindows(
      this.damageWindowLedger,
      this.attacks.getActiveDamageWindowKeys(),
    );

    if ((this.mode === "victory" || this.mode === "defeat") && !this.endButtonsShown) {
      if (time - this.endingStartedAt >= this.getEndModalDelay()) {
        this.endButtonsShown = true;
        if (this.mode === "victory") {
          this.player.setVisible(false);
        }
        this.rebuildButtons();
      }
    }

    this.drawStage(time);
    this.drawArena();
    this.drawUi(time);
  }

  private isLabRunActive(): boolean {
    return this.mode === "test" && this.labState === "running" && this.labSelection !== null;
  }

  private isCombatActive(): boolean {
    return this.mode === "real" || this.isLabRunActive();
  }

  private shouldApplyAttackDamage(time: number): boolean {
    let shouldDamage = false;
    const isInvulnerable = time < this.player.state.invulnerableUntil;

    for (const damageKey of this.attacks.getCollisionDamageWindowKeys()) {
      if (damageKey === null) {
        shouldDamage = true;
        continue;
      }
      const result = consumeDamageWindow(
        this.damageWindowLedger,
        damageKey,
        true,
        isInvulnerable,
      );
      this.damageWindowLedger = result.ledger;
      shouldDamage = result.shouldDamage || shouldDamage;
    }

    return shouldDamage;
  }

  private handleShutdown(): void {
    this.scale.off("resize", this.handleResize, this);
    this.input.off("pointerdown", this.handleAudioUnlock);
    this.attacks?.clear();
    this.player?.setControlEnabled(false);
    this.player?.destroy();
    this.audio.stopMusic();
    this.clearButtons();
  }

  private handleResize(): void {
    const size = this.getLogicalSize();
    this.applyLayout(size.width, size.height, true);
  }

  private getLogicalSize(): { width: number; height: number } {
    this.renderScale = Phaser.Math.Clamp(window.devicePixelRatio || 1, 1, 3);
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private getBottomReserve(): number {
    if (this.mode === "test" && !this.isLabRunActive()) {
      return Phaser.Math.Clamp(this.stageHeight * 0.34, 216, 250);
    }
    if (this.mode === "victory" || this.mode === "defeat") {
      return Phaser.Math.Clamp(this.stageHeight * 0.22, 142, 178);
    }
    return Phaser.Math.Clamp(this.stageHeight * 0.3, 166, 238);
  }

  private applyLayout(width: number, height: number, preservePlayer: boolean): void {
    const oldArena = { ...this.arena };
    const normalizedX = this.player ? (this.player.state.position.x - oldArena.x) / oldArena.size : 0.5;
    const normalizedY = this.player ? (this.player.state.position.y - oldArena.y) / oldArena.size : 0.66;
    this.renderScale = Phaser.Math.Clamp(window.devicePixelRatio || 1, 1, 3);
    this.stageWidth = Math.max(320, Math.floor(width || FALLBACK_WIDTH));
    this.stageHeight = Math.max(480, Math.floor(height || FALLBACK_HEIGHT));
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(this.renderScale);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, this.stageWidth, this.stageHeight);

    const sidePadding = Phaser.Math.Clamp(this.stageWidth * 0.105, 30, 52);
    const bottomReserve = this.getBottomReserve();
    const topReserve = Phaser.Math.Clamp(this.stageHeight * 0.235, 138, 184);
    const sizeByWidth = this.stageWidth - sidePadding * 2;
    const sizeByHeight = this.stageHeight - bottomReserve - topReserve;
    const minArenaSize = this.mode === "test" ? 212 : 226;
    const maxArenaSize = this.mode === "test" ? 260 : this.stageHeight < 700 ? 254 : 274;
    const arenaSize = Math.floor(Phaser.Math.Clamp(Math.min(sizeByWidth, sizeByHeight), minArenaSize, maxArenaSize));
    this.arena.size = arenaSize;
    this.arena.x = Math.floor((this.stageWidth - arenaSize) / 2);
    this.arena.y = Math.floor(this.stageHeight - bottomReserve - arenaSize);
    this.bossPosition.set(
      this.stageWidth / 2,
      Math.max(84, this.arena.y - Phaser.Math.Clamp(this.arena.size * 0.3, 70, 94)),
    );

    if (this.timerText) {
      this.timerText.setPosition(this.stageWidth - 16, 40).setResolution(this.renderScale);
      this.phaseTitleText.setResolution(this.renderScale);
      this.phaseSubtitleText.setResolution(this.renderScale);
    }

    if (preservePlayer && this.player) {
      this.placePlayerFromNormalized(normalizedX, normalizedY);
    }
    if (this.player && this.endingStartedAt >= 0 && (this.mode === "victory" || this.mode === "defeat")) {
      this.placeEndingPlayer();
    }
    if (this.player) {
      this.updatePlayerControlLayout();
    }
    if (this.attacks && this.player) {
      this.attacks.update(this.currentTime, 0, this.player.state);
    }
    if (this.arenaGraphics) {
      this.drawArena();
    }
    this.rebuildButtons();
  }

  private placePlayerFromNormalized(normalizedX: number, normalizedY: number): void {
    const x = this.arena.x + Phaser.Math.Clamp(normalizedX, 0, 1) * this.arena.size;
    const y = this.arena.y + Phaser.Math.Clamp(normalizedY, 0, 1) * this.arena.size;
    this.player.state.position.set(
      Phaser.Math.Clamp(x, this.arena.x + this.player.state.radius, this.arena.x + this.arena.size - this.player.state.radius),
      Phaser.Math.Clamp(y, this.arena.y + this.player.state.radius, this.arena.y + this.arena.size - this.player.state.radius),
    );
  }

  private placeEndingPlayer(): void {
    const x = this.arena.x + Phaser.Math.Clamp(this.endingPlayerArenaAnchor.x, 0, 1) * this.arena.size;
    const y = this.arena.y + Phaser.Math.Clamp(this.endingPlayerArenaAnchor.y, 0, 1) * this.arena.size;
    this.endingPlayerPosition.set(
      Phaser.Math.Clamp(x, this.arena.x + this.player.state.radius, this.arena.x + this.arena.size - this.player.state.radius),
      Phaser.Math.Clamp(y, this.arena.y + this.player.state.radius, this.arena.y + this.arena.size - this.player.state.radius),
    );
    this.player.state.position.copy(this.endingPlayerPosition);
  }

  private updatePlayerControlLayout(): void {
    const joystickRadius = Phaser.Math.Clamp(this.stageWidth * 0.095, 34, 42);
    const selectingLab = this.mode === "test" && !this.isLabRunActive();
    const combat = this.isCombatActive();
    const zoneGap = combat ? 52 : selectingLab ? 126 : 26;
    const minHeight = joystickRadius * (combat ? 3.6 : 2.7);
    const zoneY = Math.min(this.arena.y + this.arena.size + zoneGap, this.stageHeight - minHeight);
    const zoneHeight = this.stageHeight - zoneY - 8;
    this.player.setJoystickLayout(this.stageWidth / 2, zoneY + zoneHeight / 2, joystickRadius);
    this.player.setControlZone(0, zoneY, this.stageWidth, zoneHeight);
  }

  private startRealMode(): void {
    this.mode = "real";
    this.endOrigin = "real";
    this.clearButtons();
    this.attacks.clear();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.labState = "selector";
    this.labStudy = null;
    this.labSelection = null;
    this.labElapsedMs = 0;
    this.damageWindowLedger = createDamageWindowLedger();
    this.player.setVisible(true);
    this.scriptStartedAt = this.getNow();
    this.scriptEvents = createLeonardoFightSchedule().map((definition) => ({ definition, done: false }));
    this.announceFightPhase(getLeonardoPhase("phase1"), false);
    this.timerText.setVisible(true).setText("");
    this.applyLayout(this.stageWidth, this.stageHeight, false);
    this.player.reset();
    this.player.setControlEnabled(true);
    this.resetCombatHudState();
    this.audio.playCue("ui");
    this.rebuildButtons();
  }

  private startTestMode(): void {
    if (!this.allowLab) {
      return;
    }
    this.mode = "test";
    this.endOrigin = "real";
    this.clearButtons();
    this.attacks.clear();
    this.endingStartedAt = -1;
    this.endButtonsShown = false;
    this.labState = "selector";
    this.labStudy = null;
    this.labSelection = null;
    this.labElapsedMs = 0;
    this.damageWindowLedger = createDamageWindowLedger();
    this.scriptEvents = [];
    this.currentFightPhaseId = null;
    this.announcedFightPhase = null;
    this.player.setVisible(true);
    this.timerText.setVisible(true).setText("LEONARDO LAB");
    this.applyLayout(this.stageWidth, this.stageHeight, false);
    this.player.reset();
    this.player.setControlEnabled(true);
    this.rebuildButtons();
  }

  private startPerspectiveLab(profile: PerspectiveProfile): void {
    this.startLab({ attack: "ponto", profile });
  }

  private startWingLab(profile: WingProfile): void {
    this.startLab({ attack: "asa", profile });
  }

  private openLabStudy(study: LeonardoLabStudy): void {
    if (!this.allowLab) {
      return;
    }
    this.mode = "test";
    this.clearButtons();
    this.attacks.clear();
    this.endOrigin = "real";
    this.labState = "profiles";
    this.labStudy = study;
    this.labSelection = null;
    this.labElapsedMs = 0;
    this.scriptEvents = [];
    this.damageWindowLedger = createDamageWindowLedger();
    this.currentFightPhaseId = null;
    this.announcedFightPhase = null;
    this.timerText.setVisible(true).setText(study === "ponto" ? "JANELA LAB" : "ASA LAB");
    this.applyLayout(this.stageWidth, this.stageHeight, false);
    this.player.reset();
    this.player.setVisible(true);
    this.player.setControlEnabled(true);
    this.rebuildButtons();
  }

  private startLab(selection: LeonardoLabSelection): void {
    if (!this.allowLab) {
      return;
    }
    this.mode = "test";
    this.clearButtons();
    this.attacks.clear();
    this.endOrigin = "real";
    this.labState = "running";
    this.labStudy = selection.attack;
    this.labSelection = selection;
    this.labElapsedMs = 0;
    this.scriptStartedAt = this.getNow();
    this.scriptEvents = [];
    this.damageWindowLedger = createDamageWindowLedger();
    const profile = selection.profile;
    this.currentFightPhaseId = profile === "v1" ? "phase1" : profile === "v2" ? "phase2" : "phase3";
    this.announcedFightPhase = null;
    this.phaseAnnouncementStartedAt = Number.NEGATIVE_INFINITY;
    this.triggerBossCast("geometry", selection.attack === "asa" && profile === "v3-mature" ? 650 : 850);
    this.timerText.setVisible(true).setText(`${this.getLabTimerLabel(selection)} · 0.0 s`);
    this.applyLayout(this.stageWidth, this.stageHeight, false);
    this.player.reset();
    this.player.setVisible(true);
    this.player.setControlEnabled(true);
    this.resetCombatHudState();
    const context = this.getAttackContext();
    if (selection.attack === "ponto") {
      this.attacks.add(new LeonardoPontoDeFugaAttack(context, this.scriptStartedAt, selection.profile));
    } else {
      this.attacks.add(new LeonardoAsaEmEstudoAttack(context, this.scriptStartedAt, selection.profile));
    }
    this.rebuildButtons();
  }

  private updateLab(time: number): void {
    if (!this.labSelection) {
      this.startTestMode();
      return;
    }
    const duration = this.getLabSelectionDuration(this.labSelection);
    this.labElapsedMs = Phaser.Math.Clamp(time - this.scriptStartedAt, 0, duration);
    this.timerText.setText(`${this.getLabTimerLabel(this.labSelection)} · ${this.formatLabDuration(this.labElapsedMs)}`);
    if (this.labElapsedMs >= duration) {
      this.completeLab();
    }
  }

  private completeLab(): void {
    this.attacks.clear();
    this.damageWindowLedger = createDamageWindowLedger();
    this.scriptEvents = [];
    this.labState = "complete";
    this.announcedFightPhase = null;
    this.player.setControlEnabled(false);
    this.timerText.setText(this.labSelection
      ? `${this.getLabTimerLabel(this.labSelection)} · ${this.formatLabDuration(this.labElapsedMs)}`
      : "LEONARDO LAB");
    this.applyLayout(this.stageWidth, this.stageHeight, true);
    this.rebuildButtons();
  }

  private getLabSelectionDuration(selection: LeonardoLabSelection): number {
    return selection.attack === "ponto"
      ? getPerspectiveDuration(selection.profile)
      : getWingDuration(selection.profile);
  }

  private getLabSelectionLabel(selection: LeonardoLabSelection): string {
    return selection.attack === "ponto"
      ? getPerspectiveProfileLabel(selection.profile)
      : getWingProfileLabel(selection.profile);
  }

  private getLabTimerLabel(selection: LeonardoLabSelection): string {
    return this.getLabSelectionLabel(selection).replace(/^(Asa|Janela)\s+/, "");
  }

  private restartUltimateLab(): void {
    this.startTestMode();
    this.startPerspectiveLab("v3-mature");
  }

  private getDebugLabProfile(phase: LeonardoPhaseId): PerspectiveProfile {
    if (phase === "phase1") {
      return "v1";
    }
    if (phase === "phase2") {
      return "v2";
    }
    if (phase === "phase3") {
      return "v3-intro";
    }
    return "v3-mature";
  }

  private finish(mode: "victory" | "defeat", origin: EndOrigin = "real"): void {
    if (mode === "victory" && origin === "real" && !this.devMode) {
      this.progressionProfile = recordNormalVictory("leonardo");
    }
    this.endingPlayerPosition.copy(this.player.state.position);
    this.endingPlayerArenaAnchor.set(
      (this.endingPlayerPosition.x - this.arena.x) / this.arena.size,
      (this.endingPlayerPosition.y - this.arena.y) / this.arena.size,
    );
    this.mode = mode;
    this.endOrigin = mode === "victory" ? origin : "real";
    this.clearButtons();
    this.attacks.clear();
    this.player.setControlEnabled(false);
    this.player.setVisible(mode === "victory");
    this.timerText.setVisible(false).setText("");
    this.endingStartedAt = this.currentTime;
    this.endButtonsShown = false;
    this.endDialogLine = mode === "victory" ? LEONARDO_VICTORY_LINES[0] : LEONARDO_DEFEAT_LINES[0];
    this.audio.stopMusic();
    this.audio.playCue(mode === "victory" ? "victory" : "death");
    this.cameras.main.shake(mode === "victory" ? 150 : 230, mode === "victory" ? 0.002 : 0.005);
    this.applyLayout(this.stageWidth, this.stageHeight, true);
  }

  private updateScript(time: number): void {
    const elapsed = time - this.scriptStartedAt;
    const phase = getLeonardoPhaseForElapsed(elapsed);

    if (phase && this.currentFightPhaseId !== phase.id) {
      this.announceFightPhase(phase, this.mode === "real");
    }
    this.timerText.setText(this.formatDuration(this.getStageElapsed(elapsed)));

    for (const event of this.scriptEvents) {
      if (!event.done && elapsed >= event.definition.at) {
        event.done = true;
        this.runScriptEvent(event.definition);
      }
    }

    if (elapsed >= getLeonardoFightDuration() && this.player.state.stability > 0) {
      this.finish("victory");
    }
  }

  private runScriptEvent(event: LeonardoScriptEventDefinition): void {
    if (event.kind === "revision") {
      this.attacks.clear();
      this.triggerBossCast("revision", 700);
      this.audio.playCue("phase");
      return;
    }
    if (event.kind === "opening") {
      this.attacks.clear();
      this.ultimateOpeningStartedAt = this.currentTime;
      this.triggerBossCast("revision", 1600);
      this.audio.playCue("phase");
      return;
    }

    if (event.replaceExisting) {
      this.attacks.clear();
      this.damageWindowLedger = createDamageWindowLedger();
    }

    const family = this.getCastFamily(event.attacks[0]?.id ?? "ponto");
    this.triggerBossCast(family, event.attacks.length > 1 ? 1150 : 850);
    for (const attack of event.attacks) {
      this.audio.playLeonardoCue(LEONARDO_ATTACK_CUES[attack.id]);
      this.spawnStudy(attack);
    }
  }

  private spawnStudy(attack: LeonardoAttackScriptEntry): void {
    const context = this.getAttackContext();
    const time = this.getNow();
    if (attack.id === "ponto") {
      this.attacks.add(new LeonardoPontoDeFugaAttack(context, time, attack.profile));
      return;
    }
    if (attack.id === "asa") {
      this.attacks.add(new LeonardoAsaEmEstudoAttack(context, time, attack.profile));
      return;
    }
    if (attack.id === "ponte") {
      const quarantinedVersion = attack.version === 2 ? 1 : attack.version;
      this.attacks.add(new LeonardoPonteSalvadoraAttack(context, time, quarantinedVersion));
      return;
    }
    if (attack.id === "carro") {
      this.attacks.add(new LeonardoCarroBlindadoAttack(context, time, attack.version));
      return;
    }
    if (attack.id === "valvula") {
      this.attacks.add(new LeonardoValvulaCoracaoAttack(context, time, attack.version));
      return;
    }
    this.attacks.add(new LeonardoSfumatoAttack(context, time, attack.version));
  }

  private getCastFamily(id: LeonardoAttackId): LeonardoCastFamily {
    if (id === "ponto" || id === "asa") {
      return "geometry";
    }
    if (id === "ponte" || id === "carro") {
      return "machine";
    }
    return "anatomy";
  }

  private announceFightPhase(phase: LeonardoPhaseDefinition, feedback: boolean): void {
    this.currentFightPhaseId = phase.id;
    this.announcedFightPhase = phase;
    this.phaseAnnouncementStartedAt = this.getNow();
    this.bossCastFamily = null;
    this.bossCastStartedAt = Number.NEGATIVE_INFINITY;
    if (phase.id === "ultimate") {
      this.ultimateOpeningStartedAt = this.getNow();
    }
    if (feedback) {
      this.audio.playCue("phase");
      this.cameras.main.flash(260, 165, 84, 54, false);
      this.cameras.main.shake(190, phase.id === "ultimate" ? 0.004 : 0.0025);
    }
  }

  private triggerBossCast(family: LeonardoCastFamily, duration: number): void {
    this.bossCastFamily = family;
    this.bossCastStartedAt = this.getNow();
    this.bossCastDuration = duration;
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

  private getStageElapsed(elapsed: number): number {
    if (this.mode === "test") {
      return elapsed;
    }
    if (elapsed >= 270_000) {
      return elapsed - 270_000;
    }
    if (elapsed >= 180_000) {
      return elapsed - 180_000;
    }
    if (elapsed >= 90_000) {
      return elapsed - 90_000;
    }
    return elapsed;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  private formatLabDuration(ms: number): string {
    return `${(Math.max(0, ms) / 1000).toFixed(1)} s`;
  }

  private getPhaseTransitionIntensity(time: number): number {
    const active = this.isCombatActive();
    if (!active) {
      return 0;
    }
    const age = time - this.phaseAnnouncementStartedAt;
    if (age < 0 || age > PHASE_TRANSITION_MS) {
      return 0;
    }
    return Math.sin((age / PHASE_TRANSITION_MS) * Math.PI);
  }

  private getVisualStage(): LeonardoVisualStage {
    if (this.currentFightPhaseId === "phase2") {
      return 1;
    }
    if (this.currentFightPhaseId === "phase3") {
      return 2;
    }
    if (this.currentFightPhaseId === "ultimate") {
      return 3;
    }
    return 0;
  }

  private getUltimateElapsed(time: number): number {
    if (this.currentFightPhaseId !== "ultimate") {
      return 0;
    }
    const labUltimate = this.mode === "test" || this.endOrigin === "lab-ultimate";
    return labUltimate ? time - this.scriptStartedAt : time - this.scriptStartedAt - 270_000;
  }

  private getBossVisualScale(): number {
    const max = this.stageHeight < 700 ? 0.62 : 0.71;
    return Phaser.Math.Clamp(Math.min(this.arena.size / 340, (this.arena.y + 36) / 245), 0.38, max);
  }

  private getWingPageInput(): LeonardoWingPageInput | null {
    if (this.mode !== "test") {
      return null;
    }
    if (!this.labSelection) {
      return null;
    }
    if (this.labSelection.attack !== "asa") {
      return null;
    }

    const profile = this.labSelection.profile;
    const elapsed = this.labState === "complete"
      ? getWingDuration(profile)
      : this.labElapsedMs;
    const snapshot = getWingTimelineSnapshot(profile, elapsed, "page");

    if (profile === "v1") {
      if (snapshot.state === "cadence" && snapshot.passIndex === 1) {
        return { state: "emerging", progress: snapshot.stateProgress };
      }
      return (snapshot.passIndex !== null && snapshot.passIndex >= 1)
        || snapshot.state === "dissolve"
        || snapshot.state === "register"
        || snapshot.state === "complete"
        ? { state: "v1", progress: 1 }
        : { state: "absent", progress: 0 };
    }
    if (profile === "v2") {
      return { state: "v2", progress: getWingPagePassProgress(snapshot, 3) };
    }
    if (profile === "v3-intro") {
      return { state: "v3", progress: getWingPagePassProgress(snapshot, 3) };
    }
    if (elapsed < 650) {
      return { state: "selected-mature", progress: snapshot.pageCueProgress };
    }
    return { state: "v3", progress: 1 };
  }

  private drawStage(time: number): void {
    const width = this.stageWidth;
    const height = this.stageHeight;
    const phase = this.getVisualStage();
    const combat = this.isCombatActive();
    const absorption = this.mode === "victory"
      ? getMemoryAbsorptionBossState(Math.max(0, time - this.endingStartedAt))
      : null;
    const pulse = 0.5 + Math.sin(time * 0.0017) * 0.5;
    const transition = this.getPhaseTransitionIntensity(time);
    const castAge = time - this.bossCastStartedAt;
    const casting = combat && this.bossCastFamily !== null && castAge >= 0 && castAge < this.bossCastDuration;
    const castProgress = casting ? Phaser.Math.Clamp(castAge / this.bossCastDuration, 0, 1) : 1;
    const bossScale = this.getBossVisualScale() * (absorption?.scale ?? 1);
    const bossAlpha = absorption?.alpha ?? 1;
    const ultimate = combat && this.currentFightPhaseId === "ultimate";
    const ultimateElapsed = this.getUltimateElapsed(time);
    const finale = ultimate ? Phaser.Math.Clamp((ultimateElapsed - 67_000) / 8_000, 0, 1) : 0;
    const portraitTarget = this.mode === "victory" ? this.endingPlayerPosition : this.player.state.position;
    const targetX = combat || this.mode === "victory"
      ? Phaser.Math.Clamp((portraitTarget.x - this.bossPosition.x) / (this.arena.size * 0.48), -1, 1)
      : 0;
    const targetY = combat || this.mode === "victory"
      ? Phaser.Math.Clamp((portraitTarget.y - this.bossPosition.y) / this.arena.size, -1, 1)
      : 0;

    this.stageGraphics.clear();
    this.stageGraphics.fillGradientStyle(0x07090b, 0x07090b, 0x231f1a, 0x0b0b0d, 1);
    this.stageGraphics.fillRect(0, 0, width, height);
    this.stageGraphics.fillStyle(0x382b20, 0.3);
    this.stageGraphics.fillRect(0, Math.max(96, this.bossPosition.y - 74), width, height);
    this.stageGraphics.lineStyle(1, 0x7d644a, 0.15);
    for (let y = Math.max(90, this.bossPosition.y - 102); y < height; y += 44) {
      this.stageGraphics.lineBetween(20, y, width - 20, y + 14);
    }

    const haloRadius = (98 + phase * 12 + transition * 16) * bossScale;
    this.stageGraphics.fillStyle(phase === 3 ? 0x4e7582 : 0x7d4e2f, (0.05 + pulse * 0.04 + transition * 0.05) * (absorption?.auraAlpha ?? 1));
    this.stageGraphics.fillCircle(this.bossPosition.x, this.bossPosition.y - 6 * bossScale, haloRadius * 0.84);
    this.stageGraphics.lineStyle(1.6 + phase * 0.35, phase === 3 ? 0x83c4d2 : 0xc99862, (0.2 + pulse * 0.15 + transition * 0.2) * (absorption?.auraAlpha ?? 1));
    this.stageGraphics.strokeCircle(this.bossPosition.x, this.bossPosition.y - 6 * bossScale, haloRadius);
    this.stageGraphics.lineStyle(1.1, 0xc94b40, (0.14 + transition * 0.26 + finale * 0.18) * (absorption?.auraAlpha ?? 1));
    this.stageGraphics.strokeEllipse(this.bossPosition.x, this.bossPosition.y - 6 * bossScale, haloRadius * 2.15, haloRadius * 1.24);

    drawLeonardoPortrait(
      this.stageGraphics,
      this.bossPosition.x,
      this.bossPosition.y + (absorption?.yOffset ?? 0) * bossScale,
      bossScale,
      {
        alpha: bossAlpha,
        pulse,
        time,
        targetX,
        targetY,
        phase,
        transition,
        castFamily: casting ? this.bossCastFamily : null,
        castProgress,
        ultimate,
        finale: Math.max(finale, absorption?.overload ?? 0),
        collapse: absorption?.collapse ?? 0,
        wingPage: this.getWingPageInput(),
      },
    );
  }

  private drawArena(): void {
    this.arenaGraphics.clear();
    if (this.mode === "victory" || this.mode === "defeat" || this.mode === "real" || this.mode === "test") {
      const ultimateElapsed = this.getUltimateElapsed(this.currentTime);
      drawLeonardoArenaVisuals(this.arenaGraphics, {
        arena: this.arena,
        time: this.currentTime,
        stage: this.getVisualStage(),
        transition: this.getPhaseTransitionIntensity(this.currentTime),
        ultimateOpening: this.currentFightPhaseId === "ultimate"
          ? Phaser.Math.Clamp(ultimateElapsed / 8_000, 0, 1)
          : 0,
      });
    }
  }

  private drawUi(time: number): void {
    this.uiGraphics.clear();
    this.hidePhaseTransitionText();

    const combat = this.isCombatActive();
    if (combat) {
      this.updateCombatHudDamageState(time);
      drawLeonardoHudVisuals(this.uiGraphics, {
        time,
        stageWidth: this.stageWidth,
        stage: this.getVisualStage(),
        stability: this.player.state.stability,
        maxStability: this.player.state.maxStability,
        lostSealIndex: this.hudLostSealIndex,
        stabilityChangeAge: time - this.hudStabilityChangedAt,
      });
      this.drawPhaseTransitionOverlay(time);
      return;
    }

    if (this.mode === "test") {
      this.drawLabBackdrop(time);
      return;
    }

    this.drawEndAnimation(time);
    if (this.endButtonsShown) {
      this.drawEndModal();
    }
  }

  private updateCombatHudDamageState(time: number): void {
    const stability = this.player.state.stability;
    if (stability !== this.hudRenderedStability) {
      this.hudLostSealIndex = Phaser.Math.Clamp(stability, 0, this.player.state.maxStability - 1);
      this.hudStabilityChangedAt = time;
      this.hudRenderedStability = stability;
    }
  }

  private resetCombatHudState(): void {
    this.hudRenderedStability = this.player.state.maxStability;
    this.hudLostSealIndex = -1;
    this.hudStabilityChangedAt = Number.NEGATIVE_INFINITY;
  }

  private drawPhaseTransitionOverlay(time: number): void {
    if (!this.announcedFightPhase) {
      return;
    }
    const age = time - this.phaseAnnouncementStartedAt;
    if (age < 0 || age > PHASE_TRANSITION_MS) {
      return;
    }
    const progress = Phaser.Math.Clamp(age / PHASE_TRANSITION_MS, 0, 1);
    const alpha = Math.sin(progress * Math.PI);
    const phase = this.announcedFightPhase;
    const bannerY = Math.max(96, this.arena.y - 76);
    const color = phase.id === "ultimate" ? 0xffd38c : phase.visualStage === 1 ? 0x7dc1bd : phase.visualStage === 2 ? 0xdf8270 : 0xe0b76f;

    this.uiGraphics.fillStyle(0x130f0d, 0.65 * alpha);
    this.uiGraphics.fillRect(0, bannerY - 28, this.stageWidth, 56);
    this.uiGraphics.lineStyle(1.8, color, 0.58 * alpha);
    this.uiGraphics.lineBetween(26, bannerY - 27, this.stageWidth - 26, bannerY - 27);
    this.uiGraphics.lineBetween(26, bannerY + 27, this.stageWidth - 26, bannerY + 27);
    this.uiGraphics.lineStyle(1, 0x76b6c6, 0.35 * alpha);
    for (let index = 0; index < 5; index += 1) {
      const x = Phaser.Math.Linear(46, this.stageWidth - 46, index / 4);
      this.uiGraphics.lineBetween(x, bannerY - 21, this.stageWidth / 2, bannerY + 20);
    }
    this.phaseTitleText.setText(phase.title).setPosition(this.stageWidth / 2, bannerY - 8).setAlpha(alpha).setVisible(true);
    this.phaseSubtitleText.setText(phase.subtitle).setPosition(this.stageWidth / 2, bannerY + 14).setAlpha(alpha).setVisible(true);
  }

  private hidePhaseTransitionText(): void {
    if (this.phaseTitleText) {
      this.phaseTitleText.setVisible(false);
      this.phaseSubtitleText.setVisible(false);
    }
  }

  private drawLabBackdrop(time: number): void {
    const pulse = 0.5 + Math.sin(time * 0.004) * 0.5;
    const y = Math.max(98, this.arena.y - 70);
    this.uiGraphics.fillStyle(0x16120f, 0.56);
    this.uiGraphics.fillRect(0, y - 28, this.stageWidth, 56);
    this.uiGraphics.lineStyle(1.3, 0xc99b62, 0.42 + pulse * 0.12);
    this.uiGraphics.lineBetween(28, y - 22, this.stageWidth - 28, y - 22);
    this.uiGraphics.lineBetween(28, y + 22, this.stageWidth - 28, y + 22);
    const complete = this.labState === "complete" && this.labSelection !== null;
    const title = this.labState === "profiles" && this.labStudy
      ? this.labStudy === "ponto" ? "JANELA DE PERSPECTIVA" : "ASA EM ESTUDO"
      : "LEONARDO LAB";
    const subtitle = complete && this.labSelection
      ? `${this.getLabSelectionLabel(this.labSelection)} concluído — repetir ou escolher outro estudo`
      : this.labState === "profiles"
        ? "Escolha uma versão para observar isoladamente"
        : "Escolha um estudo reconstruído";
    this.phaseTitleText.setText(title).setPosition(this.stageWidth / 2, y - 7).setAlpha(0.94).setVisible(true);
    this.phaseSubtitleText
      .setText(subtitle)
      .setPosition(this.stageWidth / 2, y + 15)
      .setAlpha(0.82)
      .setVisible(true);
  }

  private drawEndAnimation(time: number): void {
    const age = Math.max(0, time - this.endingStartedAt);
    if (this.mode === "victory") {
      drawMemoryAbsorptionVisuals(this.uiGraphics, {
        elapsedMs: age,
        source: this.bossPosition,
        target: this.endingPlayerPosition,
        sourceRadius: this.getBossVisualScale() * 116,
        targetRadius: this.player.state.radius,
        palette: LEONARDO_MEMORY_PALETTE,
        drawSeal: drawLeonardoKnowledgeSeal,
      });
      return;
    }

    const progress = Phaser.Math.Clamp(age / DEFEAT_MODAL_DELAY_MS, 0, 1);
    this.uiGraphics.fillStyle(0x5d2828, Phaser.Math.Easing.Cubic.Out(progress) * 0.16);
    this.uiGraphics.fillRect(0, 0, this.stageWidth, this.stageHeight);
  }

  private drawEndModal(): void {
    const boxWidth = Math.min(346, this.stageWidth - 28);
    const boxHeight = 300;
    const boxX = (this.stageWidth - boxWidth) / 2;
    const boxY = Math.max(112, (this.stageHeight - boxHeight) / 2 - 6);
    const victory = this.mode === "victory";
    this.uiGraphics.fillStyle(0x100e0d, 0.94);
    this.uiGraphics.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 14);
    this.uiGraphics.lineStyle(1.5, victory ? 0xe3bd75 : 0xd86e64, 0.84);
    this.uiGraphics.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 14);
    this.uiGraphics.lineStyle(1, 0x6fa7b8, 0.34);
    this.uiGraphics.strokeRoundedRect(boxX + 7, boxY + 7, boxWidth - 14, boxHeight - 14, 10);
  }

  private rebuildButtons(): void {
    this.clearButtons();
    if (this.mode === "real") {
      if (this.allowLab) {
        this.makeButton(this.stageWidth - 42, 84, "Lab", () => this.startTestMode(), 66);
      }
      return;
    }
    if (this.mode === "test") {
      if (this.isLabRunActive()) {
        this.makeButton(this.stageWidth - 42, 84, "Lab", () => this.startTestMode(), 68);
        return;
      }

      const width = Math.min(154, Math.max(128, this.stageWidth * 0.38));
      const row1 = Math.min(this.arena.y + this.arena.size + 46, this.stageHeight - 116);
      const row2 = row1 + 44;
      if (this.labState === "complete" && this.labSelection !== null) {
        const completedSelection = this.labSelection;
        this.makeButton(this.stageWidth * 0.3, row1, "Repeat", () => this.startLab(completedSelection), width);
        this.makeButton(this.stageWidth * 0.7, row1, "Lab", () => this.startTestMode(), width);
        return;
      }

      if (this.labState === "profiles" && this.labStudy) {
        this.makeButton(48, 42, "Lab", () => this.startTestMode(), 72);
        if (this.labStudy === "ponto") {
          this.makeButton(this.stageWidth * 0.25, row1, getPerspectiveProfileLabel("v1"), () => this.startPerspectiveLab("v1"), width);
          this.makeButton(this.stageWidth * 0.75, row1, getPerspectiveProfileLabel("v2"), () => this.startPerspectiveLab("v2"), width);
          this.makeButton(this.stageWidth * 0.25, row2, getPerspectiveProfileLabel("v3-intro"), () => this.startPerspectiveLab("v3-intro"), width, 10);
          this.makeButton(this.stageWidth * 0.75, row2, getPerspectiveProfileLabel("v3-mature"), () => this.startPerspectiveLab("v3-mature"), width, 10);
        } else {
          this.makeButton(this.stageWidth * 0.25, row1, getWingProfileLabel("v1"), () => this.startWingLab("v1"), width);
          this.makeButton(this.stageWidth * 0.75, row1, getWingProfileLabel("v2"), () => this.startWingLab("v2"), width);
          this.makeButton(this.stageWidth * 0.25, row2, getWingProfileLabel("v3-intro"), () => this.startWingLab("v3-intro"), width, 10);
          this.makeButton(this.stageWidth * 0.75, row2, getWingProfileLabel("v3-mature"), () => this.startWingLab("v3-mature"), width, 10);
        }
        return;
      }

      this.makeButton(48, 42, "Menu", () => this.returnToMenu(), 72);
      this.makeButton(this.stageWidth * 0.3, row1, "Janela", () => this.openLabStudy("ponto"), width);
      this.makeButton(this.stageWidth * 0.7, row1, "Asa", () => this.openLabStudy("asa"), width);
      return;
    }
    if ((this.mode === "victory" || this.mode === "defeat") && this.endButtonsShown) {
      const boxWidth = Math.min(346, this.stageWidth - 28);
      const boxX = (this.stageWidth - boxWidth) / 2;
      const boxY = Math.max(112, (this.stageHeight - 300) / 2 - 6);
      const victory = this.mode === "victory";
      const labVictory = victory && this.endOrigin === "lab-ultimate" && this.allowLab;
      this.makeStaticText(this.stageWidth / 2, boxY + 34, victory ? "MEMORY ACQUIRED" : "MEMORY LOST", 22, victory ? "#f0d398" : "#ef948b", "Georgia, serif");
      this.makeStaticText(this.stageWidth / 2, boxY + 80, this.endDialogLine, 12, "#d8d0bc", "Trebuchet MS, sans-serif", boxWidth - 62);
      const offset = labVictory ? 72 : 64;
      const actionWidth = labVictory ? 132 : 112;
      this.makeButton(
        this.stageWidth / 2 - offset,
        boxY + 256,
        labVictory ? "Retry Ultimate" : "Retry",
        () => labVictory ? this.restartUltimateLab() : this.startRealMode(),
        actionWidth,
      );
      this.makeButton(
        this.stageWidth / 2 + offset,
        boxY + 256,
        labVictory ? "Lab" : "Menu",
        () => labVictory ? this.startTestMode() : this.returnToMenu(),
        actionWidth,
      );
    }
  }

  private returnToMenu(): void {
    this.attacks.clear();
    this.audio.stopMusic();
    this.scene.start("CleopatraScene", { openMenu: true });
  }

  private clearButtons(): void {
    for (const button of this.buttons) {
      button.graphics.destroy();
      button.hit.destroy();
      button.label.destroy();
    }
    this.buttons.length = 0;
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, width: number, fontSize = 12): void {
    const height = 32;
    const graphics = this.add.graphics().setDepth(100);
    const hit = this.add.rectangle(x, y, width, height, 0xffffff, 0.001).setDepth(102).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: `${fontSize}px`,
      color: "#f0d9a1",
      resolution: this.renderScale,
    }).setOrigin(0.5).setDepth(101);
    const draw = (hovered: boolean) => {
      graphics.clear();
      graphics.fillStyle(hovered ? 0x382718 : 0x1c1713, hovered ? 0.96 : 0.9);
      graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      graphics.lineStyle(1.2, hovered ? 0xf0d99c : 0xb88955, hovered ? 0.9 : 0.66);
      graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      graphics.lineStyle(0.8, 0x76acbc, hovered ? 0.58 : 0.34);
      graphics.lineBetween(x - width / 2 + 7, y + height / 2 - 5, x + width / 2 - 7, y + height / 2 - 5);
    };
    draw(false);
    hit.on("pointerover", () => draw(true));
    hit.on("pointerout", () => draw(false));
    hit.on("pointerup", () => {
      this.audio.playCue("ui");
      onClick();
    });
    this.buttons.push({ graphics, hit, label: text });
  }

  private makeStaticText(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
    family: string,
    wrapWidth?: number,
  ): void {
    const text = this.add.text(x, y, content, {
      fontFamily: family,
      fontSize: `${size}px`,
      color,
      resolution: this.renderScale,
      align: "center",
      wordWrap: wrapWidth ? { width: wrapWidth, useAdvancedWrap: true } : undefined,
      lineSpacing: 2,
    }).setOrigin(0.5).setDepth(101);
    const graphics = this.add.graphics().setDepth(99);
    const hit = this.add.rectangle(-1000, -1000, 1, 1, 0xffffff, 0).setDepth(99);
    this.buttons.push({ graphics, hit, label: text });
  }

  private getEndModalDelay(): number {
    return this.mode === "victory" ? MEMORY_ABSORPTION_DURATION_MS : DEFEAT_MODAL_DELAY_MS;
  }
}

function getWingPagePassProgress(
  snapshot: WingTimelineSnapshot,
  passCount: number,
): number {
  if (snapshot.state === "windup") {
    return 0;
  }
  if (snapshot.state === "active" && snapshot.passIndex !== null) {
    return Phaser.Math.Clamp(
      (snapshot.passIndex + snapshot.passProgress) / passCount,
      0,
      1,
    );
  }
  if (snapshot.state === "cadence" && snapshot.passIndex !== null) {
    return Phaser.Math.Clamp(snapshot.passIndex / passCount, 0, 1);
  }
  return 1;
}
