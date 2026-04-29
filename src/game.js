import { PacMan } from "./entities/PacMan.js";
import { Ghost } from "./entities/Ghost.js";
import { PowerUp } from "./entities/PowerUp.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);

const defaultSensors = () => ({
  joystick: { x: 0, y: 0 },
  luz: 0,
  temperatura: 0,
  slider: 0,
  acelerometro: { x: 0, y: 0, z: 0 },
  botones: { btn1: 0, btn2: 0, btn3: 0, btn4: 0 },
  microfono: 0,
  timestamp: null,
});

const pickSpawnPoint = (width, height, avoidX, avoidY, minDistance) => {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const x = randomBetween(36, width - 36);
    const y = randomBetween(80, height - 42);
    if (Math.hypot(x - avoidX, y - avoidY) > minDistance) {
      return { x, y };
    }
  }

  return {
    x: randomBetween(36, width - 36),
    y: randomBetween(80, height - 42),
  };
};

export class Game {
  constructor({ canvas, assets, ui }) {
    this.canvas = canvas;
    this.assets = assets;
    this.ui = ui;
    this.ctx = canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
    this.state = "intro";
    this.score = 0;
    this.highScore = Number(localStorage.getItem("pac-esplora-high-score") || 0);
    this.nextGhostSpawnAt = 0;
    this.nextPowerSpawnAt = 0;
    this.powerModeUntil = 0;
    this.powerUp = null;
    this.ghosts = [];
    this.particles = [];
    this.sensors = defaultSensors();
    this.previousSensors = defaultSensors();
    this.keyboard = { x: 0, y: 0 };
    this.shakeTime = 0;
    this.shakeStrength = 0;
    this.flash = 0;
    this.lastMicSpikeAt = 0;
    this.pacman = new PacMan({ x: 200, y: 200, sprite: assets.pacman });
    this.status = {
      connected: false,
      transport: "offline",
      label: "Desconectado",
      detail: "Sin datos del Arduino",
    };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    if (this.state === "intro" || this.state === "gameover") {
      this.pacman.reset(width * 0.5, height * 0.55);
    }
  }

  setSensors(packet) {
    if (!packet) {
      return;
    }

    this.previousSensors = this.sensors;
    this.sensors = {
      ...defaultSensors(),
      ...packet,
      joystick: {
        ...defaultSensors().joystick,
        ...(packet.joystick || {}),
      },
      acelerometro: {
        ...defaultSensors().acelerometro,
        ...(packet.acelerometro || {}),
      },
      botones: {
        ...defaultSensors().botones,
        ...(packet.botones || {}),
      },
    };

    const accelSpike = Math.abs((this.sensors.acelerometro?.z || 0) - (this.previousSensors.acelerometro?.z || 0));
    if (accelSpike > 160) {
      this.pacman.addPulse(1.4);
      this.shakeTime = Math.max(this.shakeTime, 0.28);
      this.shakeStrength = Math.max(this.shakeStrength, 8);
    }

    const mic = this.sensors.microfono || 0;
    const previousMic = this.previousSensors.microfono || 0;
    if (mic > 290 && mic - previousMic > 90 && Date.now() - this.lastMicSpikeAt > 150) {
      this.lastMicSpikeAt = Date.now();
      this.pacman.addPulse(1.08);
      this.spawnParticles(this.pacman.x, this.pacman.y, "rgba(111, 231, 255, 0.95)", 10);
      this.flash = Math.max(this.flash, 0.12);
    }

    if (this.state === "intro" && this.sensors.botones.btn1) {
      this.start();
    }

    if (this.state === "gameover" && (this.sensors.botones.btn1 || this.sensors.botones.btn4)) {
      this.restart();
    }
  }

  setKeyboardInput(input) {
    this.keyboard = input;
  }

  setConnectionStatus(status) {
    this.status = status;
  }

