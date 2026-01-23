import { StageInfo } from "../data/stageInfo.js";

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

    this.stageInfoView = this.createStageInfoView();

    this.createButton(width / 2, height / 2 - 20, "チュートリアル", () => {
      this.showStageInfo("tutorial", "ゲーム開始", () => {
        this.registry.set("selectedStage", "tutorial");
        this.registry.set("selectedDifficulty", "EASY");
        this.scene.start("GameScene", { stageId: "tutorial" });
      });
    });

    this.createButton(width / 2, height / 2 + 50, "1-1", () => {
      this.showStageInfo("1-1", "難易度選択へ", () => {
        this.registry.set("selectedStage", "1-1");
        this.scene.start("DifficultyScene", { stageId: "1-1" });
      });
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

    return button;
  }

  createStageInfoView() {
    const { width, height } = this.scale;
    const panelWidth = Math.min(520, width - 60);
    const panelHeight = 280;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5)
      .setInteractive({ useHandCursor: false });

    const panel = this.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x0b0d16, 0.92)
      .setStrokeStyle(2, 0x3bb4ff)
      .setScrollFactor(0)
      .setDepth(6);

    const title = this.add
      .text(width / 2, height / 2 - 100, "", {
        fontSize: "22px",
        color: "#9be7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(7);

    const description = this.add
      .text(width / 2, height / 2 - 20, "", {
        fontSize: "16px",
        color: "#e6f6ff",
        align: "center",
        wordWrap: { width: panelWidth - 50 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(7);

    const actionButton = this.createButton(width / 2, height / 2 + 80, "", () => {})
      .setDepth(7)
      .setScrollFactor(0);

    const backButton = this.createButton(width / 2, height / 2 + 140, "戻る", () => {
      this.hideStageInfo();
    })
      .setDepth(7)
      .setScrollFactor(0);

    const elements = [overlay, panel, title, description, actionButton, backButton];
    elements.forEach((element) => element.setVisible(false));

    return {
      overlay,
      panel,
      title,
      description,
      actionButton,
      backButton,
      setVisible: (visible) => elements.forEach((element) => element.setVisible(visible)),
    };
  }

  showStageInfo(stageId, actionLabel, onConfirm) {
    const info = StageInfo[stageId];
    if (!info) return;
    const lines = [info.summary, "", "やること:", ...info.objectives.map((text) => `・${text}`)];
    this.stageInfoView.title.setText(info.title);
    this.stageInfoView.description.setText(lines.join("\n"));
    this.stageInfoView.actionButton.setText(actionLabel);
    this.stageInfoView.actionButton.removeAllListeners("pointerdown");
    this.stageInfoView.actionButton.on("pointerdown", () => {
      this.hideStageInfo();
      onConfirm();
    });
    this.stageInfoView.setVisible(true);
  }

  hideStageInfo() {
    this.stageInfoView.setVisible(false);
  }
}
