// import { INVALID_MOVE } from 'boardgame.io/core';
import { computed, createApp, inject } from 'vue';
const INVALID_MOVE = 'INVALID_MOVE';

const isVictory = (cells, player) => {
  // Horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        cells[row][col] === player &&
        cells[row][col + 1] === player &&
        cells[row][col + 2] === player &&
        cells[row][col + 3] === player
      ) {
        return true;
      }
    }
  }

  // Vertical
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      if (
        cells[row][col] === player &&
        cells[row + 1][col] === player &&
        cells[row + 2][col] === player &&
        cells[row + 3][col] === player
      ) {
        return true;
      }
    }
  }

  // Diagonal
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        cells[row][col] === player &&
        cells[row + 1][col + 1] === player &&
        cells[row + 2][col + 2] === player &&
        cells[row + 3][col + 3] === player
      ) {
        return true;
      }
    }
  }

  // Diagonal
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        cells[row][col] === player &&
        cells[row - 1][col + 1] === player &&
        cells[row - 2][col + 2] === player &&
        cells[row - 3][col + 3] === player
      ) {
        return true;
      }
    }
  }

  return false;
};

const getLowestEmptyRow = (cells, col) => {
  for (let row = 5; row >= 0; row--) {
    if (cells[row][col] === null) {
      return row;
    }
  }
  return -1;
};

export const game = {
  setup: () => ({
    cells: Array(6)
      .fill(null)
      .map(() => Array(7).fill(null)),
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    dropToken: ({ G, ctx }, col) => {
      const row = getLowestEmptyRow(G.cells, col);
      if (row === -1) return INVALID_MOVE;

      G.cells[row][col] = ctx.currentPlayer;
    },
  },

  endIf: ({ G, ctx }) => {
    if (isVictory(G.cells, ctx.currentPlayer)) {
      return { winner: ctx.currentPlayer };
    }
    if (G.cells.every((row) => row.every((cell) => cell !== null))) {
      return { draw: true };
    }
  },

  ai: {
    enumerate: ({ G, ctx }) => {
      const moves = [];
      for (let col = 0; col < 7; col++) {
        if (getLowestEmptyRow(G.cells, col) !== -1) {
          moves.push({ move: 'dropToken', args: [col] });
        }
      }
      return moves;
    },
  },
};

export const app = createApp({
  setup() {
    const G = inject('G');
    const ctx = inject('ctx');
    const moves = inject('moves');

    const board = computed(() => G.value.cells);
    const currentPlayer = computed(() => ctx.value.currentPlayer);

    const getColumnHeight = (col) => {
      for (let row = board.value.length - 1; row >= 0; row--) {
        if (!board.value[row][col]) return row;
      }
      return -1;
    };

    const isColumnFull = (col) => getColumnHeight(col) === -1;

    return {
      board,
      currentPlayer,
      moves,
      isColumnFull,
    };
  },
  template: `
    <div class="flex pt-8 justify-center bg-gray-100 min-h-screen">
      <div class="w-full max-w-2xl p-8">
        <div class="bg-blue-800 p-4 rounded-lg shadow-xl">
          <div class="grid grid-cols-7 gap-2">
            <template v-for="(col, colIndex) in 7" :key="'col-' + colIndex">
              <button
                @click="moves.dropToken(colIndex)"
                :disabled="isColumnFull(colIndex)"
                class="w-full aspect-square relative hover:bg-blue-700 transition-colors rounded-full"
              >
                <div 
                  class="absolute inset-0 flex items-center justify-center"
                  v-motion
                  :initial="{ y: -20, opacity: 0 }"
                  :enter="{ y: 0, opacity: 1 }"
                >
                  <div class="w-3 h-3 bg-blue-300 rounded-full"></div>
                </div>
              </button>
            </template>
            
            <template v-for="row in 6" :key="'row-' + row">
              <template v-for="col in 7" :key="'cell-' + row + '-' + col">
                <div class="w-full aspect-square bg-blue-900 rounded-full relative">
                  <div
                    v-if="board[row-1][col-1]"
                    v-motion
                    :initial="{ scale: 0, y: -100 }"
                    :enter="{ scale: 1, y: 0 }"
                    class="absolute inset-1 rounded-full transition-colors duration-300"
                    :class="[
                      board[row-1][col-1] === '0' ? 'bg-red-500' : 'bg-yellow-400',
                      'shadow-inner'
                    ]"
                  ></div>
                  <div
                    v-else
                    class="absolute inset-1 rounded-full bg-blue-950"
                  ></div>
                </div>
              </template>
            </template>
          </div>
        </div>

        <div class="text-center mt-6">
          <span class="text-lg text-gray-700 flex items-center gap-4 justify-center">
            Current Player
            <span
              class="w-8 h-8 rounded-full transition-colors duration-300"
              :class="[
                currentPlayer === '0' ? 'bg-red-500' : 'bg-yellow-400',
                'shadow-md'
              ]"
            ></span>
          </span>
        </div>
      </div>
    </div>
  `,
});
