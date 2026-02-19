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
        <header className="text-center space-y-1 flex space-between gap-4 items-center justify-center">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Kossabos Logo" className="w-8 h-8" />
          <span className="text-sm uppercase tracking-widest text-slate-400">Zolvery</span>
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

        <footer className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 mb-2">
            Want more games? Build your own!
          </p>
          <a
            href="https://github.com/JacobSampson/kossabos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
