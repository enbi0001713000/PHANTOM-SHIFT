export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  init(data) {
    this.returnScene = data?.returnScene ?? "GameScene";
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0d16, 0.85);
    this.add
      .text(width / 2, height / 2 - 120, "ポーズ", {
        fontSize: "32px",
        color: "#9be7ff",
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height / 2 - 30, "再開", () => {
      this.scene.stop();
      this.scene.resume(this.returnScene);
    });
    this.createButton(width / 2, height / 2 + 30, "リトライ", () => {
      this.scene.stop(this.returnScene);
      this.scene.start(this.returnScene, { stageId: this.registry.get("selectedStage") });
    });
    this.createButton(width / 2, height / 2 + 90, "設定", () => {
      this.scene.pause(this.returnScene);
      this.scene.start("SettingsScene", { returnScene: this.returnScene, overlay: true });
    });
    this.createButton(width / 2, height / 2 + 150, "タイトルへ", () => {
      this.scene.stop(this.returnScene);
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
