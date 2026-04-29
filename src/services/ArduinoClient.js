export class ArduinoClient {
  constructor({ baseUrl = "https://arduino.arroyocreativa.com", wsUrl = "wss://arduino.arroyocreativa.com" } = {}) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.ws = null;
    this.latest = null;
    this.dataListeners = new Set();
    this.statusListeners = new Set();
    this.pollTimer = null;
    this.reconnectTimer = null;
    this.pollIntervalMs = 1000;
    this.reconnectDelayMs = 1000;
    this.maxReconnectDelayMs = 8000;
    this.status = {
      connected: false,
      transport: "offline",
      label: "Desconectado",
      detail: "Sin datos del Arduino",
    };
  }

  connect() {
    this.#openWebSocket();
  }

  dispose() {
    this.#clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onData(listener) {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onStatus(listener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  #emitData(data) {
    this.latest = data;
    for (const listener of this.dataListeners) {
      listener(data);
    }
  }

  #emitStatus(statusPatch) {
    this.status = {
      ...this.status,
      ...statusPatch,
    };

    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  #clearTimers() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  #openWebSocket() {
    this.#clearTimers();

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch {
      this.#startPolling();
      return;
    }

    this.#emitStatus({
      connected: false,
      transport: "websocket",
      label: "Conectando",
      detail: "Abriendo WebSocket",
    });

    this.ws.onopen = () => {
      this.reconnectDelayMs = 1000;
      this.#stopPolling();
      this.#emitStatus({
        connected: true,
        transport: "websocket",
        label: "En línea",
        detail: "WebSocket activo",
      });
    };

    this.ws.onmessage = (event) => {
      const payload = this.#parsePayload(event.data);
      if (payload) {
        this.#emitData(payload);
      }
    };

    this.ws.onerror = () => {
      this.#emitStatus({
        connected: false,
        transport: "websocket",
        label: "Reintentando",
        detail: "Error en WebSocket",
      });
    };

    this.ws.onclose = () => {
      this.#emitStatus({
        connected: false,
        transport: "websocket",
        label: "Reintentando",
        detail: "Cayó la conexión en tiempo real",
      });

      this.#startPolling();
      this.reconnectTimer = setTimeout(() => {
        this.#openWebSocket();
      }, this.reconnectDelayMs);

      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
    };
  }

  #startPolling() {
    if (this.pollTimer) {
      return;
    }

    this.#emitStatus({
      connected: false,
      transport: "rest",
      label: "Fallback activo",
      detail: "Consultando REST",
    });

    const poll = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/sensors`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const data = this.#parsePayload(payload);
        if (data) {
          this.#emitData(data);
          this.#emitStatus({
            connected: true,
            transport: "rest",
            label: "En línea",
            detail: "Datos desde REST",
          });
        }
      } catch {
        this.#emitStatus({
          connected: false,
          transport: "rest",
          label: "Fallback activo",
          detail: "Sin respuesta del backend",
        });
      }
    };

    poll();
    this.pollTimer = setInterval(poll, this.pollIntervalMs);
  }

  #stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  #parsePayload(raw) {
    if (!raw) {
      return null;
    }

    let parsed = raw;

    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
    }

    const candidate = parsed.data ?? parsed.sensors ?? parsed;
    if (candidate && typeof candidate === "object") {
      if (candidate.joystick || candidate.luz !== undefined || candidate.microfono !== undefined) {
        return candidate;
      }
    }

    return null;
  }
}