  start() {
    this.state = "playing";
    this.score = 0;
    this.ghosts = [];
    this.powerUp = null;
    this.particles = [];
    this.powerModeUntil = 0;
    this.flash = 0;
    this.shakeTime = 0;
    this.shakeStrength = 0;
    this.nextGhostSpawnAt = performance.now() + 1200;
    this.nextPowerSpawnAt = performance.now() + 6500;
    this.pacman.reset(this.width * 0.5, this.height * 0.55);
    this.pacman.addPulse(0.35);
  }

  restart() {
    this.start();
  }

  endGame() {
    this.state = "gameover";
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem("pac-esplora-high-score", String(this.highScore));
    this.flash = 0.5;
    this.shakeTime = 0.4;
    this.shakeStrength = 12;
    this.spawnParticles(this.pacman.x, this.pacman.y, "rgba(255, 107, 107, 0.95)", 18);
  }

  spawnGhost() {
    const point = pickSpawnPoint(this.width, this.height, this.pacman.x, this.pacman.y, 140);
    const ghostSprites = this.assets.ghosts || [];
    const sprite = ghostSprites.length > 0 ? ghostSprites[this.ghosts.length % ghostSprites.length] : null;
    const variant = this.ghosts.length % Math.max(ghostSprites.length, 4);
    this.ghosts.push(new Ghost({ x: point.x, y: point.y, sprite, variant }));
  }

  spawnPowerUp(now) {
    if (this.powerUp) {
      return;
    }

    const point = pickSpawnPoint(this.width, this.height, this.pacman.x, this.pacman.y, 180);
    this.powerUp = new PowerUp({ x: point.x, y: point.y, createdAt: now });
  }

