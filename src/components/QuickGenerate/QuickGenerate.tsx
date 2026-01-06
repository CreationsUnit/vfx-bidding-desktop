import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./QuickGenerate.css";

export default function QuickGenerate() {
  const [scriptFile, setScriptFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSelectScript = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Script",
            extensions: ["pdf", "txt", "md", "fountain"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setScriptFile(selected);
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  };

  const handleGenerate = async () => {
    if (!scriptFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // TODO: Call script processing command
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setProgress(i);
      }
    } catch (error) {
      console.error("Failed to generate bid:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2 text-primary-400">
            Quick Generate Bid
          </h2>
          <p className="text-gray-400">
            Upload a script and automatically generate a VFX bid
          </p>
        </div>

        {/* File Selection */}
        <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-600 hover:border-primary-500 transition-colors">
          {scriptFile ? (
            <div className="text-center">
              <p className="text-green-400 mb-2">Selected:</p>
              <p className="text-sm text-gray-300 break-all">{scriptFile}</p>
              <button
                onClick={() => setScriptFile(null)}
                className="mt-4 text-sm text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                Drop your script here or click to browse
              </p>
              <button
                onClick={handleSelectScript}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
              >
                Select Script
              </button>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-lg">Generation Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span>Include detailed shot breakdown</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span>Calculate pricing automatically</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Include vendor recommendations</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!scriptFile || isProcessing}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-lg transition-colors"
        >
          {isProcessing ? `Generating... ${progress}%` : "Generate Bid"}
        </button>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
