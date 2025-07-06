import React, { useState, useEffect } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Slider } from 'primereact/slider';
import { Divider } from 'primereact/divider';
import { ScrollPanel } from 'primereact/scrollpanel';
import { type Settings } from '@kossabos/core';

export interface SettingsDrawerProps {
  /** Whether the drawer is visible */
  visible: boolean;
  /** Function to close the drawer */
  onHide: () => void;
  /** List of settings to render */
  settings: Settings[];
  /** Initial values for the settings */
  initialValues?: Record<string, any>;
  /** Callback when settings values change */
  onSettingsChange: (settingsValues: Record<string, any>) => void;
  /** Optional title for the drawer */
  title?: string;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  visible,
  onHide,
  settings,
  initialValues = {},
  onSettingsChange,
  title
}) => {
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({});

  // Initialize settings values with defaults or initial values
  useEffect(() => {
    const defaultValues = settings.reduce((acc, setting) => {
      const initialValue = initialValues[setting.id] ?? setting.defaultValue;
      acc[setting.id] = initialValue;
      return acc;
    }, {} as Record<string, any>);
    
    setSettingsValues(defaultValues);
  }, [settings, initialValues]);

  // Update parent when values change
  useEffect(() => {
    onSettingsChange(settingsValues);
  }, [settingsValues, onSettingsChange]);

  const updateSettingValue = (settingId: string, value: any) => {
    setSettingsValues(prev => ({
      ...prev,
      [settingId]: value
    }));
  };

  const renderSettingInput = (setting: Settings) => {
    const currentValue = settingsValues[setting.id];

    switch (setting.type) {
      case 'select':
        return (
          <Dropdown
            value={currentValue}
            options={setting.options}
            onChange={(e) => updateSettingValue(setting.id, e.value)}
            placeholder="Select an option"
            className="w-full"
            panelClassName="text-sm"
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <Checkbox
              inputId={setting.id}
              checked={currentValue || false}
              onChange={(e) => updateSettingValue(setting.id, e.checked)}
              className="mr-2"
            />
            <label htmlFor={setting.id} className="text-sm cursor-pointer">
              {setting.label}
            </label>
          </div>
        );

      case 'input':
        return (
          <InputText
            value={currentValue || ''}
            onChange={(e) => updateSettingValue(setting.id, e.target.value)}
            placeholder={`Enter ${setting.label.toLowerCase()}`}
            className="w-full"
          />
        );

      case 'slider': {
        // Extract min, max from options or use defaults
        const minOption = setting.options.find((opt: { value: string; label: string }) => opt.value === 'min');
        const maxOption = setting.options.find((opt: { value: string; label: string }) => opt.value === 'max');
        const min = minOption ? parseInt(minOption.label) : 0;
        const max = maxOption ? parseInt(maxOption.label) : 100;
        
        return (
          <div className="w-full">
            <Slider
              value={currentValue || min}
              onChange={(e) => updateSettingValue(setting.id, e.value)}
              min={min}
              max={max}
              className="w-full"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{min}</span>
              <span className="font-medium">{currentValue || min}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      }

      default:
        return (
          <InputText
            value={currentValue || ''}
            onChange={(e) => updateSettingValue(setting.id, e.target.value)}
            placeholder={`Enter ${setting.label.toLowerCase()}`}
            className="w-full"
          />
        );
    }
  };

  const resetToDefaults = () => {
    const defaultValues = settings.reduce((acc, setting) => {
      acc[setting.id] = setting.defaultValue;
      return acc;
    }, {} as Record<string, any>);
    
    setSettingsValues(defaultValues);
  };

  const headerTemplate = (
    <div className="flex items-center justify-between w-full">
      {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
    </div>
  );

  return (
    <Sidebar
      visible={visible}
      position="right"
      onHide={onHide}
      className="w-full bg-white sm:w-96 md:w-80"
      modal
      blockScroll
      header={headerTemplate}
      pt={{
        closeButton: { className: 'p-4' }
      }}
    >
      <div className="flex flex-col h-full">
        <ScrollPanel className="flex-1" style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
          <div className="pr-4 space-y-6">
            {settings.map((setting, index) => (
              <div key={setting.id} className="space-y-2">
                {/* Label and description */}
                {setting.type !== 'checkbox' && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      {setting.label}
                      {setting.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {setting.description && (
                      <p className="mb-2 text-xs text-gray-500">{setting.description}</p>
                    )}
                  </div>
                )}

                {/* Setting Input */}
                <div className="space-y-1">
                  {renderSettingInput(setting)}
                  {setting.type === 'checkbox' && setting.description && (
                    <p className="ml-6 text-xs text-gray-500">{setting.description}</p>
                  )}
                </div>

                {/* Dividers */}
                {index < settings.length - 1 && (
                  <Divider className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollPanel>

        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              label="Reset to Defaults"
              icon="pi pi-refresh"
              onClick={resetToDefaults}
              outlined
              className="flex-1 text-sm"
              size="small"
            />
            <Button
              label="Close"
              icon="pi pi-check"
              onClick={onHide}
              className="flex-1 text-sm"
              size="small"
            />
          </div>
        </div>
      </div>
    </Sidebar>
  );
};