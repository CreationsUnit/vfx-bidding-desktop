import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import AppLayout from './components/Layout/App';
import ModeSelector, { AppMode } from './components/Layout/ModeSelector';
import ChatWindow from './components/Chat/ChatWindow';
import QuickGenerateView from './components/QuickGenerate/QuickGenerateView';
import LiveSyncView from './components/LiveSync/LiveSyncView';
import SetupWizard from './components/Setup/SetupWizard';
import './App.css';

/**
 * Main Application Component
 * Orchestrates the VFX Bidding AI desktop app with mode-based navigation
 */
function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    checkSetupStatus();
    setupEventListeners();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const status: { is_first_run: boolean } = await invoke('check_setup_status');
      setShowSetupWizard(status.is_first_run);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to check setup status:', err);
      // If check fails, proceed to main app
      setIsLoading(false);
    }
  };

  const setupEventListeners = () => {
    // Listen for script processing events
    const unlistenScriptStart = listen('script-processing-start', (event) => {
      console.log(`Processing script: ${event.payload}`);
    });

    const unlistenScriptComplete = listen('script-processing-complete', () => {
      console.log('Script processing complete');
    });

    const unlistenCommandExecuting = listen('command-executing', (event) => {
      console.log(`Executing: ${event.payload}`);
    });

    // Listen for setup completion
    const unlistenSetupComplete = listen('setup-complete', () => {
      setShowSetupWizard(false);
    });

    return () => {
      unlistenScriptStart.then((u) => u());
      unlistenScriptComplete.then((u) => u());
      unlistenCommandExecuting.then((u) => u());
      unlistenSetupComplete.then((u) => u());
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show setup wizard on first run
  if (showSetupWizard) {
    return <SetupWizard />;
  }

  const renderContent = () => {
    switch (activeMode) {
      case 'chat':
        return <ChatWindow />;
      case 'quick':
        return <QuickGenerateView />;
      case 'sync':
        return <LiveSyncView />;
      default:
        return <ChatWindow />;
    }
  };

  return (
    <AppLayout>
      <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
      {renderContent()}
    </AppLayout>
  );
}

export default App;
