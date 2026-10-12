// Adventure maps. Add a new level by copying one of these blocks.
//
// Each level belongs to a world, themed after one of the printed Roversa mats.
// There is no border: the edge of the map is the edge of the world, and
// driving off it counts as a bump.
//
// Map key (every world):
//   S  where Roversa starts
//   A, B, C  destinations to visit (what they look like depends on the world)
//   .  open ground (Roversa can drive here)
//
// world 'pond' (Duck Duck Robot mat): A, B, C are rubber ducks.
//   L  lily pad   V  cattails   (Roversa bumps into these)
//
// world 'island' (Grid Challenges mat): A is the red X, B the treasure chest, C the bags of gold.
//   f  grass tuft    =  dashed trail   (Roversa can drive here)
//   O  ocean   M  mountain   P  pine tree
//   K  Captain Clean Code   Y  Byteclaw the parrot   (Roversa bumps into these)
//
// world 'sea' (Underwater Adventure mat): A is the sunken chest, B the octopus, C Toothie.
//   *  sea star   %  coral   #  reef rock   (Roversa bumps into these)
//   Reef rock only goes on the edge of the map, where it reads as the shore.
//
// startDir: which way Roversa faces at the start: 'N' up, 'E' right, 'S' down, 'W' left.
// pieces:   how many of each puzzle piece the player gets.
//           F Forward, B Backward, L Turn Left, R Turn Right, P repeat, W wild.
// slots:    how many pieces fit in the algorithm row.
// newPiece: a puzzle piece this level uses for the first time. The first time the
//           level opens, a pop-up shows the piece and says what it does.
//
// The first level, Meet Roversa, is the guided tutorial. Instead of one map it
// has stages, each with its own map, pieces and guide: the steps a pointing hand
// walks the player through. Guide steps:
//   { do: 'robot' }           tap Roversa (the duck pops up after the tap)
//   { do: 'add', t, n }       add n of puzzle piece t (n defaults to 1)
//   { do: 'go' }              press GO
//   { do: 'free' }            no hand: the player works it out
// `say` is the line shown (and read aloud) for the step, a key in js/i18n.js.
// `show` is what the map draws to help: 'front' (arrows off Roversa's front),
// 'target' (where Roversa will end up), 'count' (numbered squares ahead) or
// 'turn' (an arc for the Turn piece being added).
//
// Run `node tools/check-levels.js` after editing to make sure every level
// can be solved and to see the shortest solution.
globalThis.ROVERSA_LEVELS = [
  // ---------- Duck Pond ----------
  {
    name: 'Meet Roversa',
    hint: 'Get Roversa to the duck!',
    world: 'pond',
    stages: [
      {
        startDir: 'E',
        pieces: { F: 1 },
        slots: 1,
        map: [
          '..V..',
          'SA...',
          'L...L',
        ],
        guide: [
          { do: 'robot', say: 'tut.front', show: 'front' },
          { do: 'add', t: 'F', say: 'tut.forward', show: 'target' },
          { do: 'go', say: 'tut.go', show: 'target' },
        ],
      },
      {
        startDir: 'E',
        pieces: { F: 3 },
        slots: 3,
        map: [
          '..V..',
          'S..A.',
          'L...L',
        ],
        guide: [
          { do: 'add', t: 'F', n: 3, say: 'tut.count', show: 'count' },
          { do: 'go', say: 'tut.go', show: 'target' },
        ],
      },
      {
        startDir: 'E',
        pieces: { F: 1, L: 1 },
        slots: 2,
        map: [
          'A.V..',
          'S....',
          'L...L',
        ],
        guide: [
          { do: 'add', t: 'L', say: 'tut.turn', show: 'turn' },
          { do: 'add', t: 'F', say: 'tut.thenForward', show: 'target' },
          { do: 'go', say: 'tut.go', show: 'target' },
        ],
      },
      {
        startDir: 'E',
        pieces: { F: 3, L: 1 },
        slots: 4,
        map: [
          '..V..',
          'L.A..',
          'S...L',
        ],
        guide: [
          { do: 'free', say: 'tut.free' },
        ],
      },
    ],
  },
  {
    name: 'First Steps',
    hint: 'Welcome to Duck Pond! Line up Forward pieces, then press GO!',
    world: 'pond',
    startDir: 'E',
    pieces: { F: 5 },
    slots: 5,
    map: [
      '.V...L',
      'S...A.',
      'L...V.',
    ],
  },
  {
    name: 'Turn the Corner',
    hint: 'Turn Left and Turn Right spin Roversa in place. They do not move it.',
    world: 'pond',
    newPiece: 'R',
    startDir: 'N',
    pieces: { F: 5, L: 2, R: 2 },
    slots: 7,
    map: [
      '...A.V',
      '.L...L',
      'S..V..',
    ],
  },
  {
    name: 'Lily Pad Maze',
    hint: 'Lily pads are in the way. Find a path around them.',
    world: 'pond',
    startDir: 'E',
    pieces: { F: 6, L: 3, R: 3 },
    slots: 11,
    map: [
      '..L..V',
      'S.L.A.',
      'V.....',
    ],
  },
  // ---------- Roversa Island ----------
  {
    name: 'Back It Up',
    hint: 'Welcome to Roversa Island! The Backward piece drives backward without turning around.',
    world: 'island',
    newPiece: 'B',
    startDir: 'E',
    pieces: { F: 5, B: 3, L: 2, R: 2 },
    slots: 7,
    map: [
      'Mf...P.',
      '.A.S.B.',
      'P....fM',
    ],
  },
  {
    name: 'Repeat Power',
    hint: 'Only one Forward piece! The red Roversa piece repeats the piece before it.',
    world: 'island',
    newPiece: 'P',
    startDir: 'E',
    pieces: { F: 1, P: 5 },
    slots: 6,
    map: [
      'Of..MP',
      'S====A',
      'OO..f.',
    ],
  },
  {
    name: 'Wild Card',
    hint: 'No Turn pieces here! Use the green Wild piece as the turn you need.',
    world: 'island',
    newPiece: 'W',
    startDir: 'E',
    pieces: { F: 3, W: 1 },
    slots: 4,
    map: [
      'M..P..M',
      'f..A..P',
      'PS....f',
    ],
  },
  {
    name: 'Around the Bay',
    hint: 'Roversa cannot swim, and the Captain and Byteclaw will not move. Drive around them.',
    world: 'island',
    startDir: 'N',
    pieces: { F: 5, B: 2, L: 3, R: 3, P: 3 },
    slots: 12,
    map: [
      '.A.OOY',
      '...OO.',
      '.S...B',
      'K.....',
    ],
  },
  // ---------- Under the Sea ----------
  {
    name: 'Coral Path',
    hint: 'Welcome Under the Sea! Follow the open water between the coral.',
    world: 'sea',
    startDir: 'E',
    pieces: { F: 4, L: 2, R: 2, P: 5 },
    slots: 12,
    map: [
      'S..%%*.',
      '#%.%%..',
      '#%....A',
    ],
  },
  {
    name: 'Grand Quest',
    hint: 'Visit the chest, the octopus and Toothie in one algorithm!',
    world: 'sea',
    startDir: 'E',
    pieces: { F: 5, B: 3, L: 3, R: 3, P: 8 },
    slots: 15,
    map: [
      'A...C.',
      '.*%%..',
      'S.##.B',
    ],
  },
];
