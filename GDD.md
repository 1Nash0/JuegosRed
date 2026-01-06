# 🎮 Game Design Document (GDD) – *MoleHole*

 ## 📑 Índice

1. [Información General](#1-información-general)
2. [Concepto del Juego](#2-concepto-del-juego)
3. [Mecánicas de Juego](#3-mecánicas-de-juego)
4. [Controles](#4-controles)
5. [Físicas y Escenario](#5-físicas-y-escenario)
6. [Arte y Diseño Visual](#6-arte-y-diseño-visual)
7. [Usuarios y Persistencia](#7-usuarios-y-persistencia)
8. [Gestión de Conexiones](#8-gestión-de-conexiones)
9. [Sonido](#7-sonido)
10. [Narrativa](#8-narrativa)
11. [Diagrama de Flujo](#9-diagrama-de-flujo)
12. [Referencias Externas](#10-referencias-externas)



## 1. Información General
- **Nombre del juego:** MoleHole
- **Género:** Party / Arcade Competitivo
- **Plataforma:** PC  
- **Modo:** Multijugador en red  
- **Público objetivo:** Todas las edades 
- **Estilo visual:** Cartoon
- **Inspiración:** Los juegos arcade clásicos de las ferias, Whac-A-Mole, It Takes Two
- **Duración promedio de partida:** 3 minutos
- **Número de jugadores:** 2 por partida

---

## 2. Concepto del Juego
* MoleHole es un juego competitivo por rondas en el que dos jugadores asumen roles opuestos:
  - *Jugador 1:* el mazo, que debe golpear al topo que aparece en diferentes agujeros.
  - *Jugador 2:* el topo, que debe engañar y esquivar al mazo, apareciendo en lugares estratégicos y usando power-ups para sumar puntos.
* El objetivo es acumular más puntos que el oponente antes de que el tiempo termine.
* El juego se ejecuta en una arquitectura cliente-servidor, donde el servidor se encarga de:
- Gestionar el estado de las partidas
- Validar puntuaciones y eventos
- Controlar las conexiones de los jugadores

---

## 3. Mecánicas de Juego
- El jugador que controla el mazo se moverá usando el ratón y el click izquierdo para golpear, mientras que el topo usará las teclas numéricas para aparecer por los diferentes agujeros.
- Si el jugador que controla el mazo logra golpear al topo gana puntos y el topo pierde, pero por cada error del mazo el topo es el que gana puntos y el mazo pierde.
- El juego contará con una serie de power-ups disponibles para cada jugador y que se pueden usar pulsando el click derecho para el mazo o la barra espaciadora para el topo. Estos power-ups no pueden acumularse, por lo que deberán ser usados antes de poder coger el siguiente. Su recolección consta de que aparezcan en algún agujero de manera aleatoria y oculta hasta que se consiga. Entre los power-ups se encuentran:
- Trampa: como su nombre indica es una trampa del topo que se coloca de manera secreta en uno o más agujeros y si el mazo golpea uno de estos perderá el doble de puntos y el topo ganará el doble. Si el topo decide salir por el agujero en el que se encuentra la trampa y el mazo lo golpea, este último perderá 1 punto mientras que el topo ganaría 1 punto.
- Bloqueo: el topo bloquea todos los agujeros durante un breve periodo de tiempo ganando puntos con el tiempo e impidiendo que el mazo golpee.
- Golpetazo: el mazo abre todos los agujeros durante un breve periodo de tiempo y puede golpear cualquier agujero para ganar puntos, este power-up no provoca que el topo pierda puntos. Si este Power Up es usado después de bloqueo, tendrá prioridad, si es usado mientras aún haya trampas en los agujeros, las elimina por completo.
- Mejora: el mazo obtiene un aumento durante un período de tiempo que le permite golpear más fuerte obteniendo el doble de puntos y provocando que el topo pierda el doble. Si el mazo golpea una trampa mientras el efecto esta activo, ninguno de los bandos pierde o gana puntos
- El juego contará con un reloj, en alguna zona de la pantalla que no moleste, que medirá en tiempo restante, una vez se termine el tiempo, el jugador con más puntos ganará la partida y se deberá iniciar otra partida para seguir jugando.
- Tiempo extra: Power-up pudiendo se agarrado por el mazo o el topo que aumenta el tiempo en 30 segundos por cada uso, hasta un máximo de 1:30, es decir, sólo puede ser usado 3 veces, a partir de ese momento dejará de aparecer.
### Lógica cliente-servidor
- El cliente se encarga de la representación visual, controles y animaciones.
- El servidor valida:
  - Golpes acertados
  - Uso de power-ups
  - Puntuaciones
  - Tiempo de partida
- El estado de la partida se sincroniza mediante peticiones REST.


---

## 4. Controles

| Acción   Pin          | Tecla / Botón               |
|-----------------------|-----------------------------|
| Aparecer              | Teclas numéricas            |
| Usar Power-Up        | Barra espaciadora / Click   |


| Acción   Pom          | Tecla / Botón               |
|-----------------------|-----------------------------|
| Moverse               | Movimiento del ratón        |
| Usar Power-Up        | Click derecho               |
| Golpear               | Click izquierdo             |


---

## 5. Físicas y Escenario
- **Mapa:** cuadrado 2D con 9 agujeros distribuidos en una cuadrícula 3x3 . 
- **Movimiento:**
  - Mazo se desplaza con suavidad (inercia ligera).
  - El topo aparece instantáneamente al pulsar una tecla numérica.
- **Colisiones:** simples, detección de impacto al hacer clic en el agujero activo. 
- **Spawn de power-ups:** aleatorio, con sistema de control para evitar repeticiones consecutivas.
- **UI:**
  - Reloj visible en la parte superior central.
  - Marcadores de puntos a izquierda y derecha.
  - Barra de estado para power-ups y cooldown.
  - Indicador de conexión al servidor en el menú principal:
    - Estado de conexión (conectado / desconectado)
    - Número de jugadores conectados
- **Sincronización:** 
  - El servidor mantiene el estado oficial del juego.
  - El cliente consulta periódicamente el estado para mantener la coherencia.


---

## 6. Usuarios y Persistencia
- El juego contará con un sistema de usuarios basado en nickname.
- El servidor almacenará:
  - Nickname del jugador
  - Puntuación máxima alcanzada
  - Número de partidas jugadas
- Estos datos podrán consultarse desde el cliente.
  
---

## 7. Gestión de Conexiones
- El cliente realiza peticiones periódicas al servidor para comprobar la conexión.
- Si se pierde la conexión:
  - Se pausa el juego
  - Se muestra una escena de reconexión
- El servidor registra las conexiones y desconexiones mediante logs.

---

## 8. Arte y Diseño Visual
- **Estilo:** Cartoon 
- **Cámara:** Top–down.  
- **Colores:** Paleta de colores vivos.
- **Animaciones:**
  - Topo saliendo del agujero
  - Golpe de mazo con efecto de impacto exagerado
  - Power-up recogido
- **Bocetos:**
 - Personajes principales
   
 ![Boceto de personaje](./public/assets/Bocetos/Personajes.png)
 -
 ![Boceto de personajes a color](./public/assets/Bocetos/Inicio.png)

- Diseño del mazo
  
![Mazo](./public/assets/mazo.png)

- Diseño del topo
  
![Topo](./public/assets/pin.png)
-
![Topo Golpeado](./public/assets/pingolpeado.png)


 - Escenario base sin los agujeros
   
 ![Escenario base](./public/assets/FondoGameplay.png)

 - Pantalla de créditos
 
 ![PowerUp de tiempo](./public/assets/FondoCreditos.png)

 - Iconos de power-ups
   
 ![PowerUp de tiempo](./public/assets/relojarena.png)
 -
 ![PowerUp de termómetro](./public/assets/termometro.png)


- **Logo:**
-
![Logo](./public/assets/Logo.png)

---

## 9. Sonido
- **Música:** BGM espacial retro estilo arcade.  
- **Efectos:**
- Sonido de golpe de mazo cuando el mazo golpea en la mesa y no da que al topo.
- Sonido de castor cuando el mazo golpea al topo
- Sonido de temblor cuando el topo usa el PowerUp del termómetro

---

## 10. Narrativa
- Erase una vez dos grandes amigos, Pin y Pom. Ambos crecieron juntos, con el mismo sueño, hacer que los malhechores estuviesen entre rejas, esto es debido a un recuerdo traumático de ambos, la muerte de otro gran amigo suyo a manos de un delincuente. Los dos crecieron apoyándose el uno al otro, tanto en los estudios como en otros temas. Al llegar a la universidad consiguieron su título y por fin llegaron a ser abogados. Su fama como pareja de abogados crecía como la espuma puesto que cuando estaban juntos no había ningún caso que se les resistiera. Sin embargo, el destino decidió jugársela poniéndolos en contra en un caso que llevaría a su separación. Pom acabó ganando a través de malas prácticas y Pin quedó solo. Con el tiempo, empezaron a distanciarse más todavía, Pom aumentaba su fama, pero Pin intentaba sacar a la luz sus trapos sucios. Al final, Pom acabó convirtiéndose en juez y en su primer caso, encontró a Pin y decidió, a partir de ese momento, hacerle la vida imposible.
- **Personajes:**  
  - *Pom* – Juez Pingüino
  - *Pin* – Abogado Topo

---

## 11. Diagrama de Flujo

![Diagrama de flujo](./public/assets/Diagrama.png)

## 12. Referencias externas
- Dibujos inspirados en "Bojack Horseman"
- Música del "HotLine Miami"
