import Phaser from "phaser";
import { AttackManager } from "../attacks/AttackManager";
import { HorusSunAttack } from "../attacks/HorusSunAttack";
import { NileRiseAttack } from "../attacks/NileRiseAttack";
import { ScarabVolleyAttack } from "../attacks/ScarabVolleyAttack";
import { WadjetConeAttack } from "../attacks/WadjetConeAttack";
import { PlayerController } from "../PlayerController";
import type { ArenaBounds, AttackContext, GameMode } from "../types";

const WIDTH = 390;
const HEIGHT = 844;

interface ScriptEvent {
  at: number;
  run: () => void;
  done: boolean;
}

export class CleopatraScene extends Phaser.Scene {
  private mode: GameMode = "menu";
  private readonly arena: ArenaBounds = { x: 52, y: 338, size: 286 };
  private readonly bossPosition = new Phaser.Math.Vector2(WIDTH / 2, 185);
  private player!: PlayerController;
  private attacks!: AttackManager;
  private stageGraphics!: Phaser.GameObjects.Graphics;
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private scriptStartedAt = 0;
  private scriptEvents: ScriptEvent[] = [];
  private loopAttack: (() => void) | null = null;
  private nextLoopAt = 0;

  constructor() {
    super("CleopatraScene");
  }

  create(): void {
    this.stageGraphics = this.add.graphics().setDepth(0);
    this.arenaGraphics = this.add.graphics().setDepth(10);
    this.uiGraphics = this.add.graphics().setDepth(80);
    this.attacks = new AttackManager();
    this.player = new PlayerController(this, this.arena);

    this.titleText = this.add.text(WIDTH / 2, 42, "COGNO", {
      fontFamily: "Georgia, serif",
      fontSize: "34px",
      color: "#f0cf79",
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(90);

    this.subtitleText = this.add.text(WIDTH / 2, 78, "Cleopatra - prototipo", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "13px",
      color: "#9db3c2",
    }).setOrigin(0.5).setDepth(90);

    this.timerText = this.add.text(WIDTH / 2, 296, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "13px",
      color: "#e8d49b",
    }).setOrigin(0.5).setDepth(90);

    this.drawStage(0);
    this.drawArena();
    this.showMenu();
  }

  update(time: number, delta: number): void {
    this.drawStage(time);
    this.player.update(time);

    const hit = this.attacks.update(time, delta, this.player.state);
    if (hit && this.player.damage(time) && this.player.state.stability <= 0) {
      this.finish("defeat");
    }

    if (this.mode === "real") {
      this.updateScript(time);
    }

    if (this.mode === "test" && this.loopAttack && time >= this.nextLoopAt) {
      this.loopAttack();
      this.nextLoopAt = time + 4200;
    }

    this.drawUi(time);
  }

  private showMenu(): void {
    this.mode = "menu";
    this.attacks.clear();
    this.loopAttack = null;
    this.timerText.setText("Escolha o modo");
    this.clearButtons();

    this.makeButton(WIDTH / 2, 690, "Modo Real", () => this.startRealMode());
    this.makeButton(WIDTH / 2, 744, "Modo Teste", () => this.startTestMode());
  }

  private startRealMode(): void {
    this.mode = "real";
    this.clearButtons();
    this.attacks.clear();
    this.loopAttack = null;
    this.player.reset();
    this.scriptStartedAt = this.time.now;
    this.scriptEvents = this.createScript();
    this.timerText.setText("Sobreviva ao ritual");
  }

  private startTestMode(): void {
    this.mode = "test";
    this.clearButtons();
    this.attacks.clear();
    this.loopAttack = null;
    this.player.reset();
    this.timerText.setText("Laboratorio de ataques");

    this.makeButton(86, 696, "Escaravelhos", () => this.spawnScarabVolley());
    this.makeButton(304, 696, "Nilo", () => this.spawnNile());
    this.makeButton(86, 750, "Wadjet", () => this.spawnWadjet());
    this.makeButton(304, 750, "Horus", () => this.spawnHorus());
    this.makeButton(86, 804, "Loop", () => this.toggleLoop());
    this.makeButton(304, 804, "Modo Real", () => this.startRealMode());
  }

