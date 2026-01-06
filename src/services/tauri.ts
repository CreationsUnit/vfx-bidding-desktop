import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Shot } from '../stores/bidStore';
import type { Settings } from '../stores/settingsStore';

// Script Analysis Types
export interface ScriptAnalysis {
  shots: Shot[];
  metadata: {
    title?: string;
    total_shots: number;
    vfx_categories: string[];
  };
}

// Chat Types
export interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}

// Command Types
export interface CommandRequest {
  command: string;
  args: string[];
}

/**
 * Script Analysis Service
 */
export const scriptService = {
  /**
   * Process a script file and extract VFX shots
   */
  processScript: async (filePath: string): Promise<ScriptAnalysis> => {
    return await invoke('process_script', { filePath });
  },

  /**
   * Load an existing bid from Excel
   */
  loadBid: async (filePath: string): Promise<ScriptAnalysis> => {
    return await invoke('load_bid', { filePath });
  },

  /**
   * Export bid to Excel
   */
  exportBid: async (outputPath: string): Promise<string> => {
    return await invoke('export_bid', { outputPath });
  },

  /**
   * Listen for script processing events
   */
  onScriptProcessingStart: (callback: (filePath: string) => void) => {
    return listen('script-processing-start', (event) => callback(event.payload as string));
  },

  onScriptProcessingComplete: (callback: (analysis: ScriptAnalysis) => void) => {
    return listen('script-processing-complete', (event) => callback(event.payload as ScriptAnalysis));
  },
};

/**
 * Chat Service
 */
export const chatService = {
  /**
   * Send a message to the LLM
   */
  sendMessage: async (message: string): Promise<string> => {
    return await invoke('send_message', { message });
  },

  /**
   * Execute a natural language command
   */
  executeCommand: async (request: CommandRequest): Promise<string> => {
    return await invoke('execute_command', { request });
  },

  /**
   * Listen for chat messages
   */
  onChatMessage: (callback: (message: ChatMessage) => void) => {
    return listen('chat-message', (event) => callback(event.payload as ChatMessage));
  },

  /**
   * Listen for command execution events
   */
  onCommandExecuting: (callback: (request: CommandRequest) => void) => {
    return listen('command-executing', (event) => callback(event.payload as CommandRequest));
  },
};

/**
 * Bid Service
 */
export const bidService = {
  /**
   * Get a single shot by ID
   */
  getShot: async (id: string): Promise<Shot> => {
    return await invoke('get_shot', { id });
  },

  /**
   * Update shot data
   */
  updateShot: async (id: string, updates: Shot): Promise<Shot> => {
    return await invoke('update_shot', { id, updates });
  },

  /**
   * Group shots for batch operations
   */
  groupShots: async (name: string, shotIds: string[], discountPercent?: number): Promise<string> => {
    return await invoke('group_shots', {
      group: {
        name,
        shot_ids: shotIds,
        discount_percent: discountPercent,
      },
    });
  },

  /**
   * Get all shots
   */
  getAllShots: async (): Promise<Shot[]> => {
    return await invoke('get_all_shots');
  },
};

/**
 * Settings Service
 */
export const settingsService = {
  /**
   * Get current settings
   */
  getSettings: async (): Promise<Settings> => {
    return await invoke('get_settings');
  },

  /**
   * Update settings
   */
  updateSettings: async (settings: Settings): Promise<void> => {
    await invoke('update_settings', { settings });
  },

  /**
   * Test LLM connection
   */
  testLlmConnection: async (settings: Settings): Promise<string> => {
    return await invoke('test_llm_connection', { settings });
  },
};
