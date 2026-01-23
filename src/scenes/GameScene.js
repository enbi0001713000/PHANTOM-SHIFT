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
    this.load.json(`level-${this.stageId}`, `levels/${this.stageId}.json`);
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
    this.respawnPoint = { ...this.level.entities.playerSpawn };
    this.noiseEvents = [];
  }

  update(time, delta) {
    if (this.isPortraitPaused) return;

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
    graphics.fillStyle(0x1b1f32, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("tile", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x2c364d, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x4dd0ff, 1);
    graphics.strokeRect(2, 2, 28, 28);
    graphics.generateTexture("wall", 32, 32);

    graphics.clear();
    graphics.fillStyle(0xff5470, 1);
    graphics.fillTriangle(0, 32, 16, 4, 32, 32);
    graphics.generateTexture("spike", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x7dd7ff, 1);
    graphics.fillRect(0, 0, 32, 48);
    graphics.fillStyle(0x0b0d16, 1);
    graphics.fillRect(6, 6, 20, 34);
    graphics.generateTexture("player", 32, 48);

    graphics.clear();
    graphics.fillStyle(0xffb347, 1);
    graphics.fillRect(0, 0, 32, 48);
    graphics.fillStyle(0x0b0d16, 1);
    graphics.fillRect(6, 6, 20, 34);
    graphics.generateTexture("guard", 32, 48);

    graphics.clear();
    graphics.fillStyle(0x7bf0ff, 1);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture("gem", 32, 32);

    graphics.clear();
    graphics.fillStyle(0x5aff9b, 1);
    graphics.fillRect(0, 0, 28, 28);
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
    if (!this.hasGem) return;
    this.audio.playSE("goal");
    this.audio.stopBgm();
    this.endStage();
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
