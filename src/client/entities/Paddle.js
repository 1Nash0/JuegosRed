export class Paddle {
  constructor(scene, id, x, y) {
    this.scene = scene;
    this.id = id;

    // Create a simple rectangle texture for the paddle
    const width = 20;
    const height = 120;
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(`paddle-${id}`, width, height);
    graphics.destroy();

    this.sprite = scene.physics.add.sprite(x, y, `paddle-${id}`);
    this.sprite.setImmovable(true);
    this.sprite.body.allowGravity = false;
    this.sprite.setCollideWorldBounds(true);
  }

  setVelocity(vx, vy) {
    this.sprite.setVelocity(vx, vy);
  }
}
