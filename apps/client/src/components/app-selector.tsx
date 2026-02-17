import React from 'react';
import { Dropdown } from 'primereact/dropdown';

export interface AppSelectorProps {
  /** Currently selected app ID */
  selectedAppId: string | null;
  /** Available apps */
  apps: Array<{ appId: string }>;
  /** Callback when app is changed */
  onAppChange: (appId: string) => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({
  selectedAppId,
  apps,
  onAppChange
}) => (
  <div className="fixed top-0 flex items-center gap-2 pt-2 pl-2 bg-white z-10">
    <img
      src="/logo.png"
      alt="Kossabos Logo"
      className="w-10 h-10"
    />
    <Dropdown
      value={selectedAppId}
      onChange={(e) => onAppChange(e.value)}
      options={apps.map(({ appId }) => appId)}
      optionLabel="name"
      placeholder="Select an App"
      className="text-sm"
    />
  </div>
);
