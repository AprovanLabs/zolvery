import { computed, createApp, ref, inject, watch } from 'vue';

/**
 * @typedef {Object} Card
 * @property {string} suit - hearts, diamonds, clubs, spades
 * @property {string} rank - 9, 10, J, Q, K, A
 */

/**
 * @typedef {Object} AppState
 * @property {Card[]} deck - The deck of cards
 * @property {Card[]} widow - The widow hand of cards
 * @property {Player[]} players - Array of player objects
 * @property {Card[]} trickCards - Cards played in the current trick
 * @property {string} trumpSuit - The current trump suit
 * @property {number} trickWinner - ID of the player who won the last trick
 * @property {number} leadPlayer - ID of the player who leads the current trick
 * @property {Card[]} cardsWon - Cards won in previous tricks
 * @property {boolean} bidding - Whether the game is in bidding phase
 * @property {number} highestBid - Highest bid so far
 * @property {number} highestBidder - ID of player with highest bid
 */

/**
 * @typedef {Object} Player
 * @property {string} id - Player ID
 * @property {Card[]} hand - Cards in player's hand
 * @property {number} score - Player's score
 * @property {number} tricks - Tricks won in the current round
 * @property {number} bid - Player's bid for the current round
 */

/**
 * @typedef {Object} Moves
 * @property {function} placeBid - Place a bid
 * @property {function} passBid - Pass on bidding
 * @property {function} selectTrump - Select trump suit
 * @property {function} playCard - Play a card
 * @property {function} exchangeWidow - Exchange hand with widow
 * @property {function} startNewRound - Start a new round
 */

// Constants
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
const INITIAL_SCORE = 10;
const CARDS_PER_HAND = 5;
const PLAYER_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63'];

// Helper functions
const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const getCardValue = (card, trumpSuit) => {
  const rankValues = {
    '9': 9,
    '10': 10,
    'J': trumpSuit === card.suit ? 16 : 11,
    'Q': 12,
    'K': 13,
    'A': 14
  };
  
  if (card.suit === trumpSuit) {
    return rankValues[card.rank] + 100;
  }
  return rankValues[card.rank];
};

const getWinningCardIndex = (cards, leadSuit, trumpSuit) => {
  if (cards.length === 0) return -1;
  
  let winningIdx = 0;
  let winningValue = getCardValue(cards[0], trumpSuit);
  
  // First card determines the lead suit unless a trump is played
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    const cardValue = getCardValue(card, trumpSuit);
    
    const isFollowingSuit = card.suit === leadSuit;
    const isPlayingTrump = card.suit === trumpSuit;
    const currentWinnerIsFollowingSuit = cards[winningIdx].suit === leadSuit;
    const currentWinnerIsPlayingTrump = cards[winningIdx].suit === trumpSuit;
    
    // Trump beats any non-trump
    if (isPlayingTrump && !currentWinnerIsPlayingTrump) {
      winningIdx = i;
      winningValue = cardValue;
    } 
    // Higher card in the same suit wins
    else if ((isPlayingTrump && currentWinnerIsPlayingTrump) || 
             (isFollowingSuit && currentWinnerIsFollowingSuit)) {
      if (cardValue > winningValue) {
        winningIdx = i;
        winningValue = cardValue;
      }
    }
  }
  
  return winningIdx;
};

const cardToString = (card) => {
  return `${card.rank} of ${card.suit}`;
};

