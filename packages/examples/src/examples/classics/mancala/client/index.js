import { ref, createApp, inject } from 'vue';

export const app = createApp({
  setup() {
    const { on, emit } = inject('kossabos');

    // Mancala board setup: 6 pits per side, 2 stores (one for each player)
    const initialStones = 4
    const board = ref(Array(14).fill(initialStones))
    
    // Set stores (index 6 for player 1, index 13 for player 2) to 0
    board.value[6] = 0
    board.value[13] = 0
    
    const currentPlayer = ref(1) // Player 1 starts
    const gameOver = ref(false)
    const winner = ref(null)

    // Check if a player's side is empty
    const checkGameOver = () => {
      const player1Pits = board.value.slice(0, 6)
      const player2Pits = board.value.slice(7, 13)
      
      if (player1Pits.every(pit => pit === 0) || player2Pits.every(pit => pit === 0)) {
        gameOver.value = true
        
        // Collect remaining stones
        const remainingPlayer1 = player1Pits.reduce((a, b) => a + b, 0)
        const remainingPlayer2 = player2Pits.reduce((a, b) => a + b, 0)
        
        board.value[6] += remainingPlayer1
        board.value[13] += remainingPlayer2
        
        // Determine winner
        if (board.value[6] > board.value[13]) {
          winner.value = 1
        } else if (board.value[13] > board.value[6]) {
          winner.value = 2
        } else {
          winner.value = 0 // draw
        }

        // Emit final game result
        emit('final', {
          label: winner.value === 0 
            ? "It's a draw!" 
            : `Player ${winner.value} wins!`,
          standings: winner.value === 0 
            ? [
                { place: 1, user: 'Player 1' },
                { place: 1, user: 'Player 2' }
              ]
            : [
                { place: 1, user: `Player ${winner.value}` },
                { place: 2, user: winner.value === 1 ? 'Player 2' : 'Player 1' }
              ]
        })
      }
    }

    // Make a move in Mancala
    const makeMove = (pitIndex) => {
      // Validate move
      if (gameOver.value) return
      
      // Determine if the pit belongs to the current player
      const isPlayer1Turn = currentPlayer.value === 1
      const validPitRange = isPlayer1Turn 
        ? [0, 1, 2, 3, 4, 5] 
        : [7, 8, 9, 10, 11, 12]
      
      if (!validPitRange.includes(pitIndex) || board.value[pitIndex] === 0) return

      // Pick up stones
      let stones = board.value[pitIndex]
      board.value[pitIndex] = 0
      let currentPit = pitIndex

      // Distribute stones
      while (stones > 0) {
        currentPit = (currentPit + 1) % 14
        
        // Skip opponent's store
        if ((isPlayer1Turn && currentPit === 13) || (!isPlayer1Turn && currentPit === 6)) {
          continue
        }
        
        board.value[currentPit]++
        stones--
      }

      // Last stone landing rules
      const lastPitLanded = currentPit
      
      // If last stone lands in player's own store, they get another turn
      const shouldRepeatTurn = 
        (isPlayer1Turn && lastPitLanded === 6) || 
        (!isPlayer1Turn && lastPitLanded === 13)
      
      // If last stone lands in an empty pit on player's side, capture stones
      if (!shouldRepeatTurn) {
        const captureCondition = 
          (isPlayer1Turn && lastPitLanded < 6 && board.value[lastPitLanded] === 1) ||
          (!isPlayer1Turn && lastPitLanded > 6 && lastPitLanded < 13 && board.value[lastPitLanded] === 1)
        
        if (captureCondition) {
          const oppositePit = 12 - lastPitLanded
          if (board.value[oppositePit] > 0) {
            if (isPlayer1Turn) {
              board.value[6] += board.value[lastPitLanded] + board.value[oppositePit] + 1
            } else {
              board.value[13] += board.value[lastPitLanded] + board.value[oppositePit] + 1
            }
            board.value[lastPitLanded] = 0
            board.value[oppositePit] = 0
          }
        }
      }

      // Switch players if no repeat turn
      if (!shouldRepeatTurn) {
        currentPlayer.value = currentPlayer.value === 1 ? 2 : 1
      }

      // Check for game over condition
      checkGameOver()
    }

    const resetGame = () => {
      board.value = Array(14).fill(initialStones)
      board.value[6] = 0
      board.value[13] = 0
      currentPlayer.value = 1
      gameOver.value = false
      winner.value = null
    }

    on('reset', () => resetGame())

    return {
      board,
      currentPlayer,
      gameOver,
      winner,
      makeMove,
      resetGame
    }
  },
  template: `
    <div class="flex pt-8 justify-center">
        <div class="w-full max-w-3xl p-2">
        <div class="flex mb-6 flex-col justify-center">
            <!-- Player 2's side (top row, right to left) -->
            <div class="flex flex-row-reverse justify-center gap-1">
            <div v-for="(stones, index) in board.slice(7, 13)" :key="index"
                @click="makeMove(index + 7)"
                class="flex flex-col gap-1 py-4 hover:py-3 flex-wrap content-center items-center justify-center w-16 h-24 cursor-pointer transition-all duration-200 border-2 rounded-lg hover:bg-gray-100 text-lg font-bold"
                :class="[
                    currentPlayer === 2 ? 'border-blue-500': 'border-gray-300'
                ]"
                v-motion
                :initial="{ borderWidth: 4, rotate: 0, scale: 0.9 }"
                :hovered="{ borderWidth: 8, rotate: Math.random() * 20 - 10, scale: 1 }"
            >
                <span
                  v-for="stone in stones" :key="stoke"
                  class="w-2 h-2 rounded-full bg-black"
                >
            </div>
            </div>

            <!-- Stores -->
            <div class="flex w-full justify-between items-center h-24 max-w-md mx-auto">
                <div class="bg-gray-200 border-b-4 border-blue-500 p-8 rounded-lg flex items-center justify-center h-1/2 text-lg font-bold">
                <span class="mr-4 heroicon heroicon-arrow-down"></span>
                    {{ board[13] }}
                </div>
                <div class="bg-gray-200 border-b-4 border-green-500 p-8 rounded-lg flex items-center justify-center h-1/2 text-lg font-bold">
                    {{ board[6] }}
                    <span class="ml-4 heroicon heroicon-arrow-up"></span>
                </div>
            </div>

            <!-- Player 1's side (bottom row, left to right) -->
            <div class="flex justify-center gap-1">
            <div v-for="(stones, index) in board.slice(0, 6)" :key="index"
                @click="makeMove(index)"
                class="flex flex-col gap-1 py-4 hover:py-3 content-center flex-wrap items-center justify-center w-16 h-24 cursor-pointer transition-all duration-200 border-2 rounded-lg hover:bg-gray-100 text-lg font-bold"
                :class="[
                    currentPlayer === 1 ? 'border-green-500': 'border-gray-300'
                ]"
                v-motion
                :initial="{ borderWidth: 4, rotate: 0, scale: 0.9 }"
                :hovered="{ borderWidth: 8, rotate: Math.random() * 20 - 10, scale: 1 }"
            >
                <span
                  v-for="stone in stones" :key="stoke"
                  class="w-2 h-2 rounded-full bg-black"
                >
                </span>
            </div>
            </div>
        </div>

        <!-- Current Player Indicator -->
        <div class="text-center">
          <span
            class="text-md text-gray-500 font-light flex items-center gap-4 justify-center w-full"
          >
            Current Player: 

            <span
              class="flex items-center justify-center w-4 h-4 text-4xl font-bold transition-colors duration-200 rounded"
              :class="[
                    currentPlayer === 1 ? 'bg-green-500 text-white' :
                    currentPlayer === 0 ? 'bg-blue-500 text-white' :
                    'bg-gray-200 hover:bg-gray-300'
                  ]"
            ></span>
            </span>
        </div>

        <!-- Game Over Message -->
        <div v-if="gameOver" class="text-center mt-4">
            <span class="text-xl font-bold text-blue-600">
            {{ winner === 0 
                ? "It's a draw!" 
                : 'Player ' + winner + ' wins with ' + winner === 1 ? board[6] : board[13] + ' stones!'
            }}
            </span>
        </div>
        </div>
    </div>
  `
})