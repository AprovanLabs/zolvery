import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, RotateCcw, Circle, HelpCircle } from "lucide-react";

type Player = 1 | 2;

interface GameState {
  pits: number[];
  homes: [number, number];
  currentPlayer: Player;
  gameOver: boolean;
}

const initialState: GameState = {
  pits: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  homes: [0, 0],
  currentPlayer: 1,
  gameOver: false,
};

export default function MancalaGame() {
  const [game, setGame] = useState<GameState>(initialState);
  const [showRules, setShowRules] = useState(false);

  const player1Color = "bg-blue-500";
  const player2Color = "bg-amber-500";
  const player1ColorLight = "bg-blue-100 border-blue-300";
  const player2ColorLight = "bg-amber-100 border-amber-300";
  const player1HomeColor = "bg-blue-200 border-blue-400";
  const player2HomeColor = "bg-amber-200 border-amber-400";

  const getCurrentPlayerColor = () => game.currentPlayer === 1 ? player1Color : player2Color;
  const getCurrentPlayerName = () => `Player ${game.currentPlayer}`;

  const getPitOwner = (index: number): Player => index < 6 ? 1 : 2;

  const makeMove = (pitIndex: number) => {
    if (game.gameOver) return;
    
    const pitOwner = getPitOwner(pitIndex);
    if (pitOwner !== game.currentPlayer) return;
    if (game.pits[pitIndex] === 0) return;

    const newPits = [...game.pits];
    const newHomes: [number, number] = [...game.homes];
    let stones = newPits[pitIndex];
    newPits[pitIndex] = 0;
    
    let currentIndex = pitIndex;
    let lastInHome = false;

    while (stones > 0) {
      currentIndex++;
      
      if (game.currentPlayer === 1 && currentIndex === 6) {
        newHomes[0]++;
        stones--;
        lastInHome = stones === 0;
        if (stones === 0) break;
        currentIndex++;
      }
      
      if (game.currentPlayer === 2 && currentIndex === 12) {
        newHomes[1]++;
        stones--;
        lastInHome = stones === 0;
        if (stones === 0) break;
      }

      if (currentIndex >= 12) {
        currentIndex = -1;
        continue;
      }

      newPits[currentIndex]++;
      stones--;

      if (stones === 0 && newPits[currentIndex] === 1) {
        const landedOwner = getPitOwner(currentIndex);
        if (landedOwner === game.currentPlayer) {
          const oppositeIndex = 11 - currentIndex;
          if (newPits[oppositeIndex] > 0) {
            const captured = newPits[oppositeIndex] + 1;
            newPits[oppositeIndex] = 0;
            newPits[currentIndex] = 0;
            newHomes[game.currentPlayer - 1] += captured;
          }
        }
      }
    }

    const player1Empty = newPits.slice(0, 6).every(p => p === 0);
    const player2Empty = newPits.slice(6, 12).every(p => p === 0);
    const gameOver = player1Empty || player2Empty;

    if (gameOver) {
      newHomes[0] += newPits.slice(0, 6).reduce((a, b) => a + b, 0);
      newHomes[1] += newPits.slice(6, 12).reduce((a, b) => a + b, 0);
      for (let i = 0; i < 12; i++) newPits[i] = 0;
    }

    const nextPlayer: Player = lastInHome && !gameOver ? game.currentPlayer : (game.currentPlayer === 1 ? 2 : 1);

    setGame({
      pits: newPits,
      homes: newHomes,
      currentPlayer: nextPlayer,
      gameOver,
    });
  };

  const resetGame = () => setGame(initialState);

  const renderStones = (count: number, isHome: boolean = false) => {
    const stones = [];
    for (let i = 0; i < count; i++) {
      stones.push(
        <div
          key={i}
          className={`${isHome ? 'w-3 h-3' : 'w-2.5 h-2.5'} rounded-full bg-stone-600 shadow-sm
            transition-all duration-300 ease-out`}
          style={{ 
            animationDelay: `${i * 20}ms`,
          }}
        />
      );
    }
    return stones;
  };

  const Pit = ({ index, stones, owner }: { index: number; stones: number; owner: Player }) => {
    const isClickable = owner === game.currentPlayer && stones > 0 && !game.gameOver;
    
    return (
      <button
        onClick={() => makeMove(index)}
        disabled={!isClickable}
        className={`w-14 h-20 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center
          ${isClickable ? 'hover:scale-110 hover:border-gray-400 hover:shadow-lg cursor-pointer' : 'cursor-default opacity-75'}
          transition-all duration-300 ease-out`}
      >
        <div className="flex flex-wrap gap-0.5 justify-center items-center p-1.5 max-w-[90%]">
          {renderStones(stones)}
        </div>
      </button>
    );
  };

  const Home = ({ player, stones }: { player: Player; stones: number }) => {
    const borderColor = player === 1 ? "border-blue-300" : "border-amber-300";
    const label = player === 1 ? "P1" : "P2";
    
    return (
      <div className={`w-20 h-44 rounded-2xl bg-gray-50 ${borderColor} border-2 flex flex-col items-center justify-center p-2 relative
        transition-all duration-300 hover:shadow-md`}>
        <Badge variant="outline" className="absolute -top-2 text-xs bg-white">
          {label}
        </Badge>
        <div className="flex-1 flex flex-wrap gap-1 justify-center items-center content-center p-1 overflow-hidden">
          {renderStones(stones, true)}
        </div>
        <span className="text-lg font-bold text-gray-600 mt-1">{stones}</span>
      </div>
    );
  };

  const getWinner = () => {
    if (!game.gameOver) return null;
    if (game.homes[0] > game.homes[1]) return "Player 1";
    if (game.homes[1] > game.homes[0]) return "Player 2";
    return "Tie";
  };

  return (
    <div className="p-6 max-w-3xl">
      <Card className="overflow-hidden">
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-800">Mancala</h1>
              {!game.gameOver && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className={`w-3 h-3 rounded-full ${getCurrentPlayerColor()} transition-colors duration-300 animate-pulse`} />
                  <span>{getCurrentPlayerName()}</span>
                </div>
              )}
            </div>
            {game.gameOver && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {getWinner() === "Tie" ? "It's a Tie!" : `${getWinner()} Wins!`}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={resetGame} className="text-gray-500 hover:text-gray-700">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Game Board */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Player 2's Home (left side) */}
            <Home player={2} stones={game.homes[1]} />

            {/* Pits */}
            <div className="flex flex-col gap-8">
              {/* Player 2's pits (top row, right to left) */}
              <div className="flex gap-3">
                {[11, 10, 9, 8, 7, 6].map((i) => (
                  <Pit key={i} index={i} stones={game.pits[i]} owner={2} />
                ))}
              </div>

              {/* Player 1's pits (bottom row, left to right) */}
              <div className="flex gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Pit key={i} index={i} stones={game.pits[i]} owner={1} />
                ))}
              </div>
            </div>

            {/* Player 1's Home (right side) */}
            <Home player={1} stones={game.homes[0]} />
          </div>

          {/* How to Play - Collapsible */}
          <Collapsible open={showRules} onOpenChange={setShowRules}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800">
                <HelpCircle className="w-4 h-4" />
                How to Play
                {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <span>Click a pit on your side to pick up stones and distribute them counter-clockwise</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <span>Drop one stone in each pit, including your home, but skip opponent's home</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">3</Badge>
                    <span>Land in your home to get another turn</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">4</Badge>
                    <span>Land in an empty pit on your side to capture opposite stones</span>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">
                  Game ends when one side is empty. Most stones in home wins!
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
