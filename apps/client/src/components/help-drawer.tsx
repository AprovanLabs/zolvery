import React from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { ScrollPanel } from 'primereact/scrollpanel';
import ReactMarkdown from 'react-markdown';

export interface HelpDrawerProps {
  /** Whether the drawer is visible */
  visible: boolean;
  /** Function to close the drawer */
  onHide: () => void;
  /** Help content in markdown format */
  helpContent: string;
  /** Optional title for the drawer */
  title?: string;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  visible,
  onHide,
  helpContent,
  title = 'Help'
}) => {
  const headerTemplate = (
    <div className="flex items-center justify-between w-full">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
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
        {/* Help Content */}
        <ScrollPanel className="flex-1" style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
          <div className="pr-4 prose-sm prose max-w-none">
            <ReactMarkdown>
              {helpContent}
            </ReactMarkdown>
          </div>
        </ScrollPanel>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <Button
            label="Close"
            icon="pi pi-check"
            onClick={onHide}
            className="w-full text-sm"
            size="small"
          />
        </div>
      </div>
    </Sidebar>
  );
};
