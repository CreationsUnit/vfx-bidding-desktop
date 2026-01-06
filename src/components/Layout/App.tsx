import { ReactNode } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main application layout component
 * Provides header, mode selector, main content area, and status footer
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const settings = useSettingsStore((state) => state.settings);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Logo icon */}
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2M17 4V2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                VFX Bidding AI
              </h1>
            </div>
          </div>
          <span className="text-xs text-gray-500 border border-gray-600 rounded px-2 py-1">v0.1.0</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Model Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-750 rounded-lg border border-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">
              {settings?.llm.model_name || 'Model not loaded'}
            </span>
          </div>

          {/* Settings Button */}
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Settings"
            onClick={() => {/* TODO: Open settings */}}
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Status Footer */}
      <footer className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ready
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No file loaded
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>File Watcher: Active</span>
          <span>Server: {settings?.llm.server_url || 'Not configured'}</span>
        </div>
      </footer>
    </div>
  );
}