  private finish(mode: "victory" | "defeat"): void {
    this.mode = mode;
    this.clearButtons();
    this.loopAttack = null;
    this.attacks.clear();
    this.timerText.setText(mode === "victory" ? "Vitoria: memoria atravessada" : "Derrota: estabilidade perdida");
    this.makeButton(WIDTH / 2, 706, "Reiniciar", () => this.startRealMode());
    this.makeButton(WIDTH / 2, 760, "Menu", () => this.showMenu());
  }

  private createScript(): ScriptEvent[] {
    const events: Array<[number, () => void]> = [
      [900, () => this.spawnScarabVolley()],
      [4700, () => this.spawnScarabVolley()],
      [9400, () => this.spawnNile(this.arena.y + this.arena.size * 0.72)],
      [15000, () => this.spawnScarabVolley()],
      [20200, () => this.spawnNile(this.arena.y + this.arena.size * 0.46)],
      [22800, () => this.spawnWadjet("left")],
      [28200, () => this.spawnWadjet("right")],
      [33000, () => this.spawnScarabVolley()],
      [36500, () => this.spawnHorus()],
      [47200, () => this.spawnNile(this.arena.y + this.arena.size * 0.62)],
      [49400, () => this.spawnScarabVolley()],
      [52400, () => this.spawnWadjet("left")],
    ];

    return events.map(([at, run]) => ({ at, run, done: false }));
  }

  private updateScript(time: number): void {
    const elapsed = time - this.scriptStartedAt;
    for (const event of this.scriptEvents) {
      if (!event.done && elapsed >= event.at) {
        event.done = true;
        event.run();
      }
    }

    const remaining = Math.max(0, Math.ceil((58500 - elapsed) / 1000));
    this.timerText.setText(`Sobreviva: ${remaining}s`);

    if (elapsed >= 58500 && this.player.state.stability > 0) {
      this.finish("victory");
    }
  }

  private spawnScarabVolley(): void {
    if (this.mode === "test") {
      this.timerText.setText("Teste: escaravelhos");
    }
    this.attacks.add(new ScarabVolleyAttack(this.getAttackContext(), this.time.now));
  }

  private spawnNile(targetY?: number): void {
    if (this.mode === "test") {
      this.timerText.setText("Teste: Nilo");
    }
    this.attacks.add(new NileRiseAttack(this.getAttackContext(), this.time.now, targetY));
  }

  private spawnWadjet(side?: "left" | "right"): void {
    if (this.mode === "test") {
      this.timerText.setText("Teste: Wadjet");
    }
    this.attacks.add(new WadjetConeAttack(this.getAttackContext(), this.time.now, side));
  }

  private spawnHorus(): void {
    if (this.mode === "test") {
      this.timerText.setText("Teste: Horus");
    }
    this.attacks.add(new HorusSunAttack(this.getAttackContext(), this.time.now));
  }

  private toggleLoop(): void {
    if (this.loopAttack) {
      this.loopAttack = null;
      this.timerText.setText("Loop desligado");
      return;
    }

    this.loopAttack = () => this.spawnScarabVolley();
    this.nextLoopAt = this.time.now;
    this.timerText.setText("Loop: escaravelhos");
  }

  private getAttackContext(): AttackContext {
    return {
      scene: this,
      arena: this.arena,
      player: this.player.state,
      bossPosition: this.bossPosition,
      stageWidth: WIDTH,
      stageHeight: HEIGHT,
    };
  }

  private drawStage(time: number): void {
    const pulse = 0.5 + Math.sin(time * 0.0016) * 0.5;
    this.stageGraphics.clear();

    this.stageGraphics.fillGradientStyle(0x05070d, 0x05070d, 0x111a23, 0x05070d, 1);
    this.stageGraphics.fillRect(0, 0, WIDTH, HEIGHT);

    this.stageGraphics.lineStyle(1, 0x6c552b, 0.18);
    for (let y = 130; y < HEIGHT; y += 42) {
      this.stageGraphics.lineBetween(34, y, WIDTH - 34, y + 16);
    }

    this.stageGraphics.fillStyle(0xd8b65d, 0.11 + pulse * 0.06);
    this.stageGraphics.fillCircle(this.bossPosition.x, this.bossPosition.y, 86);
    this.stageGraphics.fillStyle(0x10131b, 0.98);
    this.stageGraphics.fillEllipse(this.bossPosition.x, this.bossPosition.y + 16, 84, 116);
    this.stageGraphics.fillStyle(0xd9ad4e, 0.95);
    this.stageGraphics.fillEllipse(this.bossPosition.x, this.bossPosition.y - 20, 54, 48);
    this.stageGraphics.fillStyle(0x10131b, 1);
    this.stageGraphics.fillEllipse(this.bossPosition.x, this.bossPosition.y - 13, 36, 20);
    this.stageGraphics.fillStyle(0xf1d783, 0.95);
    this.stageGraphics.fillTriangle(this.bossPosition.x - 27, this.bossPosition.y - 50, this.bossPosition.x, this.bossPosition.y - 92, this.bossPosition.x + 27, this.bossPosition.y - 50);
    this.stageGraphics.lineStyle(2, 0xe2bc61, 0.78);
    this.stageGraphics.strokeEllipse(this.bossPosition.x, this.bossPosition.y + 16, 92, 124);
  }

