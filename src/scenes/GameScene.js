import { Player } from "../entities/Player.js";
import { Guard, GuardState } from "../entities/Guard.js";
import { DifficultyParams, Difficulty } from "../data/difficulty.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.stageId = data.stageId ?? "tutorial";
    this.difficulty = data.difficulty ?? Difficulty.EASY;
    this.registry.set("selectedStage", this.stageId);
    this.registry.set("selectedDifficulty", this.difficulty);
  }

  preload() {
    const cacheKey = `level-${this.stageId}`;
    if (this.cache.json.exists(cacheKey)) {
      this.cache.json.remove(cacheKey);
    }
    const cacheBuster = Date.now();
    this.load.json(cacheKey, `levels/${this.stageId}.json?cb=${cacheBuster}`);
  }

  create() {
    this.createTextures();
    this.level = this.cache.json.get(`level-${this.stageId}`);
    this.params = DifficultyParams[this.difficulty] ?? DifficultyParams[Difficulty.EASY];
    this.saveData = this.registry.get("saveData");
    this.audio = this.registry.get("audio");
    this.audio.startBgm(false);

    this.worldBounds = {
      width: this.level.map[0].length * this.level.tileSize,
      height: this.level.map.length * this.level.tileSize,
    };
    this.physics.world.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

    this.buildMap();
    this.player = new Player(this, this.level.entities.playerSpawn.x, this.level.entities.playerSpawn.y);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.createEntities();
    this.createHud();
    this.createTouchControls();
    this.createOrientationWatcher();

    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.guards, this.groundLayer);
    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.guards, this.wallLayer);
    this.physics.add.overlap(this.player, this.spikeLayer, () => this.handleDeath("spike"));
    this.physics.add.overlap(this.player, this.gemSprite, () => this.collectGem());
    this.physics.add.overlap(this.player, this.goalZone, () => this.tryGoal());
    this.physics.add.overlap(this.player, this.checkpointGroup, (player, checkpoint) => {
      this.respawnPoint = { x: checkpoint.x, y: checkpoint.y };
      checkpoint.setAlpha(1);
    });
    this.physics.add.overlap(this.player, this.guards, () => this.handleDeath("caught"));

    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      leftAlt: "LEFT",
      rightAlt: "RIGHT",
      jump: "SPACE",
      crouch: "S",
      crouchAlt: "DOWN",
      pause: "ESC",
      retry: "R",
    });

    this.input.keyboard.on("keydown-ESC", () => this.pauseGame());
    this.input.keyboard.on("keydown-R", () => this.restartStage());

    this.elapsed = 0;
    this.detectedCount = 0;
    this.deathCount = 0;
    this.detectMeter = 0;
    this.hasGem = false;
    this.chaseActive = false;
    this.isStageEnding = false;
    this.respawnPoint = { ...this.level.entities.playerSpawn };
    this.noiseEvents = [];
  }

  update(time, delta) {
    if (this.isPortraitPaused || this.isStageEnding) return;

    this.elapsed += delta / 1000;
    this.updateHud();

    const input = {
      left: this.keys.left.isDown || this.keys.leftAlt.isDown || this.touchState.left,
      right: this.keys.right.isDown || this.keys.rightAlt.isDown || this.touchState.right,
      crouch: this.keys.crouch.isDown || this.keys.crouchAlt.isDown || this.touchState.crouch,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.keys.jump) || this.touchState.jumpPressed,
    };
    this.touchState.jumpPressed = false;

    this.player.update(delta, input, (noise) => this.noiseEvents.push(noise));

    this.updateGuards(delta);
  }

  updateGuards(delta) {
    let maxDetect = 0;
    let anyChase = false;
    let anyAlert = false;

    const noiseEvents = [...this.noiseEvents];
    this.noiseEvents = [];

    this.guards.getChildren().forEach((guard) => {
      noiseEvents.forEach((event) => {
        const heard = guard.hearNoise(event.value, event.source);
        if (heard) {
          this.audio.playSE("detect");
        }
      });

      const info = guard.update(delta, this.player, {
        hasLineOfSight: (x1, y1, x2, y2) => this.hasLineOfSight(x1, y1, x2, y2),
        inShadow: (x, y) => this.isInShadow(x, y),
      });
      maxDetect = Math.max(maxDetect, guard.detectMeter);
      if (info.state === GuardState.CHASE) {
        anyChase = true;
      }
      if (info.state === GuardState.ALERT) {
        anyAlert = true;
      }
      guard.stateIcon.setText(
        info.state === GuardState.CHASE ? "!" : info.state === GuardState.ALERT ? "?" : ""
      );
      guard.stateIcon.setPosition(guard.x, guard.y - 40);
      if (guard.visionCone) {
        this.drawVisionCone(guard);
      }
    });

    if (anyChase && !this.chaseActive) {
      this.detectedCount += 1;
      this.audio.playSE("detect");
      this.audio.startBgm(true);
    }
    if (!anyChase && this.chaseActive) {
      this.audio.startBgm(false);
    }

    this.chaseActive = anyChase;
    this.detectMeter = maxDetect;
    this.alertActive = anyAlert;
  }

  buildMap() {
    this.groundLayer = this.physics.add.staticGroup();
    this.wallLayer = this.physics.add.staticGroup();
    this.spikeLayer = this.physics.add.staticGroup();
    const size = this.level.tileSize;

    this.level.map.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile === 0) return;
        const worldX = x * size + size / 2;
        const worldY = y * size + size / 2;
        if (tile === 1) {
          this.groundLayer.create(worldX, worldY, "tile");
        } else if (tile === 2) {
          this.wallLayer.create(worldX, worldY, "wall");
        } else if (tile === 3) {
          this.spikeLayer.create(worldX, worldY, "spike");
        }
      });
    });

    this.groundLayer.refresh();
    this.wallLayer.refresh();
    this.spikeLayer.refresh();
  }

  createEntities() {
    this.guards = this.physics.add.group();
    const guardsData = this.level.entities.guards.slice(0, this.params.guardCount);
    guardsData.forEach((guardData) => {
      const guard = new Guard(this, guardData, { ...guardData.baseParams, ...this.params });
      guard.stateIcon = this.add.text(guard.x, guard.y - 40, "", {
        fontSize: "18px",
        color: "#ff5470",
      });
      if (this.saveData.settings.showVisionCone) {
        guard.visionCone = this.add.graphics({ fillStyle: { color: 0x5ad0ff, alpha: 0.12 } });
      }
      this.guards.add(guard);
    });

    this.gemSprite = this.physics.add.staticImage(
      this.level.entities.gem.x,
      this.level.entities.gem.y,
      "gem"
    );

    const goal = this.level.entities.goal;
    this.goalZone = this.add.rectangle(goal.x, goal.y, goal.w, goal.h, 0x3bb4ff, 0.25);
    this.physics.add.existing(this.goalZone, true);

    this.checkpointGroup = this.physics.add.staticGroup();
    (this.level.entities.checkpoints || []).forEach((checkpoint) => {
      const marker = this.checkpointGroup.create(checkpoint.x, checkpoint.y, "checkpoint");
      marker.setAlpha(0.45);
    });

    this.shadowZones = this.level.zones.shadow.map(
      (zone) => new Phaser.Geom.Rectangle(zone.x, zone.y, zone.w, zone.h)
    );
  }

  createHud() {
    this.hud = {
      meterBg: this.add.rectangle(120, 26, 200, 14, 0x203040).setScrollFactor(0),
      meterFill: this.add.rectangle(20, 26, 0, 10, 0x48e2ff).setOrigin(0, 0.5).setScrollFactor(0),
      timer: this.add.text(20, 50, "Time: 0.0", { fontSize: "14px", color: "#e6f6ff" }).setScrollFactor(0),
      detected: this.add
        .text(20, 70, "発見回数: 0", { fontSize: "14px", color: "#e6f6ff" })
        .setScrollFactor(0),
      deaths: this.add
        .text(20, 90, "死亡回数: 0", { fontSize: "14px", color: "#e6f6ff" })
        .setScrollFactor(0),
      gem: this.add
        .text(20, 110, "宝石: 未取得", { fontSize: "14px", color: "#e6f6ff" })
        .setScrollFactor(0),
    };
  }

  updateHud() {
    this.hud.meterFill.width = (this.detectMeter / 100) * 200;
    this.hud.meterFill.fillColor = this.detectMeter >= 100 ? 0xff5470 : 0x48e2ff;
    this.hud.timer.setText(`Time: ${this.elapsed.toFixed(1)}`);
    this.hud.detected.setText(`発見回数: ${this.detectedCount}`);
    this.hud.deaths.setText(`死亡回数: ${this.deathCount}`);
    this.hud.gem.setText(this.hasGem ? "宝石: 取得済み" : "宝石: 未取得");
  }

  createTextures() {
    if (this.textures.exists("tile")) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(0xd8d3c4, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0xe8e2d6, 1);
    graphics.strokeRect(2, 2, 28, 28);
    graphics.lineStyle(1, 0xb8b1a3, 0.8);
    graphics.beginPath();
    graphics.moveTo(4, 10);
    graphics.lineTo(28, 10);
    graphics.moveTo(4, 22);
    graphics.lineTo(28, 22);
    graphics.strokePath();
    graphics.generateTexture("tile", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x5a514a, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x2d2724, 1);
    graphics.fillRect(2, 2, 28, 28);
    graphics.lineStyle(2, 0xd2b66a, 1);
    graphics.strokeRect(3, 3, 26, 26);
    graphics.fillStyle(0x8c7f74, 1);
    graphics.fillRect(6, 8, 20, 6);
    graphics.fillRect(6, 18, 20, 6);
    graphics.generateTexture("wall", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x2b0f14, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(3, 0xff4b6b, 1);
    graphics.beginPath();
    graphics.moveTo(4, 6);
    graphics.lineTo(28, 6);
    graphics.moveTo(4, 16);
    graphics.lineTo(28, 16);
    graphics.moveTo(4, 26);
    graphics.lineTo(28, 26);
    graphics.strokePath();
    graphics.generateTexture("spike", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x101218, 1);
    graphics.fillRect(8, 12, 16, 28);
    graphics.fillStyle(0x22252f, 1);
    graphics.fillRect(6, 18, 4, 22);
    graphics.fillRect(22, 18, 4, 22);
    graphics.fillStyle(0xf4f1e6, 1);
    graphics.fillRect(14, 18, 4, 10);
    graphics.fillStyle(0xb72033, 1);
    graphics.fillRect(16, 20, 2, 14);
    graphics.fillStyle(0x0c0d12, 1);
    graphics.fillRect(6, 26, 20, 16);
    graphics.fillStyle(0x11151e, 1);
    graphics.fillTriangle(6, 26, 26, 26, 32, 48);
    graphics.fillTriangle(26, 26, 6, 26, 0, 48);
    graphics.fillStyle(0x0a0b10, 1);
    graphics.fillRect(10, 4, 12, 8);
    graphics.fillRect(8, 2, 16, 4);
    graphics.fillStyle(0x1b1f2b, 1);
    graphics.fillRect(12, 6, 8, 2);
    graphics.generateTexture("player", 32, 48);

    graphics.clear();
    graphics.fillStyle(0x808891, 1);
    graphics.fillRoundedRect(6, 16, 20, 26, 4);
    graphics.fillStyle(0xb9c1cc, 1);
    graphics.fillRoundedRect(9, 20, 14, 14, 3);
    graphics.fillStyle(0x4b525c, 1);
    graphics.fillRect(10, 36, 4, 8);
    graphics.fillRect(18, 36, 4, 8);
    graphics.fillStyle(0x8fd9ff, 1);
    graphics.fillCircle(13, 24, 3);
    graphics.fillCircle(19, 24, 3);
    graphics.fillStyle(0x30343b, 1);
    graphics.fillRoundedRect(9, 6, 14, 10, 3);
    graphics.fillStyle(0x9aa3ad, 1);
    graphics.fillRect(14, 2, 4, 4);
    graphics.fillStyle(0xffd34d, 1);
    graphics.fillCircle(16, 2, 2);
    graphics.fillStyle(0x666f7a, 1);
    graphics.fillRect(2, 22, 6, 12);
    graphics.fillRect(24, 22, 6, 12);
    graphics.generateTexture("guard", 32, 48);

    graphics.clear();
    graphics.fillStyle(0x5b4634, 1);
    graphics.fillRect(6, 20, 20, 10);
    graphics.fillStyle(0xd6c08b, 1);
    graphics.fillRect(8, 10, 16, 12);
    graphics.fillStyle(0x6ae0ff, 1);
    graphics.fillCircle(16, 16, 6);
    graphics.generateTexture("gem", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x2b1f17, 1);
    graphics.fillRect(0, 0, 28, 28);
    graphics.fillStyle(0xcba85a, 1);
    graphics.fillRect(4, 4, 20, 20);
    graphics.fillStyle(0xede5d4, 1);
    graphics.fillRect(7, 7, 14, 14);
    graphics.generateTexture("checkpoint", 28, 28);

    graphics.destroy();
  }

  createTouchControls() {
    this.touchState = { left: false, right: false, jumpPressed: false, crouch: false };
    const opacity = (this.saveData.settings.touchOpacity ?? 70) / 100;

    const leftBtn = this.add.circle(80, this.scale.height - 80, 36, 0x1f2b40, opacity).setScrollFactor(0);
    const rightBtn = this.add.circle(160, this.scale.height - 80, 36, 0x1f2b40, opacity).setScrollFactor(0);
    const jumpBtn = this.add.circle(this.scale.width - 90, this.scale.height - 100, 44, 0x1f2b40, opacity)
      .setScrollFactor(0);
    const crouchBtn = this.add.circle(this.scale.width - 180, this.scale.height - 60, 32, 0x1f2b40, opacity)
      .setScrollFactor(0);
    const pauseBtn = this.add.circle(this.scale.width - 40, 40, 18, 0xff5470, opacity).setScrollFactor(0);

    const addButtonHandlers = (shape, onDown, onUp) => {
      shape.setInteractive({ useHandCursor: false });
      shape.on("pointerdown", onDown);
      shape.on("pointerup", onUp);
      shape.on("pointerout", onUp);
    };

    addButtonHandlers(leftBtn, () => (this.touchState.left = true), () => (this.touchState.left = false));
    addButtonHandlers(rightBtn, () => (this.touchState.right = true), () => (this.touchState.right = false));
    addButtonHandlers(jumpBtn, () => {
      this.touchState.jumpPressed = true;
    }, () => {});
    addButtonHandlers(crouchBtn, () => (this.touchState.crouch = true), () => (this.touchState.crouch = false));
    addButtonHandlers(pauseBtn, () => this.pauseGame(), () => {});

    this.touchControls = [leftBtn, rightBtn, jumpBtn, crouchBtn, pauseBtn];
  }

  createOrientationWatcher() {
    this.isPortraitPaused = false;
    const overlay = document.getElementById("orientation-overlay");
    const update = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const shouldPause = this.saveData.settings.pauseOnPortrait && isPortrait;
      overlay.style.display = isPortrait ? "flex" : "none";
      if (shouldPause && !this.isPortraitPaused) {
        this.physics.world.pause();
        this.isPortraitPaused = true;
      } else if (!shouldPause && this.isPortraitPaused) {
        this.physics.world.resume();
        this.isPortraitPaused = false;
      }
    };
    update();
    window.addEventListener("resize", update);
    this.events.once("shutdown", () => {
      window.removeEventListener("resize", update);
      overlay.style.display = "none";
    });
  }

  pauseGame() {
    this.scene.launch("PauseScene", { returnScene: "GameScene" });
    this.scene.pause();
  }

  restartStage() {
    this.scene.restart({ stageId: this.stageId, difficulty: this.difficulty });
  }

  handleDeath(reason) {
    if (this.isProcessingDeath) return;
    this.isProcessingDeath = true;
    this.deathCount += 1;
    this.audio.playSE(reason === "caught" ? "caught" : "land");
    this.time.delayedCall(500, () => {
      this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y);
      this.player.setVelocity(0, 0);
      this.isProcessingDeath = false;
    });
  }

  collectGem() {
    if (this.hasGem) return;
    this.hasGem = true;
    this.gemSprite.setVisible(false);
    this.audio.playSE("gem");
  }

  tryGoal() {
    if (!this.hasGem || this.isStageEnding) return;
    this.isStageEnding = true;
    this.audio.playSE("goal");
    this.audio.stopBgm();
    this.startGoalSequence();
  }

  startGoalSequence() {
    const { width, height } = this.scale;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    (this.touchControls || []).forEach((control) => {
      control.disableInteractive();
      control.setVisible(false);
    });

    const successText = this.add
      .text(width / 2, height / 2 - 40, "逃走成功", {
        fontSize: "36px",
        color: "#9be7ff",
        fontStyle: "bold",
        stroke: "#0b0d16",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.tweens.add({
      targets: successText,
      y: successText.y - 50,
      alpha: 0,
      duration: 1200,
      ease: "Sine.easeOut",
      onComplete: () => {
        const prompt = this.add
          .text(width / 2, height / 2 + 20, "画面をタップしてリザルトへ", {
            fontSize: "20px",
            color: "#e6f6ff",
            backgroundColor: "rgba(11, 13, 22, 0.6)",
            padding: { x: 12, y: 6 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0);

        this.input.once("pointerdown", () => {
          prompt.destroy();
          this.endStage();
        });
      },
    });
  }

  endStage() {
    const result = {
      time: this.elapsed,
      detected: this.detectedCount,
      deaths: this.deathCount,
    };
    if (this.stageId === "tutorial") {
      this.saveData.cleared.tutorial = true;
      result.bestUpdated = true;
      this.registry.set("saveData", this.saveData);
      this.registry.get("saveSystem").save(this.saveData);
    } else {
      const before = this.saveData.best?.[this.stageId]?.[this.difficulty];
      this.saveData = this.registry.get("saveData");
      const updated = this.registry.get("saveSystem").updateBest(
        this.saveData,
        this.stageId,
        this.difficulty,
        result
      );
      this.saveData = updated;
      this.registry.set("saveData", updated);
      result.bestUpdated = !before || before.bestTime === null || result.time <= before.bestTime;
    }
    this.scene.start("ResultScene", { result });
  }

  drawVisionCone(guard) {
    const range = guard.params.visionRange;
    const halfFov = Phaser.Math.DegToRad(guard.params.visionFov) / 2;
    const facing = guard.flipX ? Math.PI : 0;
    const leftAngle = facing - halfFov;
    const rightAngle = facing + halfFov;
    const startX = guard.x;
    const startY = guard.y;
    const leftX = startX + Math.cos(leftAngle) * range;
    const leftY = startY + Math.sin(leftAngle) * range;
    const rightX = startX + Math.cos(rightAngle) * range;
    const rightY = startY + Math.sin(rightAngle) * range;

    guard.visionCone.clear();
    guard.visionCone.fillStyle(0x5ad0ff, 0.12);
    guard.visionCone.beginPath();
    guard.visionCone.moveTo(startX, startY);
    guard.visionCone.lineTo(leftX, leftY);
    guard.visionCone.lineTo(rightX, rightY);
    guard.visionCone.closePath();
    guard.visionCone.fillPath();
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    const tiles = [...this.wallLayer.getChildren(), ...this.groundLayer.getChildren()];
    return !tiles.some((tile) => {
      const bounds = tile.getBounds();
      return Phaser.Geom.Intersects.LineToRectangle(line, bounds);
    });
  }

  isInShadow(x, y) {
    return this.shadowZones.some((rect) => rect.contains(x, y));
  }
}
