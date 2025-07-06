import React from 'react';
import {
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';
import { App as KossabosApp } from '@kossabos/core';

export interface AppHeaderProps {
  /** The app data */
  app: KossabosApp;
  /** Callback to show settings menu */
  onShowSettings: () => void;
  /** Callback to show help menu */
  onShowHelp: () => void;
  /** Optional callback to show statistics (currently not implemented) */
  onShowStats?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  app,
  onShowSettings,
  onShowHelp,
  onShowStats
}) => (
  <header
    className="flex items-center justify-between px-8 py-4 border-b-1 border-slate-200"
    style={{ height: '4rem' }}
  >
    <div>
      <p>{app.name}</p>
      <span className="text-xs">{app.author.username}</span>
    </div>
    <div className="flex items-center gap-6">
      <QuestionMarkCircleIcon 
        className="text-gray-900 cursor-pointer size-6 hover:text-gray-700"
        onClick={onShowHelp}
        title="Help"
      />
      <AdjustmentsHorizontalIcon 
        className="text-gray-900 cursor-pointer size-6 hover:text-gray-700"
        onClick={onShowSettings}
        title="Settings"
      />
      <ChartBarIcon 
        className={`text-gray-900 size-6 ${onShowStats ? 'cursor-pointer hover:text-gray-700' : 'cursor-not-allowed opacity-50'}`}
        onClick={onShowStats}
        title="Statistics"
      />
    </div>
  </header>
);
