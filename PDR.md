# PDR — Experiencia Interactiva con Arduino Esplora

---

## Índice

1. [Origen de los datos](#1-origen-de-los-datos)
2. [Objetivos de la experiencia](#2-objetivos-de-la-experiencia)
3. [Público y contexto de uso](#3-público-y-contexto-de-uso)
4. [Ideas  creativa](#4-idea-creativa)


---

## 1. Origen de los datos

---

### Contexto

El Arduino Esplora es una placa de microcontrolador diseñada para interacción física. A diferencia de un Arduino convencional, incluye sensores y actuadores integrados listos para usar sin cableado adicional. En este proyecto, la placa está conectada por USB a un computador Windows que ejecuta un servidor Node.js. Ese servidor lee los datos del puerto serial y los expone públicamente a través de una API JSON + WebSocket en:

```
https://arduino.arroyocreativa.com
```

El desarrollador **no necesita acceso físico al hardware ni conocimientos de electrónica** para construir una experiencia con estos datos.

---

### Sensores disponibles

La placa envía continuamente (cada ~10 ms) una lectura de todos sus sensores integrados:

| Campo            | Sensor físico          | Tipo de valor       | Rango típico         |
|------------------|------------------------|---------------------|----------------------|
| `joystick.x`     | Joystick analógico     | Entero              | −512 a 512           |
| `joystick.y`     | Joystick analógico     | Entero              | −512 a 512           |
| `luz`            | Fotoresistor           | Entero              | 0 (oscuro) – 1023    |
| `temperatura`    | Sensor de temperatura  | Entero (°C)         | ~10 – 50             |
| `slider`         | Potenciómetro lineal   | Entero              | 0 – 1023             |
| `acelerometro.x` | Acelerómetro 3 ejes    | Entero              | −512 a 512           |
| `acelerometro.y` | Acelerómetro 3 ejes    | Entero              | −512 a 512           |
| `acelerometro.z` | Acelerómetro 3 ejes    | Entero              | −512 a 512           |
| `botones.btn1`   | Botón táctil           | 0 = suelto, 1 = presionado | —           |
| `botones.btn2`   | Botón táctil           | 0 = suelto, 1 = presionado | —           |
| `botones.btn3`   | Botón táctil           | 0 = suelto, 1 = presionado | —           |
| `botones.btn4`   | Botón táctil           | 0 = suelto, 1 = presionado | —           |
| `microfono`      | Micrófono analógico    | Entero (amplitud)   | 0 – 1023             |
| `timestamp`      | Marca de tiempo server | ISO 8601 string     | —                    |

---

### Cómo consumir los datos

Hay dos formas según el tipo de experiencia a construir:

#### A. REST — para apps que consultan bajo demanda

Petición HTTP GET estándar. No requiere conexión persistente. Útil para dashboards, visualizaciones con actualización periódica o integraciones con otras APIs.

```
GET https://arduino.arroyocreativa.com/api/sensors
```

Respuesta:

```json
{
  "ok": true,
  "connected": true,
  "data": {
    "joystick":     { "x": 91, "y": -23 },
    "luz":          742,
    "temperatura":  27,
    "slider":       512,
    "acelerometro": { "x": 12, "y": -8, "z": 196 },
    "botones":      { "btn1": 0, "btn2": 1, "btn3": 0, "btn4": 0 },
    "microfono":    304,
    "timestamp":    "2026-04-29T16:30:00.000Z"
  }
}
```

Para obtener un solo sensor:

```
GET https://arduino.arroyocreativa.com/api/sensors/joystick
GET https://arduino.arroyocreativa.com/api/sensors/acelerometro
GET https://arduino.arroyocreativa.com/api/sensors/botones
```

Verificar si la placa está conectada:

```
GET https://arduino.arroyocreativa.com/api/status
```

---

#### B. WebSocket — para experiencias en tiempo real

Conexión persistente que recibe cada nueva lectura del sensor en cuanto llega (~10 ms). Ideal para juegos, visualizaciones generativas, instalaciones interactivas o cualquier cosa donde la latencia importa.

```
wss://arduino.arroyocreativa.com
```

El servidor envía automáticamente cada frame de datos como un mensaje JSON con la misma estructura del endpoint REST. No hay que enviar nada desde el cliente.

Ejemplo mínimo en JavaScript (navegador o Node.js):

```javascript
const ws = new WebSocket("wss://arduino.arroyocreativa.com");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  console.log("Joystick X:", data.joystick.x);
  console.log("Luz:",        data.luz);
  console.log("Btn1:",       data.botones.btn1);
};
```

---

### Consideraciones para el desarrollador

**Disponibilidad:** El servicio depende de que el computador local esté encendido, el Arduino conectado y el servidor corriendo. El campo `connected: false` en la respuesta indica que el serial está caído — los datos serán `null` en ese caso.

**Latencia:** El WebSocket refleja los datos con un retardo mínimo (serial → Node.js → Cloudflare Tunnel → cliente). Para la mayoría de experiencias interactivas esto es imperceptible.

**Sin autenticación:** El endpoint es público y de solo lectura. No expone datos sensibles.

**CORS:** Habilitado para cualquier origen — se puede consumir desde cualquier dominio sin configuración adicional.

**Referencia rápida:**

| Necesidad | Solución |
|---|---|
| Consulta puntual | `fetch("https://arduino.arroyocreativa.com/api/sensors")` |
| Tiempo real | `new WebSocket("wss://arduino.arroyocreativa.com")` |
| Un solo sensor | `/api/sensors/joystick` |
| Estado de conexión | `/api/status` |
| Demo visual | Abrir `https://arduino.arroyocreativa.com` en el navegador |

---

## 2. Objetivos de la experiencia

Quiero lograr una experiencia interactiva de ocio centrada en el entretenimiento. El objetivo es que el usuario se divierta durante un rato con un juego corto, dinámico y sencillo de entender, con respuestas inmediatas a los sensores del Arduino Esplora.

El resultado esperado es una web app jugable que use el backend público de Arduino como fuente de datos en tiempo real y que entregue una experiencia arcade clara, rejugable y visualmente reconocible.

## 3. Público y contexto de uso

La experiencia está pensada principalmente para niños y adolescentes, aunque debe ser lo bastante simple para que cualquier persona pueda entenderla en pocos segundos.

El contexto de uso es una web pública accesible desde un navegador con Internet. El usuario manipula el Arduino Esplora físicamente para mover al personaje, provocar acciones y reaccionar ante la partida en tiempo real.

## 4. Idea creativa

La experiencia será un juego arcade tipo Pac-Man sobre fondo negro.

El personaje principal será un Pac-Man controlado por el joystick. Cada 10 segundos aparecerá un fantasma en una posición aleatoria y comenzará a perseguir al jugador. Cada 15 segundos aparecerá una pastilla de poder; si Pac-Man la recoge, podrá comer fantasmas durante 10 segundos. Cada fantasma comido suma 100 puntos. Si un fantasma toca a Pac-Man cuando no está en modo poder, termina la partida y aparece un botón de reinicio.

La referencia visual será la estética clásica de Pac-Man: personaje amarillo, fantasmas de colores y una interfaz minimalista, con el fondo negro para resaltar el contraste.

### Mapeo de sensores

| Sensor | Uso en la experiencia |
|---|---|
| `joystick.x` y `joystick.y` | Movimiento del personaje |
| `microfono` | Entrada opcional para reforzar saltos, efectos o feedback sonoro visual |
| `luz` | Ajuste de brillo o intensidad visual de la pantalla |
| `acelerometro.z` | Efecto especial de zoom o pulso visual si hay un movimiento brusco |
| `botones` | Acciones auxiliares como reiniciar o activar estados de prueba |

## 5. Plan de desarrollo

El desarrollo se hará como una web app cliente que consume el backend existente en https://arduino.arroyocreativa.com/ mediante WebSocket para tiempo real y REST como respaldo.

### Fase 1: Base técnica

- Definir el stack de la app y crear la estructura inicial del proyecto.
- Montar la pantalla base, el canvas principal y la UI mínima.
- Preparar la carga de assets (Pac-Man y fantasmas).

### Fase 2: Integración con backend

- Conectar la app al WebSocket del backend.
- Implementar lectura de estado desde REST como fallback.
- Mostrar el estado de conexión y manejo de reconexión.

### Fase 3: Lógica del juego

- Implementar movimiento de Pac-Man con el joystick.
- Crear el sistema de aparición y persecución de fantasmas.
- Añadir colisiones, puntuación, power-up y game over.

### Fase 4: Presentación visual

- Renderizar sprites, interfaz y efectos de poder.
- Añadir animaciones de aparición, persecución y derrota.
- Ajustar contraste, escala y legibilidad.

### Fase 5: Pulido y validación

- Probar sensibilidad de controles con el Arduino real.
- Ajustar dificultad, velocidad y tiempos de spawn.
- Verificar estabilidad con conexión real al backend.

### Resultado final esperado

Una experiencia web simple, divertida y corta, lista para jugar desde el navegador, con sensores del Arduino Esplora conectados al backend público y una jugabilidad clara basada en persecución, recolección de poder y puntuación.