export const game = {
  setup: ({ ctx, random }) => {
    const deck = createDeck();
    const shuffledDeck = random.Shuffle(deck);
    const players = Array(ctx.numPlayers).fill().map((_, i) => ({
      id: String(i),
      hand: [],
      score: INITIAL_SCORE,
      tricks: 0,
      bid: 0
    }));
    
    // Deal cards to players
    for (let i = 0; i < CARDS_PER_HAND; i++) {
      for (let j = 0; j < ctx.numPlayers; j++) {
        players[j].hand.push(shuffledDeck.pop());
      }
    }
    
    // Create widow hand
    const widow = shuffledDeck.slice(0, CARDS_PER_HAND);

    console.log(  'game setup', players, widow);
    
    return {
      deck: shuffledDeck.slice(CARDS_PER_HAND),
      widow,
      players,
      trickCards: [],
      trumpSuit: '',
      trickWinner: -1,
      leadPlayer: 0,
      cardsWon: [],
      bidding: true,
      highestBid: 0,
      highestBidder: -1
    };
  },
  
  turn: {
    onBegin: ({ G, ctx, events }) => {
      // Set active player based on game phase
      if (G.bidding) {
        events.setActivePlayers({ all: 'bidding' });
      } else if (G.trumpSuit === '' && G.highestBidder !== -1) {
        // Only highest bidder can select trump
        events.setActivePlayers({ value: { [G.highestBidder]: 'selectingTrump' } });
      } else if (G.trickCards.length === 0) {
        // Lead player starts the trick
        events.setActivePlayers({ value: { [G.leadPlayer]: 'playingCard' } });
      }
      console.log('turn begin', G.bidding, G.trumpSuit, ctx);
    },
    
    stages: {
      bidding: {
        moves: {
          placeBid: ({ G, playerID }, bidAmount) => {
            if (bidAmount <= G.highestBid || bidAmount > CARDS_PER_HAND) {
              return;
            }
            
            G.players[playerID].bid = bidAmount;
            G.highestBid = bidAmount;
            G.highestBidder = parseInt(playerID);
          },
          
          passBid: ({ G, playerID, events }) => {
            G.players[playerID].bid = 0;
            events.endStage();
            
            // Check if all players have bid
            const activePlayers = Object.keys(events.getActivePlayers());
            if (activePlayers.length === 1 || G.highestBidder !== -1 && activePlayers.length === 0) {
              G.bidding = false;
              events.endTurn();
            }
          }
        }
      },
      
      selectingTrump: {
        moves: {
          selectTrump: ({ G, events }, suit) => {
            if (!SUITS.includes(suit)) return;
            
            G.trumpSuit = suit;
            G.leadPlayer = G.highestBidder;
            events.endStage();
            events.endTurn();
          },
          
          exchangeWidow: ({ G, playerID, events }) => {
            // Swap player's hand with the widow
            const tempHand = [...G.players[playerID].hand];
            G.players[playerID].hand = [...G.widow];
            G.widow = tempHand;
          }
        }
      },
      
      playingCard: {
        moves: {
          playCard: ({ G, playerID, events }, cardIndex) => {
            const player = G.players[playerID];
            
            // Validate the card can be played
            if (G.trickCards.length > 0) {
              const leadCard = G.trickCards[0];
              const hasLeadSuit = player.hand.some(card => card.suit === leadCard.suit);
              
              if (hasLeadSuit && player.hand[cardIndex].suit !== leadCard.suit) {
                return; // Must follow suit if possible
              }
            }
            
            // Play the card
            const playedCard = player.hand.splice(cardIndex, 1)[0];
            G.trickCards.push(playedCard);
            
            // Move to next player or end trick
            if (G.trickCards.length < ctx.numPlayers) {
              events.endStage();
              events.endTurn();
            } else {
              // Determine trick winner
              const leadSuit = G.trickCards[0].suit;
              const winnerIdx = getWinningCardIndex(G.trickCards, leadSuit, G.trumpSuit);
              const winnerID = (G.leadPlayer + winnerIdx) % ctx.numPlayers;
              
              G.trickWinner = winnerID;
              G.players[winnerID].tricks += 1;
              G.cardsWon = [...G.cardsWon, ...G.trickCards];
              
              // Set up next trick
              G.leadPlayer = winnerID;
              G.trickCards = [];
              
              events.endStage();
              
              // Check if round is over
              if (G.players.every(player => player.hand.length === 0)) {
                events.setPhase('scoring');
              } else {
                events.endTurn();
              }
            }
          }
        }
      }
    }
  },
  
  phases: {
    play: {
      start: true,
      next: 'scoring'
    },
    
    scoring: {
      moves: {
        startNewRound: ({ G, ctx, random, events }) => {
          // Score the round
          G.players.forEach(player => {
            if (player.id === String(G.highestBidder)) {
              // Highest bidder scoring
              if (player.tricks >= player.bid) {
                player.score -= player.bid;
              } else {
                player.score += player.bid;
              }
            } else {
              // Other players scoring
              if (player.tricks > 0) {
                player.score -= player.tricks;
              } else {
                player.score += 1; // Penalty for not taking any tricks
              }
            }
            
            // Reset for next round
            player.tricks = 0;
            player.bid = 0;
          });
          
          // Set up next round
          const deck = createDeck();
          const shuffledDeck = random.Shuffle(deck);
          
          // Deal cards to players
          for (let i = 0; i < CARDS_PER_HAND; i++) {
            for (let j = 0; j < ctx.numPlayers; j++) {
              G.players[j].hand.push(shuffledDeck.pop());
            }
          }
          
          // Create widow hand
          G.widow = shuffledDeck.slice(0, CARDS_PER_HAND);
          G.deck = shuffledDeck.slice(CARDS_PER_HAND);
          G.trickCards = [];
          G.trumpSuit = '';
          G.trickWinner = -1;
          G.leadPlayer = (G.leadPlayer + 1) % ctx.numPlayers;
          G.cardsWon = [];
          G.bidding = true;
          G.highestBid = 0;
          G.highestBidder = -1;

          console.log('new game', G)
          
          events.setPhase('play');
        }
      },
    }
  },
  
  endIf: ({ G }) => {
    // Game ends when a player reaches 0 or negative score
    const winner = G.players.findIndex(p => p.score <= 0);
    if (winner !== -1) {
      return { winner };
    }
  },
  
  ai: {
    enumerate: ({ G, ctx }) => {
      const moves = [];
      const playerID = ctx.currentPlayer;
      const stage = ctx.activePlayers?.[playerID];
      
      if (stage === 'bidding') {
        // Add pass option
        moves.push({ move: 'passBid' });
        
        // Add bid options
        for (let i = G.highestBid + 1; i <= CARDS_PER_HAND; i++) {
          moves.push({ move: 'placeBid', args: [i] });
        }
      } else if (stage === 'selectingTrump') {
        // Add trump selection options
        SUITS.forEach(suit => {
          moves.push({ move: 'selectTrump', args: [suit] });
        });
        
        // Add widow exchange option
        moves.push({ move: 'exchangeWidow' });
      } else if (stage === 'playingCard') {
        const player = G.players[playerID];
        
        // Generate valid card plays
        let validCards = [...player.hand.keys()];
        
        if (G.trickCards.length > 0) {
          const leadSuit = G.trickCards[0].suit;
          const hasSuit = player.hand.some(card => card.suit === leadSuit);
          
          if (hasSuit) {
            validCards = validCards.filter(i => player.hand[i].suit === leadSuit);
          }
        }
        
        validCards.forEach(cardIndex => {
          moves.push({ move: 'playCard', args: [cardIndex] });
        });
      } else if (ctx.phase === 'scoring') {
        moves.push({ move: 'startNewRound' });
      }
      
      return moves;
    }
  }
};

