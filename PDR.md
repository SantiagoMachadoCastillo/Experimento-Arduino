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

_Redactar: qué se quiere lograr con la experiencia interactiva — propósito general (educativo, artístico, lúdico, demostrativo), qué debe sentir o aprender el usuario al interactuar con la placa, y cuál es el resultado esperado al final del desarrollo._

---Quiero lograr una experiencia interactiva de ocio (entretenimiento) que pueda divertir por un tiempo al usuario. La idea principal es que sea entretenido y que pueda liberar dopamina, y el resultado esperado es que sea un juego corto pero entretenido.

## 3. Público y contexto de uso

_Redactar: quién va a usar la experiencia (edad, perfil, nivel técnico), en qué entorno físico ocurre (instalación, aula, evento, web pública), y si el usuario manipula el Arduino directamente o solo observa los datos._

---Preferiblemente niños y adolescentes, y puede ocurrir en algún lugar con acceso a Internet. El usuario manipularía el Arduino para moverse en el entorno e interactuar con el.

## 4. Idea creativa

_Redactar: propuesta concreta de experiencia posible organizadas por sensor — por ejemplo, usar el acelerómetro para controlar ... algo, el micrófono para iniciar animaciones, el joystick para mover un personaje. Incluir referencias visuales._

---Un juego plataformero en el cual un dibujo tipo Pac-Man aparezca  en un fondo negro, y cada 10 segundos aparezca un fantasma en una posición aleatoria. Los fantasmas persiguen a Pac por toda la pantalla. También aparecerá una pastilla de poder cada 15 segundos la cual Pac come y puede comer a todos los fantasmas durante un tiempo de 10 segundos. Cada fantasma vale 100 puntos y se van sumando en el contador. Si un fantasma toca a Pac, se termina el juego y aparece el botón de reiniciar.