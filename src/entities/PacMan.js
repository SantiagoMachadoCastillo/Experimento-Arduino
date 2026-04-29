const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class PacMan {
  constructor({ x, y, sprite }) {
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.sprite = sprite;
    this.speed = 190;
    this.direction = 0;
    this.pulse = 0;
    this.bounce = 0;
    this.vx = 0;
    this.vy = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.direction = 0;
    this.pulse = 0;
    this.bounce = 0;
  }

  addPulse(amount = 1) {
    this.pulse = clamp(Math.max(this.pulse, amount), 0, 2);
  }

  update(dt, input, width, height) {
    const magnitude = Math.hypot(input.x, input.y);
    const deadzone = 0.14;

    let normalizedX = 0;
    let normalizedY = 0;
    if (magnitude > deadzone) {
      normalizedX = input.x / Math.max(magnitude, 1);
      normalizedY = input.y / Math.max(magnitude, 1);
    }

    this.vx = normalizedX * this.speed * (input.boost ?? 1);
    this.vy = normalizedY * this.speed * (input.boost ?? 1);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (Math.abs(this.vx) > Math.abs(this.vy)) {
      this.direction = this.vx >= 0 ? 0 : Math.PI;
    } else if (Math.abs(this.vy) > 0.01) {
      this.direction = this.vy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    this.pulse = Math.max(0, this.pulse - dt * 1.9);
    this.bounce = Math.max(0, this.bounce - dt * 2.8);

    const padding = this.radius + 18;
    if (this.x < -padding) this.x = width + padding;
    if (this.x > width + padding) this.x = -padding;
    if (this.y < -padding) this.y = height + padding;
    if (this.y > height + padding) this.y = -padding;
  }

  draw(ctx) {
    const scale = 1 + this.pulse * 0.28 + this.bounce * 0.2;
    const size = this.radius * 2.6 * scale;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.direction);

    if (this.sprite?.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#ffd62f";
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.arc(0, 0, size / 2, -0.42, 0.42);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}