export const app = createApp({
  setup() {
    const G = inject('G');
    const moves = inject('moves');
    const ctx = inject('ctx');
    // const playerID = inject('playerID');
    const playerID = ref(0);
    
    const phase = computed(() => {
      console.log('phase', ctx.value?.phase);
      return ctx.value.phase;
  });
    const stage = computed(() => {
      console.log('active Players', playerID.value, ctx.value?.activePlayers);
      if (!ctx.value.activePlayers) return '';
      const playerStage = ctx.value.activePlayers[playerID.value];
      console.log('player   stage', playerStage);
      return playerStage;
    });
    
    const players = computed(() => G.value.players);
    const currentPlayer = computed(() => parseInt(ctx.value.currentPlayer));
    const currentPlayerId = computed(() => playerID.value);
    const isMyTurn = computed(() => playerID.value === ctx.value.currentPlayer);
    
    const trumpSuit = computed(() => G.value.trumpSuit);
    const bidding = computed(() => G.value.bidding);
    const highestBid = computed(() => G.value.highestBid);
    const highestBidder = computed(() => G.value.highestBidder);
    
    const myPlayer = computed(() => players.value[playerID.value]);
    const myHand = computed(() => myPlayer.value?.hand || []);
    const myScore = computed(() => myPlayer.value?.score || 0);
    const myTricks = computed(() => myPlayer.value?.tricks || 0);
    const myBid = computed(() => myPlayer.value?.bid || 0);
    
    const trickCards = computed(() => G.value.trickCards);
    const leadPlayer = computed(() => G.value.leadPlayer);
    const widow = computed(() => G.value.widow);
    const showWidow = computed(() => 
      stage.value === 'selectingTrump' && 
      playerID.value === String(highestBidder.value)
    );
    
    const canPlayCard = computed(() => stage.value === 'playingCard');
    const canBid = computed(() => {
      console.log('stage', stage.value === 'bidding', stage.value);
      return stage.value === 'bidding'
  });
    const canSelectTrump = computed(() => 
      stage.value === 'selectingTrump' && 
      playerID.value === String(highestBidder.value)
    );
    const canStartNewRound = computed(() => phase.value === 'scoring');
    
    const currentBid = ref(1);
    
    // Card play validation
    const canPlayThisCard = (cardIndex) => {
      if (!canPlayCard.value) return false;
      
      if (trickCards.value.length === 0) return true;
      
      const leadSuit = trickCards.value[0].suit;
      const hasLeadSuit = myHand.value.some(card => card.suit === leadSuit);
      
      if (hasLeadSuit && myHand.value[cardIndex].suit !== leadSuit) {
        return false; // Must follow suit if possible
      }
      
      return true;
    };

    console.log('currentPlayer', currentPlayer.value);
    watch(playerID, (newPlayerID) => {
      console.log('playerID', playerID.value);
    });
    
    const getPlayerColor = (playerId) => {
      return PLAYER_COLORS[parseInt(playerId) % PLAYER_COLORS.length];
    };
    
    const getSuitIcon = (suit) => {
      switch (suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
        default: return '';
      }
    };
    
    const getSuitColor = (suit) => {
      switch (suit) {
        case 'hearts': return 'text-red-500';
        case 'diamonds': return 'text-red-500';
        case 'clubs': return 'text-gray-800';
        case 'spades': return 'text-gray-800';
        default: return '';
      }
    };
    
    // Watch for bidding changes
    watch(highestBid, (newBid) => {
      if (newBid >= currentBid.value) {
        currentBid.value = newBid + 1;
      }
    });
    
    return {
      G,
      moves,
      ctx,
      playerID,
      phase,
      stage,
      players,
      currentPlayer,
      currentPlayerId,
      isMyTurn,
      trumpSuit,
      bidding,
      highestBid,
      highestBidder,
      myPlayer,
      myHand,
      myScore,
      myTricks,
      myBid,
      trickCards,
      leadPlayer,
      widow,
      showWidow,
      canPlayCard,
      canBid,
      canSelectTrump,
      canStartNewRound,
      currentBid,
      canPlayThisCard,
      getPlayerColor,
      getSuitIcon,
      getSuitColor
    };
  },
  template: `
  <div class="flex flex-col items-center w-full h-full pt-4">
    <!-- Game Header -->
    <div class="w-full p-4 mb-4 text-center">
      <h1 class="text-2xl font-bold">Buck Euchre</h1>
      <div 
        v-if="trumpSuit" 
        class="flex items-center justify-center mt-2"
        v-motion
        :initial="{ scale: 0, opacity: 0 }"
        :enter="{ scale: 1, opacity: 1 }"
      >
        <span class="mr-2">Trump Suit:</span>
        <span :class="[getSuitColor(trumpSuit), 'text-xl font-bold']">{{ getSuitIcon(trumpSuit) }}</span>
      </div>
    </div>
    
    <!-- Current Player Indicator -->
    <div 
      v-if="currentPlayer !== -1"
      class="flex items-center justify-center w-full mb-4"
      v-motion
      :initial="{ x: -20, opacity: 0 }"
      :enter="{ x: 0, opacity: 1 }"
    >
      <div 
        class="px-4 py-2 text-white rounded-full"
        :style="{ backgroundColor: getPlayerColor(currentPlayer) }"
      >
        <span v-if="currentPlayerId === String(currentPlayer)">Your Turn</span>
        <span v-else>Player {{ currentPlayer }}'s Turn</span>
      </div>
    </div>
    
    <!-- Players Scoreboard -->
    <div class="grid w-full grid-cols-4 mb-6 max-w-xl">
      <div 
        v-for="(player, index) in players" 
        :key="index"
        class="flex flex-col items-center p-2 mx-1 border rounded-lg"
        :class="{ 'border-2': currentPlayerId === player.id }"
        :style="{ borderColor: getPlayerColor(index) }"
        v-motion
        :initial="{ y: 20, opacity: 0 }"
        :enter="{ y: 0, opacity: 1, transition: { delay: index * 100 } }"
      >
        <div class="font-bold" :style="{ color: getPlayerColor(index) }">
          <span v-if="currentPlayerId === player.id">You</span>
          <span v-else>P{{ index }}</span>
        </div>
        <div>Score: {{ player.score }}</div>
        <div>Tricks: {{ player.tricks }}</div>
        <div v-if="player.bid > 0">Bid: {{ player.bid }}</div>
        <div v-else-if="stage === 'bidding' && player.id !== currentPlayerId">Bidding...</div>
      </div>
    </div>
    
    <!-- Trick Cards Area -->
    <div 
      class="flex items-center justify-center w-full mb-8 min-h-32"
      v-motion
      :initial="{ scale: 0.8, opacity: 0 }"
      :enter="{ scale: 1, opacity: 1 }"
    >
      <div 
        v-if="trickCards.length > 0" 
        class="flex items-center justify-center gap-4"
      >
        <div 
          v-for="(card, index) in trickCards" 
          :key="index"
          class="flex flex-col items-center"
          v-motion
          :initial="{ scale: 0, rotateZ: -15, opacity: 0 }"
          :enter="{ scale: 1, rotateZ: 0, opacity: 1, transition: { delay: index * 150 } }"
        >
          <div 
            class="relative flex items-center justify-center w-24 h-32 bg-white border rounded-lg shadow-md"
            :style="{ borderColor: getPlayerColor((leadPlayer + index) % players.length) }"
          >
            <div :class="[getSuitColor(card.suit), 'text-xl absolute top-1 left-2']">{{ card.rank }}</div>
            <div :class="[getSuitColor(card.suit), 'text-3xl']">{{ getSuitIcon(card.suit) }}</div>
            <div :class="[getSuitColor(card.suit), 'text-xl absolute bottom-1 right-2']">{{ card.rank }}</div>
          </div>
          <div 
            class="mt-1 px-2 rounded-full text-xs text-white"
            :style="{ backgroundColor: getPlayerColor((leadPlayer + index) % players.length) }"
          >
            <span v-if="currentPlayerId === String((leadPlayer + index) % players.length)">You</span>
            <span v-else>P{{ (leadPlayer + index) % players.length }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="phase === 'play' && !bidding" class="italic text-gray-500">
        Waiting for {{ currentPlayerId === String(leadPlayer) ? 'you' : 'Player ' + leadPlayer }} to lead...
      </div>
    </div>
    
    <!-- Widow Display -->
    <div 
      v-if="showWidow" 
      class="flex flex-col items-center mb-6"
      v-motion
      :initial="{ y: 30, opacity: 0 }"
      :enter="{ y: 0, opacity: 1 }"
    >
      <h3 class="mb-2 text-lg font-semibold">Widow Cards</h3>
      <div class="flex gap-2">
        <div 
          v-for="(card, index) in widow" 
          :key="index"
          class="relative flex items-center justify-center w-16 h-24 bg-white border rounded-lg shadow-sm"
          v-motion
          :initial="{ scale: 0.8, opacity: 0 }"
          :enter="{ scale: 1, opacity: 1, transition: { delay: index * 100 } }"
        >
          <div :class="[getSuitColor(card.suit), 'text-sm absolute top-1 left-2']">{{ card.rank }}</div>
          <div :class="[getSuitColor(card.suit), 'text-2xl']">{{ getSuitIcon(card.suit) }}</div>
          <div :class="[getSuitColor(card.suit), 'text-sm absolute bottom-1 right-2']">{{ card.rank }}</div>
        </div>
      </div>
      <button 
        @click="moves.exchangeWidow()"
        class="px-4 py-2 mt-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        v-motion
        :initial="{ scale: 0.9, opacity: 0 }"
        :enter="{ scale: 1, opacity: 1, transition: { delay: 500 } }"
      >
        Exchange with Widow
      </button>
    </div>
    
    <!-- Player Hand -->
    <div class="flex flex-col items-center w-full mt-auto">
      <h3 class="mb-2 text-lg font-semibold">Your Hand</h3>
      <div class="flex justify-center gap-2 mb-6">
        <div 
          v-for="(card, index) in myHand" 
          :key="index"
          class="relative flex items-center justify-center w-24 h-32 bg-white border rounded-lg shadow-md cursor-pointer transform transition-transform"
          :class="{ 'opacity-50': canPlayCard && !canPlayThisCard(index), 'hover:scale-110': canPlayThisCard(index) }"
          @click="canPlayThisCard(index) && moves.playCard(index)"
          v-motion
          :initial="{ y: 50, opacity: 0 }"
          :enter="{ y: 0, opacity: 1, transition: { delay: index * 100 } }"
        >
          <div :class="[getSuitColor(card.suit), 'text-xl absolute top-1 left-2']">{{ card.rank }}</div>
          <div :class="[getSuitColor(card.suit), 'text-4xl']">{{ getSuitIcon(card.suit) }}</div>
          <div :class="[getSuitColor(card.suit), 'text-xl absolute bottom-1 right-2']">{{ card.rank }}</div>
        </div>
      </div>
      
      <!-- Game Controls -->
      <div class="flex flex-col items-center w-full gap-4 p-4 mb-4">
        <!-- Bidding Controls -->
        <div 
          v-if="canBid" 
          class="flex flex-col items-center w-full max-w-md gap-2"
          v-motion
          :initial="{ scale: 0.9, opacity: 0 }"
          :enter="{ scale: 1, opacity: 1 }"
        >
          <div class="flex items-center justify-center w-full gap-4">
            <input 
              type="range" 
              v-model="currentBid" 
              :min="highestBid + 1" 
              :max="5" 
              class="w-full"
            />
            <span class="text-lg font-bold">{{ currentBid }}</span>
          </div>
          <div class="flex gap-4">
            <button 
              @click="moves.placeBid(currentBid)"
              class="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Place Bid
            </button>
            <button 
              @click="moves.passBid()"
              class="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Pass
            </button>
          </div>
        </div>
        
        <!-- Trump Selection -->
        <div 
          v-if="canSelectTrump" 
          class="flex flex-col items-center w-full max-w-md gap-2"
          v-motion
          :initial="{ scale: 0.9, opacity: 0 }"
          :enter="{ scale: 1, opacity: 1 }"
        >
          <h3 class="text-lg font-semibold">Select Trump Suit</h3>
          <div class="flex justify-center gap-4">
            <button 
              v-for="suit in ['hearts', 'diamonds', 'clubs', 'spades']" 
              :key="suit"
              @click="moves.selectTrump(suit)"
              class="px-4 py-2 text-2xl bg-white border-2 rounded-md shadow-sm hover:shadow-md"
              :class="[getSuitColor(suit), 'hover:bg-gray-100']"
            >
              {{ getSuitIcon(suit) }}
            </button>
          </div>
        </div>
        
        <!-- New Round Button -->
        <button 
          v-if="canStartNewRound"
          @click="moves.startNewRound()"
          class="px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
          v-motion
          :initial="{ scale: 0.9, opacity: 0 }"
          :enter="{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100 } }"
        >
          Start New Round
        </button>
      </div>
    </div>
  </div>
  `
});