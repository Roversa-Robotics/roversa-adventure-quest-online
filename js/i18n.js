// Game text in English and Spanish, and the language picker.
// The first visit follows the browser's language; a choice in the picker is
// remembered on this device. To add a language, add a block like `es` below.
(function (root) {
  'use strict';

  // The iOS Share icon (a box with an arrow), drawn in the text colour.
  const SHARE_ICON = '<svg class="share-icon" viewBox="0 0 16 20" width="14" height="18" aria-hidden="true"><path d="M8 1v11M4 5l4-4 4 4M5 8H2v11h12V8h-3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  const STRINGS = {
    en: {
      'page.title': 'Roversa Adventure Quest',
      'lang.label': 'Language',
      'title.tagline': 'Choose a game. Create algorithms. Guide Roversa on a treasure-filled adventure!',
      'menu.adventures': 'Adventures',
      'menu.quest': 'Dice Quest',
      'credit': 'Inspired by Roversa Adventure Quest from <a href="https://roversa.com" target="_blank" rel="noopener">Roversa Robotics</a> (CC BY-NC-SA 4.0).',
      'home': 'Home',
      'back': 'Back',
      'quest.tagline': 'Roll the dice. Create an algorithm. Find the treasure!',
      'quest.goal': 'Be the first robot to collect all three treasures to win!',
      'quest.turn': 'Each turn, roll 5 virtual dice and arrange the resulting puzzle piece commands into an algorithm to guide Roversa toward a treasure on the map. You must use all 5 commands, but you can arrange them in any order.',
      'quest.special': 'Special puzzle pieces:',
      'quest.wildPiece': 'Green Roversa logo',
      'quest.wild': 'Wild! Use it as any arrow command.',
      'quest.repeatPiece': 'Red ROVERSA word',
      'quest.repeat': 'Repeat the command immediately before it.',
      'quest.offMap': 'Watch out! If Roversa drives off the map, it returns to the start.',
      'quest.howMany': 'How many players?',
      'players.1': '1 Player',
      'players.2': '2 Players',
      'players.ai': 'Play an AI Opponent',
      'aiName': '{name} (AI Opponent)',
      'ai.title': 'AI Opponent',
      'ai.pick': 'The AI Opponent is a computer player that rolls and picks its own puzzle pieces. How good should it be?',
      'ai.level.easy': 'Easy', 'ai.level.medium': 'Medium', 'ai.level.hard': 'Hard',
      'ai.desc.easy': 'Makes lots of mistakes', 'ai.desc.medium': 'Pretty good', 'ai.desc.hard': 'Plans every move',
      'ai.badge': 'AI Opponent · {level}',
      'ai.nextTurn': ' Now it is the turn of {robot}.',
      'ai.rolling': '{robot} is rolling the die...',
      'ai.thinking': '{robot} is thinking about its algorithm...',
      'ai.go': '{robot} presses GO!',
      'readAloud': 'Read aloud',
      'sound': 'Sound on or off',
      'map': 'Map',
      'program': 'Algorithm',
      'programRow': 'Algorithm row',
      'puzzlePieces': 'Puzzle pieces',
      'yourRoll': 'Your roll',
      'roll': 'Roll!',
      'go': 'GO',
      'go.label': 'Go',
      'step': 'STEP',
      'step.label': 'Step: run the next piece',
      'startOver': 'Start over',
      'clear': 'Clear',
      'clearProgram': 'Clear algorithm',
      'close': 'Close',
      'install.button': 'Install app',
      'install.ios': 'Play it like an app! Tap <b>Share</b> ' + SHARE_ICON + ' and then <b>Add to Home Screen</b>.',
      'update.banner': 'New version! Tap to refresh',
      'newGame': 'New game',
      'resetShort': 'Reset',
      'resetPieces': 'Reset: put the pieces back in your roll',
      'tip': 'Tap a piece to add it. Drag to move it. Tap a piece in the algorithm to take it out. STEP runs one piece at a time.',

      // The guided tutorial (Meet Roversa) and the new puzzle piece pop-up.
      'tut.label': 'START HERE',
      'tut.front': 'This end is Roversa\u2019s front. Tap Roversa!',
      'tut.forward': 'Tap Forward.',
      'tut.go': 'Now press GO!',
      'tut.count': 'One piece = one square. How many to reach the duck?',
      'tut.turn': 'Turn Left spins Roversa. It stays on its square.',
      'tut.thenForward': 'Now tap Forward.',
      'tut.free': 'Your turn! Get Roversa to the duck.',
      'tut.yay': 'Quack! You did it!',
      'tut.oops': 'Bump! Roversa ran into {what}. Change this piece.',
      'tut.notYet': 'Not there yet! Add more pieces, then press GO.',
      'tut.doneTitle': 'You made an algorithm!',
      'tut.doneText': 'An algorithm is a list of steps in order. Your puzzle pieces tell Roversa what to do, one at a time.',
      'new.title': 'New puzzle piece!',
      'new.R': 'Turn Right spins Roversa to the right. It stays on its square.',
      'new.B': 'Backward drives Roversa back one square without turning around.',
      'new.P': 'Repeat does the piece before it one more time.',
      'new.W': 'Wild becomes any arrow piece you choose: Forward, Backward, Turn Left or Turn Right.',
      'new.ok': 'Got it!',
      'new.again': 'Show the new puzzle piece again',

      'piece.F': 'Forward', 'piece.B': 'Backward', 'piece.L': 'Turn Left', 'piece.R': 'Turn Right', 'piece.P': 'Repeat', 'piece.W': 'Wild',
      'wildAs': 'Wild: {name}',
      'repeatAs': 'Repeat: {name}',
      'team.0': 'Red', 'team.1': 'Blue',
      'robot': '{team} Roversa',
      'char.octopus': 'Octopus', 'char.turtle': 'Turtle', 'char.monkey': 'Monkey', 'char.tiger': 'Tiger', 'char.elephant': 'Elephant', 'char.manatee': 'Manatee',
      'goal.A': 'the treasure chest', 'goal.B': 'the bags of gold', 'goal.C': 'the gold coins',
      'goalTo.A': 'the treasure chest', 'goalTo.B': 'the bags of gold', 'goalTo.C': 'the gold coins',
      'tile.T': 'a tree', 'tile.R': 'a rock', 'tile.W': 'the water',
      'tileShort.T': 'tree', 'tileShort.R': 'rock', 'tileShort.W': 'water',
      // Adventure worlds (see js/levels.js).
      'goal.pond.A': 'the rubber duck', 'goal.pond.B': 'the rubber duck', 'goal.pond.C': 'the rubber duck',
      'goalTo.pond.A': 'the rubber duck', 'goalTo.pond.B': 'the rubber duck', 'goalTo.pond.C': 'the rubber duck',
      'goal.island.A': 'the X', 'goal.island.B': 'the treasure chest', 'goal.island.C': 'the bags of gold',
      'goalTo.island.A': 'the X', 'goalTo.island.B': 'the treasure chest', 'goalTo.island.C': 'the bags of gold',
      'goal.sea.A': 'the sunken chest', 'goal.sea.B': 'the octopus', 'goal.sea.C': 'Toothie',
      'goalTo.sea.A': 'the sunken chest', 'goalTo.sea.B': 'the octopus', 'goalTo.sea.C': 'Toothie',
      'world.pond': 'Duck Pond', 'world.island': 'Roversa Island', 'world.sea': 'Under the Sea',
      'tile.V': 'the cattails', 'tileShort.V': 'cattails',
      'tile.L': 'a lily pad', 'tile.O': 'the ocean', 'tile.M': 'a mountain', 'tile.P': 'a pine tree',
      'tile.K': 'Captain Clean Code', 'tile.Y': 'Byteclaw', 'tile.*': 'a sea star', 'tile.%': 'the coral', 'tile.#': 'a reef rock',
      'tileShort.L': 'lily pad', 'tileShort.O': 'ocean', 'tileShort.M': 'mountain', 'tileShort.P': 'pine tree',
      'tileShort.K': 'Captain Clean Code', 'tileShort.Y': 'Byteclaw', 'tileShort.*': 'sea star', 'tileShort.%': 'coral', 'tileShort.#': 'reef rock',
      'edge': 'the edge', 'otherRobot': 'the other robot',
      'dir.0': 'up', 'dir.1': 'right', 'dir.2': 'down', 'dir.3': 'left',
      'and': ' and ',

      'where': 'column {x}, row {y}',
      'sr.map': 'Map, {cols} columns by {rows} rows.',
      'sr.robot': '{who} at {where}, facing {dir}.',
      'sr.goal': '{goal} at {where}',
      'sr.visited': ', visited',
      'sr.visitedBy': ', visited by {who}',
      'sr.blocked': 'In the way: {list}.',
      'sr.programPiece': '{name}, piece {n} of {total}. Enter removes it, arrow keys move it.',
      'sr.program': 'Algorithm, {n} of {total} pieces',
      'sr.poolPiece': '{name}, {n} left',
      'sr.turn': "{team}, it's your turn",
      'sr.goalVisited': '{goal} visited',
      'sr.goalNotYet': '{goal} not yet',
      'sr.stars': '{n} of 3 stars',
      'sr.ran': 'Piece {n}, {what}: Roversa {told}.',
      'sr.repeatNothing': 'Repeat with nothing before it',
      'told.move': 'moved to {where}',
      'told.turn': 'now facing {dir}',
      'told.noop': 'did nothing',
      'told.bump': 'bumped into {what}',
      'told.off': 'drove off the map and went back to the start',

      'levelNum': 'LEVEL {n}',
      'msg.readAloudOn': 'Read aloud is on.',
      'msg.pressRoll': '{who}press Roll to get 5 puzzle pieces!',
      'msg.whoPrefix': '{robot}: ',
      'msg.allPlaced': 'All pieces placed. Press GO!',
      'msg.full': 'The algorithm row is full. Take a piece out first.',
      'msg.reached': 'You reached {goal}!',
      'msg.driving': 'Roversa is driving...',
      'msg.drivingNamed': '{robot} is driving...',
      'msg.stepDone': 'Piece {n} of {total} done. Press STEP for the next one, or GO to finish.',
      'msg.didIt': 'You did it!',
      'msg.bumpLevel': 'Bump! Roversa ran into {what}. Change the algorithm and try again.',
      'msg.almost': 'Almost! Roversa still needs to visit {list}. Change the algorithm and try again.',
      'msg.visitedAll': '{robot} visited all three!',
      'msg.bumpQuest': 'Bump! {robot} ran into {what} and stopped.',
      'msg.offQuest': 'Whoops! {robot} drove off the map and went back to the start.',
      'msg.stopped': '{robot} stopped here.',
      'msg.nextTurn': " Now it is {team}'s turn. Press Roll!",
      'msg.rollAgain': ' Press Roll for your next turn.',
      'msg.arrange': 'Put all 5 pieces in the algorithm row in the order you want, then press GO.',

      'modal.pickRobot': 'Pick your robot',
      'costume.title': 'Pick your costume',
      'costume.pick': 'Pick a costume',
      'costume.change': 'Change costume',
      'modal.player': 'Player {n}',
      'modal.pickRobotBang': 'Pick your robot!',
      'modal.wild': 'Wild piece!',
      'modal.wildWhich': 'Which way should it go?',
      'modal.levelDone': 'Level complete!',
      'modal.used': ({ n }) => 'You used ' + n + ' piece' + (n === 1 ? '' : 's') + '.',
      'modal.canYou': ' Can you do it with only {n}?',
      'modal.fewest': ' That is the fewest possible!',
      'modal.tryAgain': 'Try again',
      'modal.next': 'Next',
      'modal.allLevels': 'All levels',
      'modal.wins': '{team} wins!',
      'modal.questDone': 'Quest complete!',
      'modal.foundAll': ({ robot, n }) => robot + ' found all three treasures in ' + n + ' turn' + (n === 1 ? '' : 's') + '.',
      'modal.playAgain': 'Play again',
      'modal.newGameQ': 'New game?',
      'modal.newGameText': 'Start a new Dice Quest with a new map.',
      'modal.keepPlaying': 'Keep playing',
    },

    es: {
      'page.title': 'Roversa Adventure Quest',
      'lang.label': 'Idioma',
      'title.tagline': 'Elige un juego. Crea algoritmos. ¡Guía a Roversa en una aventura llena de tesoros!',
      'menu.adventures': 'Aventuras',
      'menu.quest': 'Búsqueda con dado',
      'credit': 'Inspirado en Roversa Adventure Quest de <a href="https://roversa.com" target="_blank" rel="noopener">Roversa Robotics</a> (CC BY-NC-SA 4.0).',
      'home': 'Inicio',
      'back': 'Atrás',
      'quest.tagline': 'Tira los dados. Crea un algoritmo. ¡Encuentra el tesoro!',
      'quest.goal': '¡Sé el primer robot en conseguir los tres tesoros para ganar!',
      'quest.turn': 'En cada turno, tira 5 dados virtuales y ordena los comandos de las piezas de rompecabezas que salgan para formar un algoritmo que guíe a Roversa hacia un tesoro del mapa. Tienes que usar los 5 comandos, pero puedes ponerlos en el orden que quieras.',
      'quest.special': 'Piezas de rompecabezas especiales:',
      'quest.wildPiece': 'Logo verde de Roversa',
      'quest.wild': '¡Comodín! Úsala como cualquier comando de flecha.',
      'quest.repeatPiece': 'Palabra roja ROVERSA',
      'quest.repeat': 'Repite el comando que tiene justo antes.',
      'quest.offMap': '¡Cuidado! Si Roversa se sale del mapa, vuelve a la salida.',
      'quest.howMany': '¿Cuántos jugadores?',
      'players.1': '1 jugador',
      'players.2': '2 jugadores',
      'players.ai': 'Jugar contra un rival IA',
      'aiName': '{name} (rival IA)',
      'ai.title': 'Rival IA',
      'ai.pick': 'El rival IA es un jugador de computadora que tira el dado y elige sus propias piezas de rompecabezas. ¿Qué tan bueno quieres que sea?',
      'ai.level.easy': 'Fácil', 'ai.level.medium': 'Medio', 'ai.level.hard': 'Difícil',
      'ai.desc.easy': 'Se equivoca mucho', 'ai.desc.medium': 'Bastante bueno', 'ai.desc.hard': 'Planea cada movimiento',
      'ai.badge': 'Rival IA · {level}',
      'ai.nextTurn': ' Ahora le toca a {robot}.',
      'ai.rolling': '{robot} está tirando el dado...',
      'ai.thinking': '{robot} está pensando su algoritmo...',
      'ai.go': '¡{robot} pulsa VAMOS!',
      'readAloud': 'Leer en voz alta',
      'sound': 'Sonido sí o no',
      'map': 'Mapa',
      'program': 'Algoritmo',
      'programRow': 'Fila del algoritmo',
      'puzzlePieces': 'Piezas de rompecabezas',
      'yourRoll': 'Tu tirada',
      'roll': '¡Tirar!',
      'go': 'VAMOS',
      'go.label': 'Vamos',
      'step': 'PASO',
      'step.label': 'Paso: ejecuta la siguiente pieza',
      'startOver': 'Reiniciar',
      'clear': 'Borrar',
      'clearProgram': 'Borrar el algoritmo',
      'close': 'Cerrar',
      'install.button': 'Instalar app',
      'install.ios': '¡Juega como una app! Toca <b>Compartir</b> ' + SHARE_ICON + ' y luego <b>Agregar a pantalla de inicio</b>.',
      'update.banner': '¡Nueva versión! Toca para actualizar',
      'newGame': 'Juego nuevo',
      'resetShort': 'Reiniciar',
      'resetPieces': 'Reiniciar: devolver las piezas a tu tirada',
      'tip': 'Toca una pieza para añadirla. Arrástrala para moverla. Toca una pieza del algoritmo para quitarla. PASO ejecuta una pieza cada vez.',

      'tut.label': 'EMPIEZA AQUÍ',
      'tut.front': 'Este es el frente de Roversa. ¡Toca a Roversa!',
      'tut.forward': 'Toca Adelante.',
      'tut.go': '¡Ahora pulsa VAMOS!',
      'tut.count': 'Una pieza = un cuadro. ¿Cuántas para llegar al pato?',
      'tut.turn': 'Girar a la izquierda hace girar a Roversa. Se queda en su cuadro.',
      'tut.thenForward': 'Ahora toca Adelante.',
      'tut.free': '¡Tu turno! Lleva a Roversa hasta el pato.',
      'tut.yay': '¡Cuac! ¡Lo lograste!',
      'tut.oops': '¡Pum! Roversa chocó con {what}. Cambia esta pieza.',
      'tut.notYet': '¡Todavía no! Añade más piezas y pulsa VAMOS.',
      'tut.doneTitle': '¡Hiciste un algoritmo!',
      'tut.doneText': 'Un algoritmo es una lista de pasos en orden. Tus piezas de rompecabezas le dicen a Roversa qué hacer, una a una.',
      'new.title': '¡Pieza nueva!',
      'new.R': 'Girar a la derecha hace girar a Roversa hacia la derecha. Se queda en su cuadro.',
      'new.B': 'Atrás lleva a Roversa un cuadro hacia atrás sin darse la vuelta.',
      'new.P': 'Repetir hace la pieza anterior una vez más.',
      'new.W': 'El Comodín se convierte en la pieza de flecha que elijas: Adelante, Atrás, Girar a la izquierda o Girar a la derecha.',
      'new.ok': '¡Entendido!',
      'new.again': 'Ver otra vez la pieza nueva',

      'piece.F': 'Adelante', 'piece.B': 'Atrás', 'piece.L': 'Girar a la izquierda', 'piece.R': 'Girar a la derecha', 'piece.P': 'Repetir', 'piece.W': 'Comodín',
      'wildAs': 'Comodín: {name}',
      'repeatAs': 'Repetir: {name}',
      'team.0': 'roja', 'team.1': 'azul',
      'robot': 'Roversa {team}',
      'char.octopus': 'Pulpo', 'char.turtle': 'Tortuga', 'char.monkey': 'Mico', 'char.tiger': 'Tigre', 'char.elephant': 'Elefante', 'char.manatee': 'Manatí',
      'goal.A': 'el cofre del tesoro', 'goal.B': 'las bolsas de oro', 'goal.C': 'las monedas de oro',
      'goalTo.A': 'al cofre del tesoro', 'goalTo.B': 'a las bolsas de oro', 'goalTo.C': 'a las monedas de oro',
      'tile.T': 'un árbol', 'tile.R': 'una roca', 'tile.W': 'el agua',
      'tileShort.T': 'árbol', 'tileShort.R': 'roca', 'tileShort.W': 'agua',
      'goal.pond.A': 'el patito de goma', 'goal.pond.B': 'el patito de goma', 'goal.pond.C': 'el patito de goma',
      'goalTo.pond.A': 'al patito de goma', 'goalTo.pond.B': 'al patito de goma', 'goalTo.pond.C': 'al patito de goma',
      'goal.island.A': 'la X', 'goal.island.B': 'el cofre del tesoro', 'goal.island.C': 'las bolsas de oro',
      'goalTo.island.A': 'a la X', 'goalTo.island.B': 'al cofre del tesoro', 'goalTo.island.C': 'a las bolsas de oro',
      'goal.sea.A': 'el cofre hundido', 'goal.sea.B': 'el pulpo', 'goal.sea.C': 'Toothie',
      'goalTo.sea.A': 'al cofre hundido', 'goalTo.sea.B': 'al pulpo', 'goalTo.sea.C': 'a Toothie',
      'world.pond': 'Estanque de los Patos', 'world.island': 'Isla Roversa', 'world.sea': 'Bajo el Mar',
      'tile.V': 'las espadañas', 'tileShort.V': 'espadañas',
      'tile.L': 'un nenúfar', 'tile.O': 'el océano', 'tile.M': 'una montaña', 'tile.P': 'un pino',
      'tile.K': 'el Capitán Clean Code', 'tile.Y': 'Byteclaw', 'tile.*': 'una estrella de mar', 'tile.%': 'el coral', 'tile.#': 'una roca del arrecife',
      'tileShort.L': 'nenúfar', 'tileShort.O': 'océano', 'tileShort.M': 'montaña', 'tileShort.P': 'pino',
      'tileShort.K': 'Capitán Clean Code', 'tileShort.Y': 'Byteclaw', 'tileShort.*': 'estrella de mar', 'tileShort.%': 'coral', 'tileShort.#': 'roca del arrecife',
      'edge': 'el borde', 'otherRobot': 'el otro robot',
      'dir.0': 'arriba', 'dir.1': 'la derecha', 'dir.2': 'abajo', 'dir.3': 'la izquierda',
      'and': ' y ',

      'where': 'la columna {x}, fila {y}',
      'sr.map': 'Mapa de {cols} columnas por {rows} filas.',
      'sr.robot': '{who} en {where}, mirando hacia {dir}.',
      'sr.goal': '{goal} en {where}',
      'sr.visited': ', visitado',
      'sr.visitedBy': ', visitado por {who}',
      'sr.blocked': 'Obstáculos: {list}.',
      'sr.programPiece': '{name}, pieza {n} de {total}. Intro la quita, las flechas la mueven.',
      'sr.program': 'Algoritmo, {n} de {total} piezas',
      'sr.poolPiece': '{name}, quedan {n}',
      'sr.turn': '{team}, te toca',
      'sr.goalVisited': '{goal}: visitado',
      'sr.goalNotYet': '{goal}: todavía no',
      'sr.stars': '{n} de 3 estrellas',
      'sr.ran': 'Pieza {n}, {what}: Roversa {told}.',
      'sr.repeatNothing': 'Repetir sin pieza anterior',
      'told.move': 'se movió a {where}',
      'told.turn': 'ahora mira hacia {dir}',
      'told.noop': 'no hizo nada',
      'told.bump': 'chocó con {what}',
      'told.off': 'se salió del mapa y volvió a la salida',

      'levelNum': 'NIVEL {n}',
      'msg.readAloudOn': 'Leer en voz alta está activado.',
      'msg.pressRoll': '{who}¡pulsa Tirar para conseguir 5 piezas de rompecabezas!',
      'msg.whoPrefix': '{robot}: ',
      'msg.allPlaced': 'Todas las piezas están puestas. ¡Pulsa VAMOS!',
      'msg.full': 'La fila del algoritmo está llena. Quita una pieza primero.',
      'msg.reached': '¡Llegaste {goal}!',
      'msg.driving': 'Roversa está en marcha...',
      'msg.drivingNamed': '{robot} está en marcha...',
      'msg.stepDone': 'Pieza {n} de {total} hecha. Pulsa PASO para la siguiente, o VAMOS para terminar.',
      'msg.didIt': '¡Lo lograste!',
      'msg.bumpLevel': '¡Pum! Roversa chocó con {what}. Cambia el algoritmo e inténtalo otra vez.',
      'msg.almost': '¡Casi! Roversa todavía tiene que visitar {list}. Cambia el algoritmo e inténtalo otra vez.',
      'msg.visitedAll': '¡{robot} visitó los tres!',
      'msg.bumpQuest': '¡Pum! {robot} chocó con {what} y se detuvo.',
      'msg.offQuest': '¡Uy! {robot} se salió del mapa y volvió a la salida.',
      'msg.stopped': '{robot} se detuvo aquí.',
      'msg.nextTurn': ' Ahora le toca a {team}. ¡Pulsa Tirar!',
      'msg.rollAgain': ' Pulsa Tirar para tu siguiente turno.',
      'msg.arrange': 'Pon las 5 piezas en la fila del algoritmo en el orden que quieras y pulsa VAMOS.',

      'modal.pickRobot': 'Elige tu robot',
      'costume.title': 'Elige tu disfraz',
      'costume.pick': 'Elige un disfraz',
      'costume.change': 'Cambiar disfraz',
      'modal.player': 'Jugador {n}',
      'modal.pickRobotBang': '¡Elige tu robot!',
      'modal.wild': '¡Pieza comodín!',
      'modal.wildWhich': '¿Hacia dónde debe ir?',
      'modal.levelDone': '¡Nivel completado!',
      'modal.used': ({ n }) => 'Usaste ' + n + ' pieza' + (n === 1 ? '' : 's') + '.',
      'modal.canYou': ' ¿Puedes hacerlo con solo {n}?',
      'modal.fewest': ' ¡Es lo mínimo posible!',
      'modal.tryAgain': 'Otra vez',
      'modal.next': 'Siguiente',
      'modal.allLevels': 'Todos los niveles',
      'modal.wins': '¡Gana {team}!',
      'modal.questDone': '¡Búsqueda completada!',
      'modal.foundAll': ({ robot, n }) => robot + ' encontró los tres tesoros en ' + n + ' turno' + (n === 1 ? '' : 's') + '.',
      'modal.playAgain': 'Jugar otra vez',
      'modal.newGameQ': '¿Juego nuevo?',
      'modal.newGameText': 'Empieza una nueva búsqueda con dado en un mapa nuevo.',
      'modal.keepPlaying': 'Seguir jugando',
    },
  };

  // Level names and hints, in the same order as js/levels.js. English comes from levels.js.
  const LEVEL_TEXT = {
    es: [
      { name: 'Conoce a Roversa', hint: '¡Lleva a Roversa hasta el pato!' },
      { name: 'Primeros pasos', hint: '¡Llegaste al Estanque de los Patos! Pon piezas de Adelante en fila y pulsa VAMOS.' },
      { name: 'Dobla la esquina', hint: 'Girar a la izquierda y Girar a la derecha hacen que Roversa gire en su sitio. No la mueven.' },
      { name: 'Laberinto de nenúfares', hint: 'Hay nenúfares en el camino. Busca cómo rodearlos.' },
      { name: 'Marcha atrás', hint: '¡Llegaste a la Isla Roversa! La pieza Atrás hace que Roversa vaya hacia atrás sin darse la vuelta.' },
      { name: 'El poder de repetir', hint: '¡Solo una pieza de Adelante! La pieza roja de Roversa repite la pieza anterior.' },
      { name: 'Comodín', hint: '¡Aquí no hay piezas de girar! Usa la pieza Comodín verde como el giro que necesitas.' },
      { name: 'Vuelta a la bahía', hint: 'Roversa no sabe nadar, y el Capitán y Byteclaw no se mueven. Rodéalos.' },
      { name: 'Camino de coral', hint: '¡Ya estás Bajo el Mar! Sigue el agua abierta entre los corales.' },
      { name: 'Aguas salvajes', hint: 'Dos giros, pero solo una pieza de girar. ¡Usa el Comodín para el otro!' },
      { name: 'La gran búsqueda', hint: '¡Visita el cofre, el pulpo y a Toothie en un solo algoritmo! Cada pieza cuenta.' },
    ],
  };

  const LANGS = [
    { code: 'en', label: 'English', speech: 'en-US' },
    { code: 'es', label: 'Español', speech: 'es-ES' },
  ];

  function detect() {
    try {
      const saved = localStorage.getItem('roversa-lang');
      if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* storage blocked */ }
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (const p of prefs) {
      const code = String(p).toLowerCase().split('-')[0];
      if (STRINGS[code]) return code;
    }
    return 'en';
  }

  let lang = detect();
  const listeners = [];

  function tr(key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
    if (typeof s === 'function') return s(vars || {});
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  function levelText(i, level) {
    const t = LEVEL_TEXT[lang] && LEVEL_TEXT[lang][i];
    return { name: (t && t.name) || level.name, hint: (t && t.hint) || level.hint };
  }

  // Fills in every element marked with data-i18n (text), data-i18n-html (markup)
  // or data-i18n-attr ("aria-label:key; title:key").
  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = tr('page.title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = tr(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((x) => x.trim());
        if (attr && key) el.setAttribute(attr, tr(key));
      });
    });
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }

  function setLang(code) {
    if (!STRINGS[code] || code === lang) return;
    lang = code;
    try { localStorage.setItem('roversa-lang', code); } catch (e) { /* storage blocked */ }
    applyStatic();
    listeners.forEach((fn) => fn(lang));
  }

  root.RoversaI18n = {
    tr,
    levelText,
    applyStatic,
    setLang,
    LANGS,
    get lang() { return lang; },
    get speechLang() { return LANGS.find((l) => l.code === lang).speech; },
    onChange(fn) { listeners.push(fn); },
  };
})(globalThis);
