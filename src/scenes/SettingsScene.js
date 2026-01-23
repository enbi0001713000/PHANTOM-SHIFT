export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  init(data) {
    this.returnScene = data?.returnScene ?? "TitleScene";
    this.overlay = data?.overlay ?? false;
  }

  create() {
    const { width, height } = this.scale;
    if (!this.overlay) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0b0d16, 1);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0b0d16, 0.85);
    }

    this.add
      .text(width / 2, 60, "設定", {
        fontSize: "30px",
        color: "#9be7ff",
      })
      .setOrigin(0.5);

    this.saveData = this.registry.get("saveData");
    this.audio = this.registry.get("audio");

    this.rows = [];
    this.addRow(120, "BGM音量", "bgmVolume", 0, 100);
    this.addRow(170, "SE音量", "seVolume", 0, 100);
    this.addToggleRow(220, "視界コーン表示", "showVisionCone");
    this.addRow(270, "タッチUI透明度", "touchOpacity", 40, 100, 10);
    this.addToggleRow(320, "縦画面で停止", "pauseOnPortrait");

    this.createButton(width / 2, height - 80, "戻る", () => {
      this.registry.set("saveData", this.saveData);
      this.scene.stop();
      if (this.overlay) {
        this.scene.resume(this.returnScene);
      } else {
        this.scene.start(this.returnScene);
      }
    });
  }

  addRow(y, label, key, min, max, step = 5) {
    const { width } = this.scale;
    const text = this.add.text(80, y, label, { fontSize: "18px", color: "#e6f6ff" });
    const valueText = this.add
      .text(width - 200, y, this.saveData.settings[key], {
        fontSize: "18px",
        color: "#9be7ff",
      })
      .setOrigin(0.5, 0);

    const minus = this.add
      .text(width - 120, y, "-", {
        fontSize: "20px",
        backgroundColor: "#141b2c",
        padding: { x: 10, y: 4 },
      })
      .setInteractive({ useHandCursor: true });
    const plus = this.add
      .text(width - 60, y, "+", {
        fontSize: "20px",
        backgroundColor: "#141b2c",
        padding: { x: 10, y: 4 },
      })
      .setInteractive({ useHandCursor: true });

    const updateValue = (next) => {
      const clamped = Phaser.Math.Clamp(next, min, max);
      this.saveData.settings[key] = clamped;
      valueText.setText(clamped);
      this.audio.updateSettings(this.saveData.settings);
      this.registry.set("saveData", this.saveData);
    };

    minus.on("pointerdown", () => updateValue(this.saveData.settings[key] - step));
    plus.on("pointerdown", () => updateValue(this.saveData.settings[key] + step));

    this.rows.push({ text, valueText, minus, plus });
  }

  addToggleRow(y, label, key) {
    const { width } = this.scale;
    this.add.text(80, y, label, { fontSize: "18px", color: "#e6f6ff" });
    const button = this.add
      .text(width - 120, y, this.saveData.settings[key] ? "ON" : "OFF", {
        fontSize: "18px",
        color: "#9be7ff",
        backgroundColor: "#141b2c",
        padding: { x: 10, y: 4 },
      })
      .setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => {
      this.saveData.settings[key] = !this.saveData.settings[key];
      button.setText(this.saveData.settings[key] ? "ON" : "OFF");
      this.registry.set("saveData", this.saveData);
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
