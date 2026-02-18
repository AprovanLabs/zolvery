import React, { useState, useMemo } from 'react';
import type { GameEntry } from '../hooks/use-games-catalog';
import type { GameSetting } from '../hooks/use-widget-source';

export type PlayMode = 'local' | 'host' | 'join';

export interface GameConfig {
  game: GameEntry;
  settings: Record<string, unknown>;
  playerCount: number;
  botCount: number;
  playMode: PlayMode;
}

interface GameSetupProps {
  game: GameEntry;
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: GameSetting;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (setting.options?.length) {
    return (
      <select
        value={String(value ?? setting.default ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        {setting.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (setting.type === 'number') {
    return (
      <input
        type="number"
        value={Number(value ?? setting.default ?? 0)}
        min={setting.min}
        max={setting.max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? setting.default ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
    />
  );
}

export function GameSetup({ game, onStart, onBack }: GameSetupProps) {
  const minPlayers = game.players?.min ?? 2;
  const maxPlayers = game.players?.max ?? 2;
  const isMultiplayerSupported = game.runnerTag === 'boardgameio';

  const [playerCount, setPlayerCount] = useState(maxPlayers);
  const [botCount, setBotCount] = useState(Math.max(0, maxPlayers - 1));
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const s of game.settings ?? []) {
      // Skip bot-count in settings - we handle it separately
      if (s.id !== 'bot-count' && s.default !== undefined) {
        initial[s.id] = s.default;
      }
    }
    return initial;
  });

  const filteredSettings = useMemo(
    () => (game.settings ?? []).filter((s) => s.id !== 'bot-count'),
    [game.settings],
  );

  const updateSetting = (id: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [id]: value }));
  };

  const startGame = (mode: PlayMode) => {
    onStart({
      game,
      settings: { ...settings, 'bot-count': mode === 'local' ? botCount : 0 },
      playerCount,
      botCount: mode === 'local' ? botCount : 0,
      playMode: mode,
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6 max-w-sm mx-auto">
        <header className="flex items-start gap-3">
          <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img
              src={game.iconUrl}
              alt=""
              className="w-16 h-16"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900">
              {game.name ?? game.appId}
            </h1>
            {game.description && (
              <p className="text-sm text-slate-500 mt-0.5">{game.description}</p>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {maxPlayers > minPlayers && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Players
              </label>
              <select
                value={playerCount}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  setPlayerCount(count);
                  setBotCount(Math.min(botCount, count - 1));
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                {Array.from(
                  { length: maxPlayers - minPlayers + 1 },
                  (_, i) => minPlayers + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Player' : 'Players'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Bots
            </label>
            <select
              value={botCount}
              onChange={(e) => setBotCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              {Array.from({ length: playerCount }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Bot' : 'Bots'}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              {playerCount - botCount} human {playerCount - botCount === 1 ? 'player' : 'players'} needed
            </p>
          </div>

          {filteredSettings.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Settings
              </h2>
              {filteredSettings.map((setting) => (
                <div key={setting.id} className="space-y-1">
                  <label className="text-sm text-slate-700">{setting.label}</label>
                  <SettingInput
                    setting={setting}
                    value={settings[setting.id]}
                    onChange={(v) => updateSetting(setting.id, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => startGame('local')}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:scale-[0.98]"
          >
            Play
          </button>

          {isMultiplayerSupported && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => startGame('host')}
                  className="flex-1 rounded-lg border-2 border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 active:scale-[0.98]"
                >
                  Host Game
                </button>
                <button
                  onClick={() => startGame('join')}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 active:scale-[0.98]"
                >
                  Join Game
                </button>
              </div>
            </>
          )}

          <button
            onClick={onBack}
            className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
