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
//   L  lily pad (Roversa bumps into it)
//
// world 'island' (Grid Challenges mat): A is the red X, B the treasure chest, C the bags of gold.
//   f  grass tuft    =  dashed trail   (Roversa can drive here)
//   O  ocean   M  mountain   P  pine tree
//   K  Captain Clean Code   Y  Byteclaw the parrot   (Roversa bumps into these)
//
// world 'sea' (Underwater Adventure mat): A is the sunken chest, B the octopus, C Toothie.
//   *  sea star   %  coral   #  reef rock   (Roversa bumps into these)
//
// startDir: which way Roversa faces at the start: 'N' up, 'E' right, 'S' down, 'W' left.
// pieces:   how many of each puzzle piece the player gets.
//           F Forward, B Backward, L Turn Left, R Turn Right, P repeat.
// slots:    how many pieces fit in the program row.
//
// Run `node tools/check-levels.js` after editing to make sure every level
// can be solved and to see the shortest solution.
globalThis.ROVERSA_LEVELS = [
  // ---------- Duck Pond ----------
  {
    name: 'First Steps',
    hint: 'Line up Forward pieces, then press GO!',
    world: 'pond',
    startDir: 'E',
    pieces: { F: 5 },
    slots: 5,
    map: [
      '.....L',
      'S...A.',
      'L.....',
    ],
  },
  {
    name: 'Turn the Corner',
    hint: 'Turn Left and Turn Right spin Roversa in place. They do not move it.',
    world: 'pond',
    startDir: 'N',
    pieces: { F: 5, L: 2, R: 2 },
    slots: 7,
    map: [
      '...A..',
      '.L...L',
      'S.....',
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
      '..L...',
      'S.L.A.',
      '......',
    ],
  },
  // ---------- Roversa Island ----------
  {
    name: 'Back It Up',
    hint: 'The Backward piece drives backward without turning around.',
    world: 'island',
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
    hint: 'Follow the open water between the coral.',
    world: 'sea',
    startDir: 'E',
    pieces: { F: 4, L: 2, R: 2, P: 5 },
    slots: 12,
    map: [
      'S..%%*.',
      '%#.%%..',
      '*%....A',
    ],
  },
  {
    name: 'Grand Quest',
    hint: 'Visit the chest, the octopus and Toothie in one program!',
    world: 'sea',
    startDir: 'E',
    pieces: { F: 5, B: 3, L: 3, R: 3, P: 8 },
    slots: 15,
    map: [
      'A...C.',
      '.*%#..',
      'S....B',
    ],
  },
];
