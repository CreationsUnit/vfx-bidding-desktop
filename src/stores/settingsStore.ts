import { create } from 'zustand';

export interface LlmSettings {
  server_url: string;
  model_name: string;
  context_size: number;
  temperature: number;
  max_tokens: number;
}

export interface PathSettings {
  python_path: string;
  scripts_dir: string;
  templates_dir: string;
  output_dir: string;
}

export interface UiSettings {
  theme: 'light' | 'dark';
  auto_save: boolean;
  show_console: boolean;
}

export interface Settings {
  llm: LlmSettings;
  paths: PathSettings;
  ui: UiSettings;
}

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

const defaultSettings: Settings = {
  llm: {
    server_url: 'http://localhost:8080',
    model_name: 'Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf',
    context_size: 8192,
    temperature: 0.1,
    max_tokens: 4096,
  },
  paths: {
    python_path: 'python3',
    scripts_dir: '',
    templates_dir: '',
    output_dir: '',
  },
  ui: {
    theme: 'dark',
    auto_save: true,
    show_console: false,
  },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      // TODO: Load from Tauri command
      set({ settings: defaultSettings, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ isLoading: true });
    try {
      // TODO: Save via Tauri command
      set({ settings: newSettings, isLoading: false });
    } catch (error) {
      console.error('Failed to save settings:', error);
      set({ isLoading: false });
    }
  },
}));
