import React from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Button } from 'primereact/button';

export interface AppFooterProps {
  /** Callback to reset the app */
  onReset: () => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onReset,
  onBack
}) => (
  <footer className="fixed bottom-0 flex items-center justify-between w-full px-8 py-4 border-t border-slate-200 bg-white">
    <div>
      <ArrowLeftIcon 
        className={`text-gray-900 size-6 ${onBack ? 'cursor-pointer hover:text-gray-700' : 'cursor-not-allowed opacity-50'}`}
        onClick={onBack}
        title="Go Back"
      />
    </div>
    <div className="flex items-center gap-6">
      <Button
        label="Reset"
        icon="pi pi-refresh"
        onClick={onReset}
        size="small"
        outlined
        className="text-sm"
      />
    </div>
  </footer>
);
