import { ArduinoClient } from "./services/ArduinoClient.js";
import { Game } from "./game.js";

const canvas = document.getElementById("game");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");

const ui = {
  connectionStatus: document.getElementById("connectionStatus"),
  transportStatus: document.getElementById("transportStatus"),
  scoreValue: document.getElementById("scoreValue"),
  highScoreValue: document.getElementById("highScoreValue"),
  powerValue: document.getElementById("powerValue"),
};

const keyboardState = { left: false, right: false, up: false, down: false };
let lastTime = performance.now();

const loadImage = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const assets = await Promise.all([
  loadImage(new URL("../pacman.gif", import.meta.url).href),
  loadImage(new URL("../fantasma amarillo.png", import.meta.url).href),
  loadImage(new URL("../fantasma azul.png", import.meta.url).href),
  loadImage(new URL("../fantasma rojo.png", import.meta.url).href),
  loadImage(new URL("../fantasma rosa.png", import.meta.url).href),
]);

const game = new Game({
  canvas,
  assets: {
    pacman: assets[0],
    ghosts: assets.slice(1).filter(Boolean),
  },
  ui,
});

const arduino = new ArduinoClient();
arduino.onData((data) => game.setSensors(data));
arduino.onStatus((status) => game.setConnectionStatus(status));
arduino.connect();

const updateKeyboard = () => {
  const x = (keyboardState.right ? 1 : 0) - (keyboardState.left ? 1 : 0);
  const y = (keyboardState.down ? 1 : 0) - (keyboardState.up ? 1 : 0);
  const magnitude = Math.hypot(x, y) || 1;
  game.setKeyboardInput({
    x: x / magnitude,
    y: y / magnitude,
  });
};

const syncOverlay = () => {
  const state = game.state;
  if (state === "playing") {
    overlay.classList.remove("overlay--visible");
    overlay.setAttribute("aria-hidden", "true");
    return;
  }

  overlay.classList.add("overlay--visible");
  overlay.setAttribute("aria-hidden", "false");

  if (state === "intro") {
    overlayTitle.textContent = "Pac Esplora";
    overlayMessage.textContent = "Mueve a Pac-Man con el joystick. También puedes usar las flechas del teclado como respaldo.";
    startButton.textContent = "Jugar";
  } else if (state === "gameover") {
    overlayTitle.textContent = "Game Over";
    overlayMessage.textContent = `Puntuación final: ${game.score}. Pulsa reiniciar o btn1 para volver a jugar.`;
    startButton.textContent = "Reintentar";
  }
};

const resize = () => {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  game.resize(width, height);
};

window.addEventListener("resize", resize);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") keyboardState.left = true;
  if (event.key === "ArrowRight") keyboardState.right = true;
  if (event.key === "ArrowUp") keyboardState.up = true;
  if (event.key === "ArrowDown") keyboardState.down = true;
  updateKeyboard();

  if (event.key === "Enter" && game.state !== "playing") {
    game.start();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") keyboardState.left = false;
  if (event.key === "ArrowRight") keyboardState.right = false;
  if (event.key === "ArrowUp") keyboardState.up = false;
  if (event.key === "ArrowDown") keyboardState.down = false;
  updateKeyboard();
});

startButton.addEventListener("click", () => {
  game.start();
  syncOverlay();
});

restartButton.addEventListener("click", () => {
  game.restart();
  syncOverlay();
});

resize();
updateKeyboard();
syncOverlay();

const loop = (now) => {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  game.update(dt, now);
  game.render(now);
  game.updateHud(now);
  syncOverlay();

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);