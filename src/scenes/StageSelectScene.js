export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super("StageSelectScene");
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, 80, "ステージ選択", {
        fontSize: "30px",
        color: "#9be7ff",
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height / 2 - 20, "チュートリアル", () => {
      this.registry.set("selectedStage", "tutorial");
      this.registry.set("selectedDifficulty", "EASY");
      this.scene.start("GameScene", { stageId: "tutorial" });
    });

    this.createButton(width / 2, height / 2 + 50, "1-1", () => {
      this.registry.set("selectedStage", "1-1");
      this.scene.start("DifficultyScene", { stageId: "1-1" });
    });

    this.createButton(width / 2, height - 80, "タイトルへ", () => {
      this.scene.start("TitleScene");
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
