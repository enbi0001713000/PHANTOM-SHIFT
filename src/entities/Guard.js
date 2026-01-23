const GuardState = {
  PATROL: "Patrol",
  ALERT: "Alert",
  CHASE: "Chase",
  SEARCH: "Search",
};

export class Guard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, data, params) {
    super(scene, data.x, data.y, "guard");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(24, 40);
    this.setOffset(4, 8);
    this.body.setCollideWorldBounds(true);

    this.data = data;
    this.params = params;
    this.state = GuardState.PATROL;
    this.detectMeter = 0;
    this.lastSeenPos = null;
    this.lastHeardPos = null;
    this.timeSinceSeen = 0;
    this.searchTimer = 0;
    this.alertTimer = 0;
    this.patrolIndex = 0;
  }

  update(delta, player, context) {
    const { hasLineOfSight, inShadow } = context;
    const deltaSec = delta / 1000;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const visionRange = this.params.visionRange;
    const visionFov = Phaser.Math.DegToRad(this.params.visionFov);

    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const facing = this.flipX ? Math.PI : 0;
    const withinFov = Phaser.Math.Angle.Wrap(angleToPlayer - facing);
    const inFov = Math.abs(withinFov) <= visionFov / 2;

    const canSee =
      distance <= visionRange && inFov && hasLineOfSight(this.x, this.y, player.x, player.y);
    const shadowFactor = inShadow(player.x, player.y) ? 0.35 : 1;

    if (canSee) {
      this.detectMeter += this.params.detectRate * shadowFactor * deltaSec;
      this.lastSeenPos = { x: player.x, y: player.y };
      this.timeSinceSeen = 0;
    } else {
      this.detectMeter -= this.params.coolRate * deltaSec;
      this.timeSinceSeen += deltaSec;
    }
    this.detectMeter = Phaser.Math.Clamp(this.detectMeter, 0, 100);

    if (canSee && this.detectMeter >= 100) {
      this.state = GuardState.CHASE;
    }

    switch (this.state) {
      case GuardState.PATROL:
        this.patrol(delta);
        break;
      case GuardState.ALERT:
        this.alertTimer += deltaSec;
        this.moveToPoint(this.lastHeardPos, this.params.speedPatrol);
        if (canSee && this.detectMeter >= 100) {
          this.state = GuardState.CHASE;
        } else if (this.alertTimer >= this.params.alertDuration) {
          this.alertTimer = 0;
          this.state = GuardState.SEARCH;
        }
        break;
      case GuardState.CHASE:
        if (this.lastSeenPos) {
          this.moveToPoint(this.lastSeenPos, this.params.speedChase);
        }
        if (!canSee && this.timeSinceSeen >= this.params.loseSightTime) {
          this.searchTimer = 0;
          this.state = GuardState.SEARCH;
        }
        break;
      case GuardState.SEARCH:
        this.searchTimer += deltaSec;
        this.moveToPoint(this.lastSeenPos, this.params.speedPatrol);
        if (canSee && this.detectMeter >= 100) {
          this.state = GuardState.CHASE;
        } else if (this.searchTimer >= this.params.searchDuration) {
          this.state = GuardState.PATROL;
        }
        break;
      default:
        break;
    }

    return { canSee, state: this.state };
  }

  hearNoise(noise, source) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, source.x, source.y);
    if (distance <= this.params.hearingRange && noise >= this.params.noiseThreshold) {
      this.lastHeardPos = { ...source };
      this.alertTimer = 0;
      if (this.state !== GuardState.CHASE) {
        this.state = GuardState.ALERT;
      }
      return true;
    }
    return false;
  }

  patrol(delta) {
    if (!this.data.patrolPoints?.length) {
      this.setVelocityX(0);
      return;
    }
    const target = this.data.patrolPoints[this.patrolIndex];
    this.moveToPoint(target, this.params.speedPatrol);
    if (
      (this.body.blocked.right && this.body.velocity.x > 0) ||
      (this.body.blocked.left && this.body.velocity.x < 0)
    ) {
      this.patrolIndex = (this.patrolIndex + 1) % this.data.patrolPoints.length;
      return;
    }
    if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < 8) {
      this.patrolIndex = (this.patrolIndex + 1) % this.data.patrolPoints.length;
    }
  }

  moveToPoint(point, speed) {
    if (!point) {
      this.setVelocityX(0);
      return;
    }
    const direction = Math.sign(point.x - this.x);
    this.setVelocityX(direction * speed);
    this.setFlipX(direction < 0);
  }
}

export { GuardState };
