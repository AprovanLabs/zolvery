import { combineLatest, interval, map } from 'rxjs';

import { create } from '../../../core';

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const CELL_IDS = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];
const INITIAL_CELL_STATES = Object.fromEntries(
  CELL_IDS.map((cellId) => [cellId, null]),
);

export type Props = {
  player: 'x' | 'o';
  cells: Record<string, 'x' | 'o' | null>;
  gameState: 'playing' | 'draw' | 'won';
  timer: number;
};

export default create<Props>(
  {
    player: 'x',
    cells: INITIAL_CELL_STATES,
    gameState: 'playing',
    timer: 0,
  },
  ({ player, cells, gameState, timer }, emit) => {
    cells.subscribe((cells) => {
      const isDraw = Object.values(cells).every((cell) => cell !== null);
      const isWon = WINNING_COMBINATIONS.some((combination) =>
        combination.every((cellId) => cells[cellId] === cells[0]),
      );
      gameState.next(isWon ? 'won' : isDraw ? 'draw' : 'playing');
      player.next(player.value === 'x' ? 'o' : 'x');
    });

    gameState.subscribe((gameState) => {
      if (gameState === 'won' || gameState === 'draw') {
        emit('finish');
      }
    });

    interval(1000).subscribe((t) => timer.next(t));

    return {
      timerHeader: {
        type: 'card',
        attributes: {
          class: 'flex flex-col items-center justify-center',
          value: timer.pipe(map((timer) => timer.toString())),
        },
      },
      // timer: {
      //   ['@for']: timer.pipe(map((timer) => timer / 1000)),
      //   ['@each']: () => ({
      //     type: 'card',
      //     attributes: {
      //       class: 'flex flex-col items-center justify-center',
      //       value: timer.pipe(map((timer) => timer.toString())),
      //     },
      //   }),
      // },
      // timerWarning: {
      //   ['@if']: timer.pipe(map((timer) => timer > 10000)),
      //   ['@then']: () => ({
      //     type: 'card',
      //     attributes: {
      //       class: 'flex flex-col items-center justify-center',
      //       value: timer.pipe(
      //         map((timer) => `Time is running out! (${timer.toString()})`),
      //       ),
      //     },
      //   }),
      //   ['@else']: {
      //     type: 'card',
      //     attributes: {
      //       class: 'flex flex-col items-center justify-center',
      //       value: 'Plenty of time left!',
      //     },
      //   },
      // },
      header: {
        type: 'card',
        attributes: {
          class: 'flex flex-col items-center justify-center',
          value: combineLatest([gameState, player]).pipe(
            map(([gameState, player]) => {
              switch (gameState) {
                case 'playing':
                  return `${player}'s Turn`;
                case 'draw':
                  return 'Draw';
                case 'won':
                  return `${player} Wins`;
              }
            }),
          ),
        },
      },
      board: {
        type: 'card',
        attributes: {
          class: 'flex w-4 h-4',
        },
        children: Object.fromEntries(
          CELL_IDS.map((cellId) => [
            cellId,
            {
              type: 'button',
              attributes: {
                class: 'border-2 border-black w-4 h-4',
                value: cells.pipe(map((cells) => cells[cellId]?.toString())),
              },
              on: {
                interact: () => {
                  cells.next({ ...cells.value, [cellId]: player.value });
                },
              },
            },
          ]),
        ),
      },
    };
  },
);
