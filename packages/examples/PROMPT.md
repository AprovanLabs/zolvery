Generate a game using the Boardgame.io framework. Generate only the logic portion, called the game in the documentation. Respond with only the code. Use JavaScript. Automatically start the game.

Notes about library usage:
- Automatically start the game
- In callback functions, access the game variables as destructured elements of the first property: (e.g. `move({ G, ctx, random })`)
- Export the game as `export const game = ...`
- Handle AI's, if needed, by exporting a `ai: enumerate: ({ G, ctx }) => { ... }` that returns a list of possible plays
- Prefer helper functions to be arrow functions in lower camel case
- Edit the game state in-place

Description:

The game of 'Lettered'

Config:
- Number of players: 1
- Multiplayer: None

Post notes:

Additionally, print out TypeScript definitions of the game state in a GameState type along with a Moves interface specifying valid moves

---


I want you to code a professional, minimalistic game of Yahtzee.

Code this as a Vue application with very simple 2D graphics. Only respond with the code and use JavaScript as the response language

The core of the login has already been written using the Boardgame.io framework. Here is the state and available move types:

```ts
type GameState = {
  dice: [number, number, number, number, number],
  diceHeld: [boolean, boolean, boolean, boolean, boolean],
  players: {
    id: string,
    name: string,
    scoring: {
      ones: number | null,
      twos: number | null,
      threes: number | null,
      fours: number | null,
      fives: number | null,
      sixes: number | null,
      onePair: number | null,
      twoPairs: number | null,
      threeOfAKind: number | null,
      fourOfAKind: number | null,
      smallStraight: number | null,
      largeStraight: number | null,
      fullHouse: number | null,
      chance: number | null,
      yatzy: number | null,
    }
  }[],
  totalRolls: number,
}

interface Moves {
  rollDice: () => void;
  selectScore: (category: 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes' | 'onePair' | 'twoPairs' | 'threeOfAKind' | 'fourOfAKind' | 'smallStraight' | 'largeStraight' | 'fullHouse' | 'chance' | 'yatzy') => void;
  toggleDie: (dieIndex: number) => void
}
```

Use the following technologies:

- Vue, without '.vue' files
- TailwindCSS classes for styling. Do not use any custom classes.
- Embed the template in the createApp callback instead of including it in the
  HTML
- Add expressive animations

Notes:
- Show the current player in the same way as the upcoming example.
- Assign each player a unique color.
- Leave the background as primarily white
- Do not use string interpolation within the Vue template
- Make sure any reference to objects in the template are returned in an object in the `setup` function (including `ctx` and `G` )

Use the below example for a game of Tic Tac Toe:

```ts
import { createApp, inject } from 'vue';

interface Moves {
  makeMove: (index: number) => void,
}

interface GameState {
  board: ('x' | 'o' | null)[],
  currentPlayer: 'x' | 'o',
}

export const app = createApp({
  setup() {
    const G = inject('G');
    const ctx = inject('ctx');
    const moves = inject('moves');

    const board = computed(() => G.value.board);
    const currentPlayer = computed(() => cts.value.currentPlayer);

    return {
      board,
      currentPlayer,
      moves,
    }

  },
  template: `
    <div class="flex pt-8 justify-center">
      <div class="w-full max-w-md p-8">
        <div class="grid grid-cols-3 gap-2 mb-6 justify-items-center">
          <button
            v-motion
            v-for="(cell, index) in board"
            :key="index"
            @click="moves.makeMove(index)"
            class="flex items-center justify-center w-20 h-20 text-4xl font-bold transition-colors duration-200 rounded"
            :class="[
                  cell === 'x' ? 'bg-green-500 text-white' :
                  cell === 'o' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 hover:bg-gray-300'
                ]"
            :initial="{ padding: 0, rotate: 0, scale: 0.8 }"
            :hovered="{ padding: 10, rotate: Math.random() * 30 - 15, scale: 1 }"
          ></button>
        </div>
        <div class="text-center">
          <span
            class="text-md text-gray-500 font-light flex items-center gap-4 justify-center w-full"
          >
            Current Player
            <span
              class="flex items-center justify-center w-4 h-4 text-4xl font-bold transition-colors duration-200 rounded"
              :class="[
                    currentPlayer === 'x' ? 'bg-green-500 text-white' :
                    currentPlayer === 'o' ? 'bg-blue-500 text-white' :
                    'bg-gray-200 hover:bg-gray-300'
                  ]"
            ></span>
          </span>
        </div>
      </div>
    </div>
  `,
});
```
