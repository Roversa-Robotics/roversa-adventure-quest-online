// Game text in English and Spanish, and the language picker.
// The first visit follows the browser's language; a choice in the picker is
// remembered on this device. To add a language, add a block like `es` below.
(function (root) {
  'use strict';

  const STRINGS = {
    en: {
      'page.title': 'Roversa Adventure Quest',
      'lang.label': 'Language',
      'title.tagline': 'Line up the puzzle pieces. Press GO. Drive Roversa to every treasure!',
      'menu.adventures': 'Adventures',
      'menu.quest': 'Dice Quest',
      'credit': 'Inspired by Roversa Adventure Quest from <a href="https://roversa.com" target="_blank" rel="noopener">Roversa Robotics</a> (CC BY-NC-SA 4.0).',
      'home': 'Home',
      'back': 'Back',
      'quest.intro': 'Roll the Roversa die five times to get five puzzle pieces. Put them in order and press GO. First robot to find all three treasures wins!',
      'quest.rules': 'Every rolled piece must be used. The green Roversa logo piece is wild: it can be any arrow. The red Roversa word piece repeats the piece before it. If Roversa drives off the map it goes back to the start.',
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
      'ai.thinking': '{robot} is thinking about its program...',
      'ai.go': '{robot} presses GO!',
      'readAloud': 'Read aloud',
      'sound': 'Sound on or off',
      'map': 'Map',
      'program': 'Program',
      'programRow': 'Program row',
      'puzzlePieces': 'Puzzle pieces',
      'yourRoll': 'Your roll',
      'roll': 'Roll!',
      'go': 'GO',
      'go.label': 'Go',
      'step': 'STEP',
      'step.label': 'Step: run the next piece',
      'startOver': 'Start over',
      'clear': 'Clear',
      'clearProgram': 'Clear program',
      'newGame': 'New game',
      'resetShort': 'Reset',
      'resetPieces': 'Reset: put the pieces back in your roll',
      'tip': 'Tap a piece to add it. Drag to move it. Tap a piece in the program to take it out. Tap the map to guess where Roversa will stop! STEP runs one piece at a time.',

      'piece.F': 'Forward', 'piece.B': 'Backward', 'piece.L': 'Turn Left', 'piece.R': 'Turn Right', 'piece.P': 'Repeat', 'piece.W': 'Wild',
      'wildAs': 'Wild: {name}',
      'team.0': 'Red', 'team.1': 'Blue',
      'robot': '{team} Roversa',
      'char.octopus': 'Octopus', 'char.turtle': 'Turtle', 'char.monkey': 'Monkey', 'char.tiger': 'Tiger', 'char.elephant': 'Elephant', 'char.manatee': 'Manatee',
      'goal.A': 'the treasure chest', 'goal.B': 'the bags of gold', 'goal.C': 'the gold coins',
      'goalTo.A': 'the treasure chest', 'goalTo.B': 'the bags of gold', 'goalTo.C': 'the gold coins',
      'tile.T': 'a tree', 'tile.R': 'a rock', 'tile.W': 'the water',
      'tileShort.T': 'tree', 'tileShort.R': 'rock', 'tileShort.W': 'water',
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
      'sr.guess': 'Your guess: {where}.',
      'sr.keys': 'Use arrow keys on the map to move your guess.',
      'sr.guessAt': 'Guess at {where}.',
      'sr.programPiece': '{name}, piece {n} of {total}. Enter removes it, arrow keys move it.',
      'sr.program': 'Program, {n} of {total} pieces',
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
      'msg.full': 'The program row is full. Take a piece out first.',
      'msg.guess': 'Your guess: Roversa will stop on the ? square. Press GO to find out!',
      'msg.guessRemoved': 'Guess removed.',
      'msg.reached': 'You reached {goal}!',
      'msg.driving': 'Roversa is driving...',
      'msg.drivingNamed': '{robot} is driving...',
      'msg.stepDone': 'Piece {n} of {total} done. Press STEP for the next one, or GO to finish.',
      'msg.guessRight': ' Your guess was right!',
      'msg.guessWrong': ' Your guess was not quite right.',
      'msg.didIt': 'You did it!',
      'msg.bumpLevel': 'Bump! Roversa ran into {what}. Change the program and try again.',
      'msg.almost': 'Almost! Roversa still needs to visit {list}. Change the program and try again.',
      'msg.visitedAll': '{robot} visited all three!',
      'msg.bumpQuest': 'Bump! {robot} ran into {what} and stopped.',
      'msg.offQuest': 'Whoops! {robot} drove off the map and went back to the start.',
      'msg.stopped': '{robot} stopped here.',
      'msg.nextTurn': " Now it is {team}'s turn. Press Roll!",
      'msg.rollAgain': ' Press Roll for your next turn.',
      'msg.arrange': 'Put all 5 pieces in the program row in the order you want, then press GO.',

      'modal.pickRobot': 'Pick your robot',
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
      'title.tagline': 'Pon las piezas de rompecabezas en orden. Pulsa VAMOS. ¡Lleva a Roversa a cada tesoro!',
      'menu.adventures': 'Aventuras',
      'menu.quest': 'Búsqueda con dado',
      'credit': 'Inspirado en Roversa Adventure Quest de <a href="https://roversa.com" target="_blank" rel="noopener">Roversa Robotics</a> (CC BY-NC-SA 4.0).',
      'home': 'Inicio',
      'back': 'Atrás',
      'quest.intro': 'Tira el dado de Roversa cinco veces para conseguir cinco piezas de rompecabezas. Ponlas en orden y pulsa VAMOS. ¡Gana el primer robot que encuentre los tres tesoros!',
      'quest.rules': 'Hay que usar todas las piezas que salen. La pieza verde con el logo de Roversa es comodín: puede ser cualquier flecha. La pieza roja con la palabra Roversa repite la pieza anterior. Si Roversa se sale del mapa, vuelve a la salida.',
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
      'ai.thinking': '{robot} está pensando su programa...',
      'ai.go': '¡{robot} pulsa VAMOS!',
      'readAloud': 'Leer en voz alta',
      'sound': 'Sonido sí o no',
      'map': 'Mapa',
      'program': 'Programa',
      'programRow': 'Fila del programa',
      'puzzlePieces': 'Piezas de rompecabezas',
      'yourRoll': 'Tu tirada',
      'roll': '¡Tirar!',
      'go': 'VAMOS',
      'go.label': 'Vamos',
      'step': 'PASO',
      'step.label': 'Paso: ejecuta la siguiente pieza',
      'startOver': 'Reiniciar',
      'clear': 'Borrar',
      'clearProgram': 'Borrar el programa',
      'newGame': 'Juego nuevo',
      'resetShort': 'Reiniciar',
      'resetPieces': 'Reiniciar: devolver las piezas a tu tirada',
      'tip': 'Toca una pieza para añadirla. Arrástrala para moverla. Toca una pieza del programa para quitarla. ¡Toca el mapa para adivinar dónde parará Roversa! PASO ejecuta una pieza cada vez.',

      'piece.F': 'Adelante', 'piece.B': 'Atrás', 'piece.L': 'Girar a la izquierda', 'piece.R': 'Girar a la derecha', 'piece.P': 'Repetir', 'piece.W': 'Comodín',
      'wildAs': 'Comodín: {name}',
      'team.0': 'roja', 'team.1': 'azul',
      'robot': 'Roversa {team}',
      'char.octopus': 'Pulpo', 'char.turtle': 'Tortuga', 'char.monkey': 'Mico', 'char.tiger': 'Tigre', 'char.elephant': 'Elefante', 'char.manatee': 'Manatí',
      'goal.A': 'el cofre del tesoro', 'goal.B': 'las bolsas de oro', 'goal.C': 'las monedas de oro',
      'goalTo.A': 'al cofre del tesoro', 'goalTo.B': 'a las bolsas de oro', 'goalTo.C': 'a las monedas de oro',
      'tile.T': 'un árbol', 'tile.R': 'una roca', 'tile.W': 'el agua',
      'tileShort.T': 'árbol', 'tileShort.R': 'roca', 'tileShort.W': 'agua',
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
      'sr.guess': 'Tu predicción: {where}.',
      'sr.keys': 'Usa las flechas del teclado en el mapa para mover tu predicción.',
      'sr.guessAt': 'Predicción en {where}.',
      'sr.programPiece': '{name}, pieza {n} de {total}. Intro la quita, las flechas la mueven.',
      'sr.program': 'Programa, {n} de {total} piezas',
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
      'msg.full': 'La fila del programa está llena. Quita una pieza primero.',
      'msg.guess': 'Tu predicción: Roversa parará en la casilla ?. ¡Pulsa VAMOS para comprobarlo!',
      'msg.guessRemoved': 'Predicción quitada.',
      'msg.reached': '¡Llegaste {goal}!',
      'msg.driving': 'Roversa está en marcha...',
      'msg.drivingNamed': '{robot} está en marcha...',
      'msg.stepDone': 'Pieza {n} de {total} hecha. Pulsa PASO para la siguiente, o VAMOS para terminar.',
      'msg.guessRight': ' ¡Acertaste tu predicción!',
      'msg.guessWrong': ' Tu predicción no fue del todo correcta.',
      'msg.didIt': '¡Lo lograste!',
      'msg.bumpLevel': '¡Pum! Roversa chocó con {what}. Cambia el programa e inténtalo otra vez.',
      'msg.almost': '¡Casi! Roversa todavía tiene que visitar {list}. Cambia el programa e inténtalo otra vez.',
      'msg.visitedAll': '¡{robot} visitó los tres!',
      'msg.bumpQuest': '¡Pum! {robot} chocó con {what} y se detuvo.',
      'msg.offQuest': '¡Uy! {robot} se salió del mapa y volvió a la salida.',
      'msg.stopped': '{robot} se detuvo aquí.',
      'msg.nextTurn': ' Ahora le toca a {team}. ¡Pulsa Tirar!',
      'msg.rollAgain': ' Pulsa Tirar para tu siguiente turno.',
      'msg.arrange': 'Pon las 5 piezas en la fila del programa en el orden que quieras y pulsa VAMOS.',

      'modal.pickRobot': 'Elige tu robot',
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
      { name: 'Primeros pasos', hint: 'Pon piezas de Adelante en fila y pulsa VAMOS.' },
      { name: 'Dobla la esquina', hint: 'Girar a la izquierda y Girar a la derecha hacen que Roversa gire en su sitio. No la mueven.' },
      { name: 'Camino rocoso', hint: 'Hay rocas en el camino. Busca cómo rodearlas.' },
      { name: 'Marcha atrás', hint: 'La pieza Atrás hace que Roversa vaya hacia atrás sin darse la vuelta.' },
      { name: 'El poder de repetir', hint: '¡Solo una pieza de Adelante! La pieza roja de Roversa repite la pieza anterior.' },
      { name: 'Vuelta al lago', hint: 'Roversa no sabe nadar. Rodea el lago.' },
      { name: 'Sendero del bosque', hint: 'Sigue el camino de arena entre los árboles.' },
      { name: 'La gran búsqueda', hint: '¡Encuentra los tres tesoros en un solo programa!' },
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
