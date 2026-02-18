import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardDocumentIcon, CheckIcon, LinkIcon, UserIcon } from '@heroicons/react/24/outline';
import { codeToWords, fuzzyMatch, isValidWord, LETTERS, wordsToCode } from '../utils/code-words';
import { useP2PLobby, type LobbyPlayer } from '../hooks/use-p2p-lobby';

export interface GameLobbyConfig {
  matchID: string;
  playerID: string;
  credentials: string;
  isHost: boolean;
}

interface GameLobbyProps {
  gameId: string;
  initialMode?: 'host' | 'join';
  initialCode?: string;
  onStart: (config: GameLobbyConfig) => void;
  onCancel?: () => void;
}

function generateMatchID(): string {
  return Array.from({ length: 6 }, () =>
    LETTERS[Math.floor(Math.random() * LETTERS.length)],
  ).join('');
}

function generateCredentials(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

type LobbyMode = 'choose' | 'host' | 'join' | 'waiting';

function PlayerList({ players }: { players: LobbyPlayer[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        Players ({players.length})
      </div>
      <div className="space-y-1">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
          >
            <div className={`w-2 h-2 rounded-full ${player.isReady ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <UserIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 flex-1">{player.name}</span>
            {player.isHost && (
              <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                Host
              </span>
            )}
          </div>
        ))}
      </div>
      {players.length < 2 && (
        <div className="text-xs text-slate-400 text-center py-2">
          Waiting for more players...
        </div>
      )}
    </div>
  );
}

export function GameLobby({ gameId, initialMode, initialCode, onStart, onCancel }: GameLobbyProps) {
  // If initialCode is provided, start in 'waiting' mode directly
  const [mode, setMode] = useState<LobbyMode>(
    initialCode ? 'waiting' : initialMode === 'join' ? 'join' : initialMode === 'host' ? 'host' : 'choose'
  );
  const [matchID, setMatchID] = useState(() => initialMode === 'host' ? generateMatchID() : '');
  const [inputCode, setInputCode] = useState(() => (initialCode || '').toUpperCase());
  const [phraseInputs, setPhraseInputs] = useState<string[]>(() => codeToWords(initialCode || '') || ['', '', '']);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [credentials] = useState(() => generateCredentials());
  const [gameStarted, setGameStarted] = useState(false);
  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  const blurTimeout = useRef<number | null>(null);

  const isHost = mode === 'host';
  const shouldConnect = mode === 'host' || mode === 'waiting';

  const handleGameStart = useCallback(() => {
    if (gameStarted) return;
    setGameStarted(true);
    
    onStart({
      matchID: isHost ? matchID : inputCode.toUpperCase(),
      playerID: isHost ? '0' : '1',
      credentials,
      isHost,
    });
  }, [gameStarted, onStart, isHost, matchID, inputCode, credentials]);

  const {
    isConnecting,
    isConnected,
    players,
    error,
    startGame,
    debug,
  } = useP2PLobby({
    gameId,
    matchID: isHost ? matchID : inputCode.toUpperCase(),
    isHost,
    playerName: isHost ? 'Host' : 'Player 2',
    enabled: shouldConnect,
    onGameStart: handleGameStart,
  });

  // Auto-connect when entering join code
  const handleJoinSubmit = () => {
    if (!/^[A-Z]{6}$/.test(inputCode)) return;
    setMode('waiting');
  };

  // Reset copied state when changing modes
  useEffect(() => {
    setCopied(null);
  }, [mode, matchID]);

  useEffect(() => {
    const words = codeToWords(inputCode);
    if (words) setPhraseInputs(words);
  }, [inputCode]);

  useEffect(() => () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(matchID);
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyInviteLink = async () => {
    // Use hash-based route for static site compatibility
    const inviteLink = `${window.location.origin}/#/apps/${gameId}/join/${matchID}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hostGame = () => {
    const newMatchID = generateMatchID();
    setMatchID(newMatchID);
    setMode('host');
  };

  const handlePhraseChange = (value: string, index: number) => {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
    const next = [...phraseInputs];
    next[index] = normalized;
    setPhraseInputs(next);
    const code = wordsToCode(next);
    setInputCode(code || '');
  };

  const hostPhrase = codeToWords(matchID);
  const joinPhrase = codeToWords(inputCode);
  const phraseSuggestions = phraseInputs.map((word) => fuzzyMatch(word));
  const phraseStates = phraseInputs.map((word, i) => {
    if (!word) return 'empty';
    if (isValidWord(word)) return 'valid';
    return phraseSuggestions[i].length > 0 ? 'partial' : 'invalid';
  });

  if (mode === 'choose') {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">Multiplayer</h2>
            <p className="text-sm text-slate-500">{gameId}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={hostGame}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            >
              Host Game
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400"
            >
              Join Game
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">Share Code</h2>
            <p className="text-sm text-slate-500">
              Give this code to other players
            </p>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-widest text-slate-800">
                {matchID}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={copyCode}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  title="Copy code"
                >
                  {copied === 'code' ? (
                    <CheckIcon className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  title="Copy invite link"
                >
                  {copied === 'link' ? (
                    <CheckIcon className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <LinkIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            {hostPhrase && (
              <div className="text-xs text-center text-slate-500">
                {hostPhrase.join(' ')}
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="rounded-xl border-2 border-slate-200 p-4 space-y-3">
            {isConnecting ? (
              <div className="text-sm text-slate-500 text-center">
                Setting up lobby...
              </div>
            ) : error ? (
              <div className="text-sm text-slate-500 text-center">
                {error}
              </div>
            ) : (
              <PlayerList players={players} />
            )}
          </div>

          <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Debug
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Host ID: {debug.hostId}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Peer ID: {debug.peerId ?? '—'}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              ICE: {debug.lastIceState ?? 'n/a'} | Relay: {debug.usingRelayOnly ? 'on' : 'off'}
            </div>
            <div className="max-h-32 overflow-y-auto rounded bg-slate-50 p-2 text-[11px] font-mono text-slate-600">
              {debug.log.length === 0 ? (
                <div>No events yet</div>
              ) : (
                debug.log.map((entry, idx) => <div key={idx}>{entry}</div>)
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={startGame}
              disabled={!isConnected || players.length < 2 || isConnecting}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
            >
              Start
            </button>
            <button
              onClick={() => setMode('choose')}
              className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">Enter Code</h2>
            <p className="text-sm text-slate-500">
              Enter the code from the host
            </p>
          </div>

          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            placeholder="ABCDEF"
            maxLength={6}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-center font-mono text-2xl font-bold tracking-widest text-slate-800 placeholder:text-slate-300 focus:border-emerald-400 focus:outline-none"
          />

          <div className="space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-3 gap-2">
              {phraseInputs.map((word, index) => {
                const state = phraseStates[index];
                const suggestions = phraseSuggestions[index];
                const showDropdown = focusedInput === index && word && suggestions.length > 0 && suggestions.length <= 6 && !isValidWord(word);
                const border = state === 'valid' ? 'border-emerald-300 focus:border-emerald-400' : state === 'invalid' ? 'border-rose-200 focus:border-rose-300' : 'border-slate-200 focus:border-emerald-300';
                return (
                  <div key={index} className="relative space-y-1">
                    <input
                      value={word}
                      onChange={(e) => handlePhraseChange(e.target.value, index)}
                      onFocus={() => {
                        if (blurTimeout.current) {
                          clearTimeout(blurTimeout.current);
                          blurTimeout.current = null;
                        }
                        setFocusedInput(index);
                      }}
                      onBlur={() => {
                        blurTimeout.current = window.setTimeout(() => {
                          setFocusedInput(null);
                        }, 150);
                      }}
                      placeholder="word"
                      className={`w-full rounded-lg border bg-white px-2 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none ${border}`}
                    />
                    {showDropdown && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={() => handlePhraseChange(s, index)}
                            className="block w-full px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleJoinSubmit}
              disabled={!/^[A-Z]{6}$/.test(inputCode)}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
            >
              Join
            </button>
            <button
              onClick={() => setMode('choose')}
              className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting mode (joiner connected to lobby)
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">Waiting Room</h2>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center justify-center">
            <span className="font-mono text-3xl font-bold tracking-widest text-slate-800">
              {inputCode.toUpperCase()}
            </span>
          </div>
          {joinPhrase && (
            <div className="text-xs text-center text-slate-500">
              {joinPhrase.join(' ')}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="rounded-xl border-2 border-slate-200 p-4 space-y-3">
          {isConnecting ? (
            <div className="text-sm text-slate-500 text-center">
              Connecting to game...
            </div>
          ) : error ? (
            <div className="text-sm text-slate-500 text-center">
              {error}
            </div>
          ) : !isConnected ? (
            <div className="text-sm text-slate-500 text-center">
              Connecting...
            </div>
          ) : (
            <>
              <PlayerList players={players} />
              <div className="text-sm text-slate-500 text-center pt-2">
                Waiting for host to start the game...
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">

        <div className="rounded-xl border-2 border-slate-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Debug
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Host ID: {debug.hostId}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Peer ID: {debug.peerId ?? '—'}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            ICE: {debug.lastIceState ?? 'n/a'} | Relay: {debug.usingRelayOnly ? 'on' : 'off'}
          </div>
          <div className="max-h-32 overflow-y-auto rounded bg-slate-50 p-2 text-[11px] font-mono text-slate-600">
            {debug.log.length === 0 ? (
              <div>No events yet</div>
            ) : (
              debug.log.map((entry, idx) => <div key={idx}>{entry}</div>)
            )}
          </div>
        </div>
        <button
            onClick={() => {
              setMode('join');
              setInputCode('');
            }}
            className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
          >

            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