  private drawArena(): void {
    const { x, y, size } = this.arena;
    this.arenaGraphics.clear();

    this.arenaGraphics.fillStyle(0x071018, 0.92);
    this.arenaGraphics.fillRect(x, y, size, size);
    this.arenaGraphics.lineStyle(1, 0x24444c, 0.5);
    for (let offset = 0; offset <= size; offset += 22) {
      this.arenaGraphics.lineBetween(x + offset, y, x + offset, y + size);
      this.arenaGraphics.lineBetween(x, y + offset, x + size, y + offset);
    }

    this.arenaGraphics.lineStyle(2, 0xe8ca7f, 0.9);
    this.arenaGraphics.strokeRect(x, y, size, size);
    this.arenaGraphics.lineStyle(1, 0x44d2dc, 0.22);
    this.arenaGraphics.strokeRect(x - 9, y - 9, size + 18, size + 18);
    this.arenaGraphics.lineStyle(1, 0xd7ad52, 0.28);
    this.arenaGraphics.strokeRect(x - 18, y - 18, size + 36, size + 36);

    this.arenaGraphics.lineStyle(3, 0xf0ce75, 0.9);
    const corner = 22;
    this.arenaGraphics.lineBetween(x - 6, y - 6, x + corner, y - 6);
    this.arenaGraphics.lineBetween(x - 6, y - 6, x - 6, y + corner);
    this.arenaGraphics.lineBetween(x + size + 6, y - 6, x + size - corner, y - 6);
    this.arenaGraphics.lineBetween(x + size + 6, y - 6, x + size + 6, y + corner);
    this.arenaGraphics.lineBetween(x - 6, y + size + 6, x + corner, y + size + 6);
    this.arenaGraphics.lineBetween(x - 6, y + size + 6, x - 6, y + size - corner);
    this.arenaGraphics.lineBetween(x + size + 6, y + size + 6, x + size - corner, y + size + 6);
    this.arenaGraphics.lineBetween(x + size + 6, y + size + 6, x + size + 6, y + size - corner);
  }

  private drawUi(time: number): void {
    this.uiGraphics.clear();

    for (let index = 0; index < this.player.state.maxStability; index += 1) {
      const x = WIDTH / 2 - 27 + index * 27;
      const alpha = index < this.player.state.stability ? 0.95 : 0.2;
      this.uiGraphics.fillStyle(0xe96868, alpha);
      this.uiGraphics.fillCircle(x, 646, 7);
      this.uiGraphics.fillCircle(x + 8, 646, 7);
      this.uiGraphics.fillTriangle(x - 7, 650, x + 15, 650, x + 4, 664);
    }

    if (this.mode === "real") {
      const elapsed = this.time.now - this.scriptStartedAt;
      const progress = Phaser.Math.Clamp(elapsed / 58500, 0, 1);
      this.uiGraphics.fillStyle(0x26313a, 0.8);
      this.uiGraphics.fillRoundedRect(70, 672, 250, 8, 4);
      this.uiGraphics.fillStyle(0xe8ca7f, 0.88);
      this.uiGraphics.fillRoundedRect(70, 672, 250 * progress, 8, 4);
    }

    if (this.mode === "victory" || this.mode === "defeat") {
      const color = this.mode === "victory" ? 0xe8ca7f : 0xe96868;
      this.uiGraphics.lineStyle(2, color, 0.9);
      this.uiGraphics.strokeRoundedRect(44, 676, 302, 118, 8);
    }
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const width = label.length > 10 ? 152 : 128;
    const height = 38;
    const rect = this.add.rectangle(x, y, width, height, 0x111923, 0.92)
      .setStrokeStyle(1, 0xd8b65d, 0.65)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "14px",
      color: "#f0d58a",
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
