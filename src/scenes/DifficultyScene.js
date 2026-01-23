import { DifficultyLabels, Difficulty } from "../data/difficulty.js";

export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super("DifficultyScene");
  }

  init(data) {
    this.stageId = data.stageId;
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, 80, "難易度を選択", {
        fontSize: "30px",
        color: "#9be7ff",
      })
      .setOrigin(0.5);

    const entries = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
    entries.forEach((difficulty, index) => {
      this.createButton(width / 2, height / 2 - 60 + index * 60, DifficultyLabels[difficulty], () => {
        this.registry.set("selectedDifficulty", difficulty);
        this.scene.start("GameScene", { stageId: this.stageId, difficulty });
      });
    });

    this.createButton(width / 2, height - 80, "ステージ選択へ", () => {
      this.scene.start("StageSelectScene");
    });
  }

  createButton(x, y, label, callback) {
    const button = this.add
      .text(x, y, label, {
        fontSize: "20px",
        color: "#e6f6ff",
        backgroundColor: "#141b2c",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setStyle({ backgroundColor: "#1f2b40" }));
    button.on("pointerout", () => button.setStyle({ backgroundColor: "#141b2c" }));
    button.on("pointerdown", callback);
  }
}
