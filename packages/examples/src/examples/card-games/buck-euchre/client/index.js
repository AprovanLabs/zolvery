import { ref, createApp, inject } from 'vue';

export const app = createApp({
  setup() {
    const { on } = inject('kossabos');

    // Euchre deck (24 cards: 9, 10, J, Q, K, A of each suit)
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['9', '10', 'J', 'Q', 'K', 'A'];

    // Card ranking for Euchre
    const cardRanks = {
      9: 1,
      10: 2,
      Q: 3,
      K: 4,
      A: 5,
      J: {
        same: 6, // Jack of trump suit
        opposite: 7, // Jack of opposite color of trump
      },
    };

    const createDeck = () => {
      return suits.flatMap((suit) =>
        values.map((value) => ({
          suit,
          value,
          isTrump: false,
        })),
      );
    };

    // Game state
    const deck = ref(createDeck());
    const playerHands = ref([[], [], [], []]);
    const playedCards = ref([]);
    const trumpSuit = ref(null);
    const currentPlayer = ref(0);
    const gameStage = ref('dealing');
    const roundWinners = ref([null, null, null, null]);
    const teamScores = ref([0, 0]);
    const gameOver = ref(false);
    const trickWinner = ref(null);

    // Shuffle and deal cards
    const shuffleDeck = () => {
      for (let i = deck.value.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck.value[i], deck.value[j]] = [deck.value[j], deck.value[i]];
      }
    };

    const dealCards = () => {
      shuffleDeck();
      playerHands.value = [[], [], [], []];

      // Deal 5 cards to each player
      for (let round = 0; round < 5; round++) {
        for (let player = 0; player < 4; player++) {
          playerHands.value[player].push(deck.value.pop());
        }
      }

      // Reveal trump card
      trumpSuit.value = deck.value.pop();
      gameStage.value = 'bidding';
      currentPlayer.value = 0;
    };

    // AI decision making
    const aiChooseTrump = (playerIndex) => {
      const hand = playerHands.value[playerIndex];
      const potentialTrumps = suits.map((suit) => ({
        suit,
        strength: hand.filter((card) => card.suit === suit).length,
      }));

      return potentialTrumps.reduce((max, curr) =>
        curr.strength > max.strength ? curr : max,
      ).suit;
    };

    const aiPlayCard = (playerIndex) => {
      const hand = playerHands.value[playerIndex];

      // If first to play, choose randomly
      if (playedCards.value.length === 0) {
        const randomIndex = Math.floor(Math.random() * hand.length);
        return hand[randomIndex];
      }

      // Try to follow suit of first card
      const leadSuit = playedCards.value[0].suit;
      const suitFollowers = hand.filter((card) => card.suit === leadSuit);

      if (suitFollowers.length > 0) {
        return suitFollowers[Math.floor(Math.random() * suitFollowers.length)];
      }

      // If can't follow suit, play randomly
      return hand[Math.floor(Math.random() * hand.length)];
    };

    // Determine trick winner
    const determineTrickWinner = () => {
      if (playedCards.value.length < 4) return null;

      const leadSuit = playedCards.value[0].suit;
      const trumpSuitValue = trumpSuit.value.suit;

      const rankedCards = playedCards.value.map((card, index) => ({
        card,
        player: index,
        isTrump: card.suit === trumpSuitValue,
        isLead: card.suit === leadSuit,
      }));

      // Prioritize trump cards
      const trumpCards = rankedCards.filter((c) => c.isTrump);
      if (trumpCards.length > 0) {
        return trumpCards.reduce((max, curr) =>
          cardRanks[curr.card.value] > cardRanks[max.card.value] ? curr : max,
        ).player;
      }

      // If no trump, highest card of lead suit wins
      const leadCards = rankedCards.filter((c) => c.isLead);
      return leadCards.reduce((max, curr) =>
        cardRanks[curr.card.value] > cardRanks[max.card.value] ? curr : max,
      ).player;
    };

    const aiCountdown = ref(0);

    // Modified AI turn simulation with central countdown
    const simulateAITurn = (playerIndex) => {
      return new Promise((resolve) => {
        // Set initial countdown
        aiCountdown.value = 1;

        // Countdown interval
        const countdownInterval = setInterval(() => {
          aiCountdown.value -= 0.02;

          // Stop interval when countdown reaches 0
          if (aiCountdown.value <= 0) {
            clearInterval(countdownInterval);
            aiCountdown.value = 0;
          }
        }, 25);

        // AI turn logic
        setTimeout(() => {
          clearInterval(countdownInterval);
          aiCountdown.value = 0;

          const hand = playerHands.value[playerIndex];
          const cardToPlay = aiPlayCard(playerIndex);
          const cardIndex = hand.findIndex(
            (c) => c.suit === cardToPlay.suit && c.value === cardToPlay.value,
          );

          playCard(cardIndex, playerIndex);
          resolve();
        }, 1250);
      });
    };

    // Play a card
    const playCard = async (cardIndex, playerOverride = null) => {
      const player =
        playerOverride !== null ? playerOverride : currentPlayer.value;
      const card = playerHands.value[player].splice(cardIndex, 1)[0];

      playedCards.value.push({ ...card, player });

      // If all 4 cards played, determine trick winner
      if (playedCards.value.length === 4) {
        trickWinner.value = determineTrickWinner();

        // Reset for next round
        setTimeout(() => {
          playedCards.value = [];
          currentPlayer.value = trickWinner.value;
        }, 2000);
      } else {
        // Move to next player
        currentPlayer.value = (currentPlayer.value + 1) % 4;
      }

      // If AI players, simulate their turns
      if (currentPlayer.value !== 0 && playedCards.value.length < 4) {
        await simulateAITurn(currentPlayer.value);
      }
    };

    // Reset game
    const resetGame = () => {
      deck.value = createDeck();
      playerHands.value = [[], [], [], []];
      playedCards.value = [];
      trumpSuit.value = null;
      currentPlayer.value = 0;
      gameStage.value = 'dealing';
      roundWinners.value = [null, null, null, null];
      teamScores.value = [0, 0];
      gameOver.value = false;
      trickWinner.value = null;
      dealCards();
    };

    on('reset', () => resetGame());

    // Initial deal
    dealCards();

    return {
      playerHands,
      trumpSuit,
      currentPlayer,
      gameStage,
      teamScores,
      gameOver,
      playCard,
      resetGame,
      playedCards,
      trickWinner,
      aiCountdown,
    };
  },
  template: `
    <div class="flex pt-8 justify-center relative">
      <div class="w-full max-w-3xl p-2">
        <!-- Player Hands -->
        <div class="flex flex-col space-y-4">
          <!-- Top Player (Player 2) -->
          <div class="flex justify-center items-center">
            <div
              v-for="(card, index) in playerHands[1]"
              :key="index"
              class="w-16 h-24 mx-1 bg-yellow-500 text-white rounded-lg flex items-center justify-center relative"
              :class="[
                        currentPlayer === 1 ? 'border-4 border-yellow-700' : 'opacity-70'
                    ]"
              v-motion
              :initial="{ rotate: 0, scale: 0.9 }"
              :hovered="{ rotate: Math.random() * 20 - 10, scale: 1 }"
            >
              <div
                v-if="aiCountdown > 0"
                class="absolute bottom-0 left-0 w-full h-1 bg-yellow-700"
                :style="{ width: (aiCountdown / 3) * 100 }"
              ></div>
            </div>
          </div>

          <!-- Middle Area (Trump Indicator and Game Stage) -->
          <div class="flex justify-between items-center">
            <!-- Left Side Player (Player 3) -->
            <div class="flex">
              <div
                v-for="(card, index) in playerHands[2]"
                :key="index"
                class="w-16 h-24 my-1 bg-red-500 text-white rounded-lg flex items-center justify-center relative mb-[-80%] -mr-[32px]"
                :class="[
                        currentPlayer === 2 ? 'border-4 border-red-700' : 'opacity-70'
                        ]"
                v-motion
              >
                <div
                  v-if="aiCountdown > 0"
                  class="absolute bottom-0 left-0 w-full h-1 bg-red-700"
                  :style="{ width: aiCountdown / 3 * 100 }"
                ></div>
              </div>
            </div>

            <!-- Central Game Information -->
            <div class="text-center">
              <div v-if="gameStage === 'dealing'" class="text-xl">
                Dealing Cards...
              </div>
              <div v-if="gameStage === 'bidding'" class="text-xl">
                Bidding Stage
              </div>
              <div v-if="trumpSuit" class="mt-2">
                Trump Suit: {{ trumpSuit.suit }}
              </div>
              <div class="mt-2">
                Team Scores:
                <span class="text-green-600">{{ teamScores[0] }}</span> -
                <span class="text-blue-600">{{ teamScores[1] }}</span>
              </div>

              <!-- Played Cards Section with Enhanced Animations -->
              <div class="flex justify-center mt-4">
                <div
                  v-for="(card, index) in playedCards"
                  :key="index"
                  class="w-16 h-24 mx-1 text-white rounded-lg flex flex-col items-center justify-center"
                  :class="[
                    card.player === 0 ? 'bg-green-500' :
                    card.player === 1 ? 'bg-yellow-500' :
                    card.player === 2 ? 'bg-red-500' : 
                    'bg-blue-500'
                  ]"
                  v-motion
                  :initial="{ 
                    scale: 0.5, 
                    rotate: Math.random() * 40 - 20, 
                    opacity: 0 
                  }"
                  :enter="{ 
                    scale: 1, 
                    rotate: 0, 
                    opacity: 1,
                    transition: { 
                      type: 'spring', 
                      stiffness: 300, 
                      damping: 15 
                    }
                  }"
                >
                  <span>{{ card.value }}</span>
                  <span>{{ card.suit }}</span>
                </div>
              </div>
            </div>

            <!-- Right Side Player (Player 1) -->
            <div class="flex flex-col">
              <div
                v-for="(card, index) in playerHands[3]"
                :key="index"
                class="w-16 h-24 my-1 bg-blue-500 text-white rounded-lg flex items-center justify-center relative mb-[-80%]"
                :class="[
                        currentPlayer === 3 ? 'border-4 border-blue-700' : 'opacity-70'
                        ]"
                v-motion
                :initial="{ rotate: Math.random() * 20 - 10 }"
              >
                <div
                  v-if="aiCountdown > 0"
                  class="absolute bottom-0 left-0 w-full h-1 bg-blue-700"
                  :style="{ width: aiCountdown / 3 * 100 }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Bottom Player (Player 0 - Human) -->
          <div class="flex justify-center">
            <div
              v-for="(card, index) in playerHands[0]"
              :key="index"
              @click="playCard(index)"
              class="w-24 h-36 mx-2 bg-white text-black rounded-lg flex flex-col items-center justify-center cursor-pointer"
              :class="[
                  currentPlayer === 0 ? 'border-4 border-green-500' : 'opacity-70'
                ]"
              v-motion
              :initial="{ borderWidth: 4, rotate: 0, scale: 0.9 }"
              :hovered="{ borderWidth: 8, rotate: Math.random() * 20 - 10, scale: 1 }"
            >
              <span class="text-xl">{{ card.value }}</span>
              <span class="text-2xl">{{ card.suit }}</span>
            </div>
          </div>
        </div>

        <!-- Game Stage Indicator -->
        <div class="text-center mt-4 flex items-center flex-col gap-4">
          <span
            class="text-md text-gray-500 font-light flex items-center gap-4 justify-center w-full"
          >
            Current Player:
            <span
              class="flex items-center justify-center w-4 h-4 text-4xl font-bold transition-colors duration-200 rounded"
              :class="[
                        currentPlayer === 0 ? 'bg-green-500 text-white' :
                        currentPlayer === 1 ? 'bg-yellow-500 text-white' :
                        currentPlayer === 2 ? 'bg-red-500 text-white' :
                        currentPlayer === 3 ? 'bg-blue-500 text-white' :
                        'bg-gray-300 hover:bg-gray-400'
                    ]"
            ></span>
          </span>

          <!-- Countdown Overlay -->
          <div
            v-if="aiCountdown > 0"
            v-motion
            :initial="{ scale: 0.5, opacity: 0 }"
            :enter="{ 
          scale: 1, 
          opacity: 1, 
          transition: { 
            type: 'spring', 
            stiffness: 250, 
            damping: 10 
          }
        }"
            :leave="{ 
          scale: 0.5, 
          opacity: 0,
          transition: { 
            type: 'spring', 
            stiffness: 250, 
            damping: 10 
          }
        }"
          >
            <div class="text-xs h-2 w-12 font-bold bg-white opacity-70">
              <div
                class="h-2 bg-gray-700 w-0"
                :style="{ width: aiCountdown * 100 + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
});
