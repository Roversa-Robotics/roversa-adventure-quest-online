// Adventure maps. Add a new level by copying one of these blocks.
//
// Map key:
//   .  grass        f  flowers      =  sand path     (Roversa can drive here)
//   T  tree         R  rock         W  water         (Roversa bumps into these)
//   S  where Roversa starts
//   A  treasure chest   B  bags of gold   C  gold coins   (destinations to visit)
//
// startDir: which way Roversa faces at the start: 'N' up, 'E' right, 'S' down, 'W' left.
// pieces:   how many of each gamepiece the player gets.
//           F forward, B back, L turn left, R turn right, P repeat.
// slots:    how many pieces fit in the program row.
//
// Run `node tools/check-levels.js` after editing to make sure every level
// can be solved and to see the shortest solution.
globalThis.ROVERSA_LEVELS = [
  {
    name: 'First Steps',
    hint: 'Line up Forward pieces, then press GO!',
    startDir: 'E',
    pieces: { F: 5 },
    slots: 5,
    map: [
      'TTTTTTTT',
      'Tf.....T',
      'TS===A.T',
      'T....f.T',
      'TTTTTTTT',
    ],
  },
  {
    name: 'Turn the Corner',
    hint: 'Turn pieces spin Roversa in place. They do not move it.',
    startDir: 'N',
    pieces: { F: 5, L: 2, R: 2 },
    slots: 7,
    map: [
      'TTTTTTTT',
      'T...A.fT',
      'T.....RT',
      'TS.f...T',
      'TTTTTTTT',
    ],
  },
  {
    name: 'Rocky Road',
    hint: 'Rocks are in the way. Find a path around them.',
    startDir: 'E',
    pieces: { F: 6, L: 3, R: 3 },
    slots: 11,
    map: [
      'TTTTTTTT',
      'Tf.R...T',
      'TS.R.A.T',
      'T......T',
      'TTTTTTTT',
    ],
  },
  {
    name: 'Back It Up',
    hint: 'The Back piece drives backward without turning around.',
    startDir: 'E',
    pieces: { F: 5, B: 3, L: 2, R: 2 },
    slots: 7,
    map: [
      'TTTTTTTTT',
      'T.f.....T',
      'T.A.S.B.T',
      'T.....f.T',
      'TTTTTTTTT',
    ],
  },
  {
    name: 'Repeat Power',
    hint: 'Only one Forward piece! The red Roversa piece repeats the piece before it.',
    startDir: 'E',
    pieces: { F: 1, P: 5 },
    slots: 6,
    map: [
      'TTTTTTTT',
      'T.f..f.T',
      'TS====AT',
      'T......T',
      'TTTTTTTT',
    ],
  },
  {
    name: 'Lake Loop',
    hint: 'Roversa cannot swim. Drive around the lake.',
    startDir: 'N',
    pieces: { F: 5, B: 2, L: 3, R: 3, P: 3 },
    slots: 12,
    map: [
      'TTTTTTTT',
      'T.A.WWfT',
      'T...WW.T',
      'T.S...BT',
      'Tf.....T',
      'TTTTTTTT',
    ],
  },
  {
    name: 'Forest Path',
    hint: 'Follow the sand path through the trees.',
    startDir: 'E',
    pieces: { F: 4, L: 2, R: 2, P: 5 },
    slots: 12,
    map: [
      'TTTTTTTTT',
      'TS==TTf.T',
      'TTT=TT..T',
      'TfT====AT',
      'TTTTTTTTT',
    ],
  },
  {
    name: 'Grand Quest',
    hint: 'Find all three treasures in one program!',
    startDir: 'E',
    pieces: { F: 5, B: 3, L: 3, R: 3, P: 8 },
    slots: 15,
    map: [
      'TTTTTTTT',
      'TA...C.T',
      'Tf.RR..T',
      'TS....BT',
      'TTTTTTTT',
    ],
  },
];
