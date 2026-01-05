# 🎮 Game Design Document (GDD) – *MoleHole*

## 📑 Índice
1. Información General  
2. Concepto del Juego  
3. Arquitectura Cliente-Servidor  
4. Mecánicas de Juego  
5. Controles  
6. Físicas y Escenario  
7. Interfaz de Usuario (UI)  
8. Arte y Diseño Visual  
9. Sonido  
10. Narrativa  
11. Gestión de Usuarios y Persistencia  
12. Gestión de Conexiones y Errores  
13. Diagrama de Flujo  
14. Referencias Externas

---

## 1. Información General
- **Nombre del juego:** MoleHole  
- **Género:** Party / Arcade Competitivo  
- **Plataforma:** PC  
- **Modo:** Multijugador online (arquitectura cliente-servidor mediante API REST)  
- **Público objetivo:** Todas las edades  
- **Estilo visual:** Cartoon  
- **Inspiración:** Juegos arcade clásicos de feria, *Whac-A-Mole*, *It Takes Two*  
- **Duración promedio de partida:** 3 minutos  
- **Número de jugadores:** 2 por partida

---

## 2. Concepto del Juego
*MoleHole* es un juego competitivo por rondas en el que dos jugadores asumen roles opuestos:
- **Jugador 1 (Pom – el mazo):** debe golpear al topo cuando aparece en los distintos agujeros.
- **Jugador 2 (Pin – el topo):** debe engañar y esquivar al mazo, apareciendo estratégicamente y utilizando power-ups.

El objetivo es acumular más puntos que el oponente antes de que el tiempo termine. El juego se ejecuta mediante una arquitectura cliente-servidor, donde el servidor gestiona el estado de la partida, valida acciones y mantiene la coherencia entre jugadores.

---

## 3. Arquitectura Cliente-Servidor
- El **cliente** se encarga de:
  - Entrada del jugador
  - Representación visual
  - Animaciones y sonido
- El **servidor** se encarga de:
  - Gestión de partidas activas
  - Validación de golpes y power-ups
  - Control del tiempo y puntuaciones
  - Gestión de usuarios conectados

La comunicación se realiza mediante una **API REST**, utilizando correctamente los verbos HTTP (GET, POST, PUT, DELETE).

---

## 4. Mecánicas de Juego
- El mazo se controla con el ratón y golpea con clic izquierdo.
- El topo aparece en los agujeros usando teclas numéricas.
- El servidor valida si un golpe es correcto y actualiza la puntuación.
- Los errores del mazo benefician al topo y viceversa.

### Power-Ups
- **Trampa:** penaliza al mazo si golpea un agujero trampa.
- **Bloqueo:** bloquea temporalmente todos los agujeros.
- **Golpetazo:** abre todos los agujeros durante un breve periodo.
- **Mejora:** duplica puntos obtenidos y perdidos durante su efecto.
- **Tiempo extra:** añade 30 segundos hasta un máximo acumulado de 1:30.

El servidor controla la aparición, uso y prioridad de los power-ups.

---

## 5. Controles

### Pin (Topo)
| Acción | Tecla |
|------|------|
| Aparecer | Teclas numéricas |
| Usar power-up | Barra espaciadora |

### Pom (Mazo)
| Acción | Tecla |
|------|------|
| Moverse | Movimiento del ratón |
| Golpear | Click izquierdo |
| Usar power-up | Click derecho |

---

## 6. Físicas y Escenario
- **Mapa:** Escenario 2D cuadrado con 9 agujeros (3x3).
- **Movimiento:**
  - Mazo con ligera inercia.
  - Topo con aparición instantánea.
- **Colisiones:** detección simple validada por servidor.
- **Spawn de power-ups:** aleatorio, controlado por servidor para evitar repeticiones consecutivas.

---

## 7. Interfaz de Usuario (UI)
- Reloj visible en la parte superior central.
- Marcadores de puntuación para ambos jugadores.
- Indicadores de power-ups activos y cooldown.
- **Menú principal:**
  - Indicador de conexión al servidor (conectado / desconectado).
  - Número de usuarios conectados.

---

## 8. Arte y Diseño Visual
- **Estilo:** Cartoon
- **Cámara:** Top-down
- **Colores:** Paleta viva y contrastada
- **Animaciones:**
  - Topo saliendo del agujero
  - Golpe de mazo exagerado
  - Recogida de power-ups

---

## 9. Sonido
- **Música:** Estilo arcade retro.
- **Efectos:**
  - Golpe fallido del mazo
  - Golpe acertado al topo
  - Uso de power-ups

---

## 10. Narrativa
Pin y Pom crecieron juntos y compartieron el sueño de impartir justicia. Tras una traición que los separó, ambos acabaron enfrentados en un duelo constante. *MoleHole* representa este conflicto personal trasladado a un entorno arcade competitivo.

---

## 11. Gestión de Usuarios y Persistencia
- Sistema de login basado en nickname.
- El servidor almacena:
  - Nickname del jugador
  - Puntuación máxima
  - Número de partidas jugadas
- Los datos pueden ser consultados desde el cliente.

---

## 12. Gestión de Conexiones y Errores
- El cliente implementa un sistema de **keep-alive** mediante peticiones periódicas.
- Si se pierde la conexión:
  - Se pausa el juego
  - Se muestra una escena de reconexión
- El servidor registra conexiones y desconexiones mediante logs.
- Manejo básico de errores ante caídas del servidor.

---

## 13. Diagrama de Flujo
El diagrama incluye la interacción cliente-servidor, login, gestión de partidas, sincronización del estado y desconexiones.

---

## 14. Referencias Externas
- Estilo visual inspirado en *Bojack Horseman*
- Música inspirada en *Hotline Miami*
