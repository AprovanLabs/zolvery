import { createApp, inject, ref } from 'vue';

export const app = createApp({
  setup() {
    const { on, emit, t } = inject('kossabos');
    console.log('t', t);

    const board = ref(Array(9).fill(null));
    const currentPlayer = ref('x');
    const winner = ref(null);
    const gameOver = ref(false);
    const winningCombo = ref(null);

    const winningCombos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ];

    const makeMove = (index) => {
      if (!board.value[index] && !winner.value) {
        board.value[index] = currentPlayer.value;
        checkWinner();
        currentPlayer.value = currentPlayer.value === 'x' ? 'o' : 'x';
      }
    };

    const checkWinner = () => {
      for (let combo of winningCombos) {
        if (
          board.value[combo[0]] &&
          board.value[combo[0]] === board.value[combo[1]] &&
          board.value[combo[0]] === board.value[combo[2]]
        ) {
          winner.value = board.value[combo[0]];
          gameOver.value = true;
          winningCombo.value = combo;

          emit('final', {
            label: `${currentPlayer} is the winner!`,
            standings: [
              { place: 1, user: currentPlayer },
              { place: 2, user: currentPlayer === 'x' ? 'o' : 'x' },
            ],
          });
          return;
        }
      }
      if (board.value.every((cell) => cell !== null)) {
        gameOver.value = true;
        emit('final', {
          label: `It's a draw!`,
          standings: [
            { place: 1, user: 'x' },
            { place: 1, user: 'o' },
          ],
        });
      }
    };

    const resetGame = () => {
      board.value = Array(9).fill(null);
      currentPlayer.value = 'x';
      winner.value = null;
      gameOver.value = false;
      winningCombo.value = null;
    };

    on('reset', () => {
      console.log('reset');
      resetGame();
    });
    on('message', (m) => {
      'inner message', m;
    });

    return {
      board,
      currentPlayer,
      winner,
      gameOver,
      makeMove,
      resetGame,
      t,
    };
  },
  template: `
    <div class="flex pt-8 justify-center">
      <div class="w-full max-w-md p-8">
        <div class="grid grid-cols-3 gap-2 mb-6 justify-items-center">
          <button
            v-motion
            v-for="(cell, index) in board"
            :key="index"
            @click="makeMove(index)"
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
            {{ t('current-player') }}
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
