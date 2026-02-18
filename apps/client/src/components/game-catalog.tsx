import React from 'react';
import type { GameCategory, GameEntry } from '../hooks/use-games-catalog';

interface GameCatalogProps {
  categories: GameCategory[];
  isLoading: boolean;
  onSelectGame: (game: GameEntry) => void;
}

function GameCard({
  game,
  onClick,
}: {
  game: GameEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 w-full text-left rounded-lg border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
    >
      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
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
        <h3 className="font-medium text-sm text-slate-900 truncate">
          {game.name ?? game.appId}
        </h3>
        {game.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
            {game.description}
          </p>
        )}
      </div>
    </button>
  );
}

export function GameCatalog({
  categories,
  isLoading,
  onSelectGame,
}: GameCatalogProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-slate-400">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <header className="text-center space-y-1">
          <img src="/logo.png" alt="Kossabos Logo" className="w-12 h-12 mx-auto" />
        </header>

        {categories.map((category) => (
          <section key={category.id} className="space-y-2">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
              {category.label}
            </h2>
            <div className="grid gap-2">
              {category.games.map((game) => (
                <GameCard
                  key={game.appId}
                  game={game}
                  onClick={() => onSelectGame(game)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
