import { computed, createApp, toRef, ref, getCurrentInstance, provide, reactive,isRef, inject, watchEffect, isReactive } from 'vue';

const calculateScore = (hand) => {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card === 1) {
      aces++;
      score += 11;
    } else {
      score += Math.min(10, card);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
};

const dealerShouldHit = (score) => score < 17;

export const game = {
  setup: () => ({
    deck: Array.from({ length: 52 }, (_, i) => (i % 13) + 1),
    playerHand: [],
    dealerHand: [],
    playerScore: 0,
    dealerScore: 0,
    gameOver: false,
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    deal: ({ G, random }) => {
      G.deck = random.Shuffle(G.deck);
      G.playerHand = [G.deck.pop(), G.deck.pop()];
      G.dealerHand = [G.deck.pop(), G.deck.pop()];
      G.playerScore = calculateScore(G.playerHand);
      G.dealerScore = calculateScore(G.dealerHand);

      if (G.playerScore === 21) {
        G.gameOver = true;
      }
    },

    hit: ({ G }) => {
      G.playerHand.push(G.deck.pop());
      G.playerScore = calculateScore(G.playerHand);

      if (G.playerScore > 21) {
        G.gameOver = true;
      }
    },

    stand: ({ G }) => {
      while (dealerShouldHit(G.dealerScore)) {
        G.dealerHand.push(G.deck.pop());
        G.dealerScore = calculateScore(G.dealerHand);
      }
      G.gameOver = true;
    },
  },

  ai: {
    enumerate: ({ G }) => {
      if (G.gameOver) return [];

      const moves = [];
      if (G.playerHand.length === 0) {
        moves.push({ move: 'deal' });
      } else {
        moves.push({ move: 'hit' });
        moves.push({ move: 'stand' });
      }
      return moves;
    },
  },

  endIf: ({ G }) => {
    if (!G.gameOver) return false;

    if (G.playerScore > 21) return { winner: 'dealer' };
    if (G.dealerScore > 21) return { winner: 'player' };
    if (G.playerScore > G.dealerScore) return { winner: 'player' };
    if (G.dealerScore > G.playerScore) return { winner: 'dealer' };
    return { winner: 'draw' };
  },
};

export const app = createApp({
  setup() {
    console.log('app setup');

    const G = inject('G');
    const moves = inject('moves');

    const playerHand = computed(() => G.value.playerHand);
    const dealerHand = computed(() => G.value.dealerHand);
    const playerScore = computed(() => G.value.playerScore);
    const dealerScore = computed(() => G.value.dealerScore);
    const gameOver = computed(() => G.value.gameOver);

    const getCardDisplay = (card) => {
      const suits = ['♠', '♥', '♦', '♣'];
      const values = [
        'A',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        'J',
        'Q',
        'K',
      ];
      return `${values[card % 13]}${suits[Math.floor(card / 13)]}`;
    };

    return {
      playerHand,
      dealerHand,
      playerScore,
      dealerScore,
      gameOver,
      moves,
      getCardDisplay, 
    };
  },
  template: `
    <div class="min-h-screen bg-green-800 flex items-center justify-center">
    dealerScore: {{ dealerScore }}
      <div class="w-full max-w-2xl p-8 space-y-8">
        <!-- Dealer's Hand -->
        <div class="space-y-2">
          <h2 class="text-white text-xl">Dealer's Hand ({{ dealerScore }})</h2>
          <div class="flex gap-2">
            <div
              v-for="(card, index) in dealerHand"
              :key="index"
              v-motion
              :initial="{ x: -100, opacity: 0 }"
              :enter="{ x: 0, opacity: 1, transition: { delay: index * 100 } }"
              class="bg-white rounded-lg w-24 h-36 flex items-center justify-center text-2xl font-bold"
              :class="{'text-red-600': Math.floor(card / 13) === 1 || Math.floor(card / 13) === 2}"
            >
              {{ getCardDisplay(card) }}
            </div>
          </div>
        </div>

        <!-- Player's Hand -->
        <div class="space-y-2">
          <h2 class="text-white text-xl">Your Hand ({{ playerScore }})</h2>
          <div class="flex gap-2">
            <div
              v-for="(card, index) in playerHand"
              :key="index"
              v-motion
              :initial="{ y: 100, opacity: 0 }"
              :enter="{ y: 0, opacity: 1, transition: { delay: index * 100 } }"
              class="bg-white rounded-lg w-24 h-36 flex items-center justify-center text-2xl font-bold"
              :class="{'text-red-600': Math.floor(card / 13) === 1 || Math.floor(card / 13) === 2}"
            >
              {{ getCardDisplay(card) }}
            </div>
          </div>
        </div>

        <!-- Game Controls -->
        <div class="flex gap-4 justify-center">
          <button
            @click="moves.deal"
            v-motion
            :initial="{ scale: 0.8, opacity: 0 }"
            :enter="{ scale: 1, opacity: 1 }"
            class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Deal
          </button>
          <button
            @click="moves.hit"
            v-motion
            :initial="{ scale: 0.8, opacity: 0 }"
            :enter="{ scale: 1, opacity: 1 }"
            class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            :disabled="gameOver"
          >
            Hit
          </button>
          <button
            @click="moves.stand"
            v-motion
            :initial="{ scale: 0.8, opacity: 0 }"
            :enter="{ scale: 1, opacity: 1 }"
            class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            :disabled="gameOver"
          >
            Stand
          </button>
        </div>

        <!-- Current Player Indicator -->
        <div class="text-center">
          <span class="text-md text-white font-light flex items-center gap-4 justify-center">
            Current Turn
            <span
              class="w-4 h-4 rounded-full"
              :class="[gameOver ? 'bg-gray-400' : 'bg-blue-500']"
            ></span>
          </span>
        </div>
      </div>
    </div>
  `,
});
