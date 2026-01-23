export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;
    const title = this.add
      .text(width / 2, height / 2 - 120, "PHANTOM SHIFT", {
        fontSize: "48px",
        color: "#9be7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, title.y + 50, "Stealth Platformer", {
        fontSize: "18px",
        color: "#7dd7ff",
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height / 2 - 20, "ゲーム開始", () => {
      this.scene.start("WorldStoryScene");
    });
    this.createButton(width / 2, height / 2 + 40, "ステージ選択", () => {
      this.scene.start("StageSelectScene");
    });
    this.createButton(width / 2, height / 2 + 100, "設定", () => {
      this.scene.start("SettingsScene", { returnScene: "TitleScene" });
    });

    const audio = this.registry.get("audio");
    this.input.once("pointerdown", () => {
      audio.unlock();
      audio.startBgm(false);
      audio.playSE("ui");
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
