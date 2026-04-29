export class PowerUp {
  constructor({ x, y, createdAt }) {
    this.x = x;
    this.y = y;
    this.createdAt = createdAt;
    this.lifeMs = 8000;
    this.radius = 16;
  }

  isExpired(now) {
    return now - this.createdAt > this.lifeMs;
  }

  draw(ctx, now) {
    const pulse = 1 + Math.sin(now / 160) * 0.18;
    const radius = this.radius * pulse;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = "rgba(255, 214, 47, 0.65)";
    ctx.shadowBlur = 24;

    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 2.4);
    gradient.addColorStop(0, "#fff4af");
    gradient.addColorStop(0.34, "#ffd62f");
    gradient.addColorStop(1, "rgba(255, 214, 47, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff7c7";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  intersectsCircle(x, y, radius) {
    return Math.hypot(this.x - x, this.y - y) < this.radius + radius;
  }
}