import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Settings.css";

interface Settings {
  llm: {
    server_url: string;
    model_name: string;
    context_size: number;
    temperature: number;
    max_tokens: number;
  };
  paths: {
    python_path: string;
    scripts_dir: string;
    templates_dir: string;
    output_dir: string;
  };
  ui: {
    theme: string;
    auto_save: boolean;
    show_console: boolean;
  };
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await invoke<Settings>("get_settings");
      setSettings(result);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      await invoke("update_settings", { settings });
      // TODO: Show success notification
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const testConnection = async () => {
    if (!settings) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await invoke<string>("test_llm_connection", { settings });
      setTestResult(result);
    } catch (error) {
      setTestResult(`Error: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="h-full overflow-auto bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Settings</h2>
          <p className="text-gray-400">Configure your VFX Bidding AI environment</p>
        </div>

        {/* LLM Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">LLM Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Server URL
              </label>
              <input
                type="text"
                value={settings.llm.server_url}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, server_url: e.target.value },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={settings.llm.model_name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, model_name: e.target.value },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Context Size
                </label>
                <input
                  type="number"
                  value={settings.llm.context_size}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        context_size: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.llm.temperature}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 rounded text-sm font-medium"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <p
                className={`text-sm ${
                  testResult.startsWith("Error")
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {testResult}
              </p>
            )}
          </div>
        </div>

        {/* Path Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Paths</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Python Path
              </label>
              <input
                type="text"
                value={settings.paths.python_path}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    paths: { ...settings.paths, python_path: e.target.value },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Scripts Directory
              </label>
              <input
                type="text"
                value={settings.paths.scripts_dir}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    paths: { ...settings.paths, scripts_dir: e.target.value },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* UI Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Appearance</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ui.auto_save}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ui: { ...settings.ui, auto_save: e.target.checked },
                  })
                }
                className="w-4 h-4"
              />
              <span>Auto-save bids</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ui.show_console}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ui: { ...settings.ui, show_console: e.target.checked },
                  })
                }
                className="w-4 h-4"
              />
              <span>Show developer console</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
