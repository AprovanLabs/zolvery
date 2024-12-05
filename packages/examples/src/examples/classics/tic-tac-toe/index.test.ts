import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App, Element } from '../../../core';
import { InteractEvent, KossabosEvent } from '../../../core/events';
import TicTacToe, { Props } from './index';

describe('tic-tac-toe', () => {
  const eventEmitter = new Subject<KossabosEvent>();
  let app: App<Props>;

  beforeEach(() => {
    app = TicTacToe(eventEmitter);
  });

  it('should update cell state when cell is clicked', () => {
    app.props.cells.next = vi.fn();
    (
      app.template?.board?.children?.['0'] as unknown as Element
    )?.on?.interact?.({ type: 'interact' } as InteractEvent);

    expect(app.props.cells.next).toHaveBeenCalledWith({
      '0': 'o',
      '1': null,
      '2': null,
      '3': null,
      '4': null,
      '5': null,
      '6': null,
      '7': null,
      '8': null,
    });
  });

  it('should detect horizontal win condition', async () => {
    const cells = {
      '0': 'x',
      '1': 'x',
      '2': 'x',
      '3': null,
      '4': null,
      '5': null,
      '6': null,
      '7': null,
      '8': null,
    } as Record<string, 'x' | 'o' | null>;
    app.props.cells.next(cells);

    await firstValueFrom(app.props.cells);
    const gameState = app.props.gameState.value;

    expect(gameState).toEqual('won');
  });

  it('should detect vertical win condition', async () => {
    const cells = {
      '0': 'o',
      '1': null,
      '2': null,
      '3': 'o',
      '4': null,
      '5': null,
      '6': 'o',
      '7': null,
      '8': null,
    } as Record<string, 'x' | 'o' | null>;
    app.props.cells.next(cells);

    await firstValueFrom(app.props.cells);
    const gameState = app.props.gameState.value;

    expect(gameState).toEqual('won');
  });

  it('should detect diagonal win condition', async () => {
    const cells = {
      '0': 'x',
      '1': null,
      '2': null,
      '3': null,
      '4': 'x',
      '5': null,
      '6': null,
      '7': null,
      '8': 'x',
    } as Record<string, 'x' | 'o' | null>;
    app.props.cells.next(cells);

    await firstValueFrom(app.props.cells);
    const gameState = app.props.gameState.value;

    expect(gameState).toEqual('won');
  });

  it('should detect draw condition', async () => {
    const cells = {
      '0': 'x',
      '1': 'o',
      '2': 'x',
      '3': 'x',
      '4': 'o',
      '5': 'o',
      '6': 'o',
      '7': 'x',
      '8': 'x',
    } as Record<string, 'x' | 'o' | null>;
    app.props.cells.next(cells);

    await firstValueFrom(app.props.cells);
    const gameState = app.props.gameState.value;

    expect(gameState).toEqual('draw');
  });

  it('should emit finish event when game is won', async () => {
    const eventEmitterSpy = vi.spyOn(eventEmitter, 'next');
    app.props.gameState.next('won');
    expect(eventEmitterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finish',
      }),
    );
  });
});
