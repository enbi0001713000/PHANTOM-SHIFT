import { WorldStory } from "../data/worldStory.js";

export class WorldStoryScene extends Phaser.Scene {
  constructor() {
    super("WorldStoryScene");
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, 80, WorldStory.title, {
        fontSize: "28px",
        color: "#9be7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 10, WorldStory.body.join("\n"), {
        fontSize: "18px",
        color: "#e6f6ff",
        align: "center",
        wordWrap: { width: width - 120 },
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(width / 2, height - 90, "画面をクリック（スマホはタップ）してください", {
        fontSize: "16px",
        color: "#7dd7ff",
      })
      .setOrigin(0.5);

    this.input.once("pointerdown", () => {
      const audio = this.registry.get("audio");
      audio.playSE("ui");
      this.scene.start("StageSelectScene");
    });

    hint.setInteractive({ useHandCursor: false });
  }
}
