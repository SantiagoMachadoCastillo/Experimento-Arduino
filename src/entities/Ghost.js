const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Ghost {
  constructor({ x, y, sprite, variant = 0 }) {
    this.x = x;
    this.y = y;
    this.sprite = sprite;
    this.variant = variant;
    this.radius = 22;
    this.baseSpeed = 112 + variant * 8;
    this.wobble = Math.random() * Math.PI * 2;
    this.removed = false;
    this.frightened = false;
  }

  update(dt, target, frightened, width, height, speedMultiplier = 1) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = this.baseSpeed * speedMultiplier * (frightened ? 0.64 : 1);
    const movementX = (dx / distance) * speed;
    const movementY = (dy / distance) * speed;

    this.x += movementX * dt;
    this.y += movementY * dt;
    this.wobble += dt * 8;
    this.frightened = frightened;

    const padding = this.radius + 18;
    if (this.x < -padding) this.x = width + padding;
    if (this.x > width + padding) this.x = -padding;
    if (this.y < -padding) this.y = height + padding;
    if (this.y > height + padding) this.y = -padding;
  }

  draw(ctx) {
    const scale = 1 + Math.sin(this.wobble) * 0.03;
    const size = this.radius * 2.6 * scale;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.sprite?.complete && this.sprite.naturalWidth > 0) {
      if (this.frightened) {
        ctx.globalAlpha = 0.84;
        ctx.filter = "brightness(1.18) saturate(0.8)";
      }

      ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = this.frightened ? "#6fe7ff" : "#7f5cff";
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.42, Math.PI, 0);
      ctx.lineTo(size * 0.42, size * 0.38);
      ctx.lineTo(size * 0.25, size * 0.24);
      ctx.lineTo(size * 0.08, size * 0.38);
      ctx.lineTo(-size * 0.08, size * 0.24);
      ctx.lineTo(-size * 0.25, size * 0.38);
      ctx.lineTo(-size * 0.42, size * 0.24);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-size * 0.14, -size * 0.1, size * 0.09, 0, Math.PI * 2);
      ctx.arc(size * 0.14, -size * 0.1, size * 0.09, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.arc(-size * 0.14, -size * 0.1, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.14, -size * 0.1, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  intersectsCircle(x, y, radius) {
    return Math.hypot(this.x - x, this.y - y) < this.radius + radius;
  }
}