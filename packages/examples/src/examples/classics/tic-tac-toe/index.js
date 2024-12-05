const { ref, createApp } = window.Vue
const { on, emit } = window.Kossabos

export default createApp({
  setup() {
    const board = ref(Array(9).fill(null))
    const currentPlayer = ref('X')
    const winner = ref(null)
    const gameOver = ref(false)

    on('turn', (e) => console.log('e!', e));
    emit('final', {value: 2})

    const winningCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ]

    const makeMove = (index) => {
      if (!board.value[index] && !winner.value) {
        board.value[index] = currentPlayer.value
        checkWinner()
        currentPlayer.value = currentPlayer.value === 'X' ? 'O' : 'X'
      }
    }

    const checkWinner = () => {
      for (let combo of winningCombos) {
        if (
          board.value[combo[0]] &&
          board.value[combo[0]] === board.value[combo[1]] &&
          board.value[combo[0]] === board.value[combo[2]]
        ) {
          winner.value = board.value[combo[0]]
          gameOver.value = true
          return
        }
      }
      if (board.value.every(cell => cell !== null)) {
        gameOver.value = true
      }
    }

    const resetGame = () => {
      board.value = Array(9).fill(null)
      currentPlayer.value = 'X'
      winner.value = null
      gameOver.value = false
    }

    return {
      board,
      currentPlayer,
      winner,
      gameOver,
      makeMove,
      resetGame,
    }
  },
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="w-full max-w-md p-8 bg-white shadow-lg rounded-xl">
        <h1 class="mb-6 text-3xl font-bold text-center text-gray-800">NY Times Tic Tac Toe</h1>
        <div class="grid grid-cols-3 gap-2 mb-6">
          <button
            v-for="(cell, index) in board"
            :key="index"
            @click="makeMove(index)"
            class="flex items-center justify-center w-20 h-20 text-4xl font-bold transition-colors duration-200 rounded"
            :class="[
              cell === 'X' ? 'bg-kossabos-green text-white' :
              cell === 'O' ? 'bg-kossabos-yellow text-white' :
              'bg-gray-200 hover:bg-gray-300'
            ]"
          >
            {{ cell }}
          </button>
        </div>
        <div v-if="gameOver" class="mb-6 text-center">
          <p v-if="winner" class="text-2xl font-bold text-gray-800">
            Player {{ winner }} wins!
          </p>
          <p v-else class="text-2xl font-bold text-gray-800">
            It's a draw!
          </p>
        </div>
        <div v-else class="mb-6 text-center">
          <p class="text-xl text-gray-700">
            Current player: <span class="font-bold">{{ currentPlayer }}</span>
          </p>
        </div>
        <button
          @click="resetGame"
          class="w-full px-4 py-2 font-semibold text-white transition-colors duration-200 bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
        >
          New Game
        </button>
      </div>
    </div>
  `
})