  spawnParticles(x, y, color, count = 12) {
    for (let index = 0; index < count; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(40, 220);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomBetween(0.4, 0.9),
        radius: randomBetween(1.8, 3.8),
        color,
      });
    }
  }

  getInputVector() {
    const joystick = this.sensors.joystick || { x: 0, y: 0 };
    const joystickX = clamp(-(joystick.x || 0) / 512, -1, 1);
    const joystickY = clamp((joystick.y || 0) / 512, -1, 1);
    const joystickMagnitude = Math.hypot(joystickX, joystickY);

    const keyboardMagnitude = Math.hypot(this.keyboard.x, this.keyboard.y);
    const useKeyboard = joystickMagnitude < 0.12 && keyboardMagnitude > 0;

    const x = useKeyboard ? this.keyboard.x : joystickX;
    const y = useKeyboard ? this.keyboard.y : joystickY;
    const magnitude = Math.hypot(x, y);

    return {
      x,
      y,
      boost: magnitude > 1 ? 1 : 1,
    };
  }

  getGhostSpeedMultiplier() {
    const accel = this.sensors.acelerometro || { x: 0, y: 0, z: 0 };
    const magnitude = Math.hypot(Math.abs(accel.x || 0), Math.abs(accel.y || 0), Math.abs(accel.z || 0));
    const normalized = clamp(magnitude / 1024, 0, 1);

    if (normalized < 0.18) {
      return 1;
    }

    return 1 + clamp((normalized - 0.18) * 1.8, 0, 0.95);
  }

  update(dt, now) {
    if (this.state === "intro") {
      this.pacman.pulse = Math.max(this.pacman.pulse, 0.12);
      this.pacman.update(dt, { x: 0, y: 0 }, this.width, this.height);
      this.#updateParticles(dt);
      this.#updateFlash(dt);
      return;
    }

    if (this.state !== "playing") {
      this.#updateParticles(dt);
      this.#updateFlash(dt);
      return;
    }

    const powerActive = now < this.powerModeUntil;
    const input = this.getInputVector();
    this.pacman.update(dt, input, this.width, this.height);

    if (now >= this.nextGhostSpawnAt) {
      this.spawnGhost();
      this.nextGhostSpawnAt = now + 10000;
    }

    if (!this.powerUp && now >= this.nextPowerSpawnAt) {
      this.spawnPowerUp(now);
      this.nextPowerSpawnAt = now + 15000;
    }

    if (this.powerUp && this.powerUp.isExpired(now)) {
      this.powerUp = null;
    }

    if (this.powerUp && this.powerUp.intersectsCircle(this.pacman.x, this.pacman.y, this.pacman.radius)) {
      this.powerModeUntil = now + 10000;
      this.powerUp = null;
      this.score += 20;
      this.pacman.addPulse(0.65);
      this.flash = Math.max(this.flash, 0.2);
      this.shakeTime = Math.max(this.shakeTime, 0.18);
      this.spawnParticles(this.pacman.x, this.pacman.y, "rgba(255, 214, 47, 0.95)", 16);
    }

    for (let index = this.ghosts.length - 1; index >= 0; index -= 1) {
      const ghost = this.ghosts[index];
      ghost.update(dt, this.pacman, powerActive, this.width, this.height, this.getGhostSpeedMultiplier());

      if (ghost.intersectsCircle(this.pacman.x, this.pacman.y, this.pacman.radius)) {
        if (powerActive) {
          this.ghosts.splice(index, 1);
          this.score += 100;
          this.highScore = Math.max(this.highScore, this.score);
          localStorage.setItem("pac-esplora-high-score", String(this.highScore));
          this.pacman.addPulse(0.45);
          this.flash = Math.max(this.flash, 0.18);
          this.spawnParticles(ghost.x, ghost.y, "rgba(111, 231, 255, 0.95)", 14);
        } else {
          this.endGame();
          break;
        }
      }
    }

    this.#updateParticles(dt);
    this.#updateFlash(dt);
    this.#updateShake(dt);
  }

  #updateParticles(dt) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      if (particle.life <= 0) {
        this.particles.splice(index, 1);
      }
    }
  }

  #updateFlash(dt) {
    this.flash = Math.max(0, this.flash - dt * 1.8);
  }

  #updateShake(dt) {
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.shakeStrength = Math.max(0, this.shakeStrength - dt * 18);
  }

  getPowerLabel(now) {
    if (this.state !== "playing") {
      return "Normal";
    }

    if (now < this.powerModeUntil) {
      const remaining = Math.ceil((this.powerModeUntil - now) / 1000);
      return `Power ${remaining}s`;
    }

    return "Normal";
  }

  getBrightness() {
    const light = clamp((this.sensors.luz || 0) / 1023, 0, 1);
    return 0.75 + light * 0.75;
  }

  render(now) {
    const ctx = this.ctx;
    const brightness = this.getBrightness();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    ctx.save();
    if (this.shakeTime > 0) {
      const shakeAmount = this.shakeStrength;
      const offsetX = (Math.random() - 0.5) * shakeAmount;
      const offsetY = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(offsetX, offsetY);
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);

    const backgroundGradient = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      40,
      this.width * 0.5,
      this.height * 0.45,
      Math.max(this.width, this.height) * 0.62,
    );
    backgroundGradient.addColorStop(0, "rgba(255, 214, 47, 0.08)");
    backgroundGradient.addColorStop(0.45, "rgba(111, 231, 255, 0.03)");
    backgroundGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.filter = `brightness(${brightness}) contrast(1.04)`;

    for (const powerUp of [this.powerUp].filter(Boolean)) {
      powerUp.draw(ctx, now);
    }

    for (const ghost of this.ghosts) {
      ghost.draw(ctx);
    }

    this.pacman.draw(ctx);

    for (const particle of this.particles) {
      const alpha = clamp(particle.life / 0.9, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flash})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.filter = "none";
    ctx.restore();
  }

  updateHud(now) {
    if (!this.ui) {
      return;
    }

    this.ui.scoreValue.textContent = String(this.score);
    this.ui.highScoreValue.textContent = String(this.highScore);
    this.ui.powerValue.textContent = this.getPowerLabel(now);
    this.ui.connectionStatus.textContent = this.status.label;
    this.ui.transportStatus.textContent = this.status.detail;

    this.ui.connectionStatus.classList.remove("badge--pending", "badge--online", "badge--offline");
    if (this.status.connected) {
      this.ui.connectionStatus.classList.add("badge--online");
    } else if (this.status.label === "Conectando") {
      this.ui.connectionStatus.classList.add("badge--pending");
    } else {
      this.ui.connectionStatus.classList.add("badge--offline");
    }
  }
}