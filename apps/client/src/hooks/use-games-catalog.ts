import { useState, useEffect, useMemo } from 'react';
import type { KossabosManifest } from './use-widget-source';

export interface GameEntry extends KossabosManifest {
  category: string;
  iconUrl: string;
}

export interface GameCategory {
  id: string;
  label: string;
  games: GameEntry[];
}

const CATEGORY_LABELS: Record<string, string> = {
  'board-games': 'Board Games',
  'card-games': 'Card Games',
  classics: 'Classics',
  'dice-games': 'Dice Games',
  'word-games': 'Word Games',
  puzzles: 'Puzzles',
  'social-games': 'Social Games',
  music: 'Music',
};

export function useGamesCatalog() {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);

    fetch('/apps/apps.json')
      .then((r) => r.json())
      .then(async (appList: Array<{ appId: string }>) => {
        const manifests = await Promise.all(
          appList.map(async ({ appId }) => {
            try {
              const manifest = await fetch(`/apps/${appId}/kossabos.json`).then(
                (r) => r.json(),
              );
              const category = appId.split('/')[0];
              const logoName = manifest.iconName ?? 'icon.svg';
              return {
                ...manifest,
                appId,
                category,
                iconUrl: `/apps/${appId}/${logoName}`,
              } as GameEntry;
            } catch {
              return null;
            }
          }),
        );
        setGames(manifests.filter((m): m is GameEntry => m !== null));
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo<GameCategory[]>(() => {
    const categoryMap = new Map<string, GameEntry[]>();

    for (const game of games) {
      const existing = categoryMap.get(game.category) ?? [];
      categoryMap.set(game.category, [...existing, game]);
    }

    return Array.from(categoryMap.entries())
      .map(([id, categoryGames]) => ({
        id,
        label: CATEGORY_LABELS[id] ?? id,
        games: categoryGames.sort((a, b) =>
          (a.name ?? a.appId).localeCompare(b.name ?? b.appId),
        ),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [games]);

  return { games, categories, isLoading, error };
}
