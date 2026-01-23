export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(24, 40);
    this.setOffset(4, 8);
    this.body.setCollideWorldBounds(true);
    this.walkSpeed = 130;
    this.crouchSpeed = 80;
    this.noiseTimer = 0;
    this.wasOnGround = false;
    this.isCrouching = false;
  }

  update(delta, input, onNoise) {
    const onGround = this.body.blocked.down;
    const speed = this.isCrouching ? this.crouchSpeed : this.walkSpeed;
    const noiseWalk = this.isCrouching ? 7 : 18;

    if (input.left) {
      this.setVelocityX(-speed);
      this.setFlipX(true);
    } else if (input.right) {
      this.setVelocityX(speed);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    if (input.crouch && onGround) {
      if (!this.isCrouching) {
        this.setSize(24, 28);
        this.setOffset(4, 20);
      }
      this.isCrouching = true;
    } else {
      if (this.isCrouching) {
        this.setSize(24, 40);
        this.setOffset(4, 8);
      }
      this.isCrouching = false;
    }

    if (input.jumpPressed && onGround) {
      this.setVelocityY(-260);
      onNoise({ value: 10, source: { x: this.x, y: this.y } });
    }

    if (!this.wasOnGround && onGround) {
      onNoise({ value: 30, source: { x: this.x, y: this.y } });
    }

    if (onGround && Math.abs(this.body.velocity.x) > 2) {
      this.noiseTimer += delta;
      if (this.noiseTimer >= 250) {
        this.noiseTimer = 0;
        onNoise({ value: noiseWalk, source: { x: this.x, y: this.y } });
      }
    } else {
      this.noiseTimer = 0;
    }

    this.wasOnGround = onGround;
  }
}
