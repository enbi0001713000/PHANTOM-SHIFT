export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.result = data.result;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0d16, 1);
    this.add
      .text(width / 2, 70, "リザルト", {
        fontSize: "32px",
        color: "#9be7ff",
      })
      .setOrigin(0.5);

    const details = [
      `クリアタイム：${this.result.time.toFixed(1)}秒`,
      `発見回数：${this.result.detected}`,
      `死亡回数：${this.result.deaths}`,
      this.result.noAttackBonus ? `ノーアタックボーナス：+${this.result.bonus}` : "ノーアタックボーナス：なし",
      this.result.bestUpdated ? "ベスト更新！" : "ベスト未更新",
    ];

    details.forEach((line, index) => {
      this.add
        .text(width / 2, 160 + index * 36, line, {
          fontSize: "20px",
          color: "#e6f6ff",
        })
        .setOrigin(0.5);
    });

    this.createButton(width / 2, height / 2 + 120, "もう一度", () => {
      this.scene.start("GameScene", {
        stageId: this.registry.get("selectedStage"),
        difficulty: this.registry.get("selectedDifficulty"),
      });
    });
    this.createButton(width / 2, height / 2 + 180, "ステージ選択へ", () => {
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
