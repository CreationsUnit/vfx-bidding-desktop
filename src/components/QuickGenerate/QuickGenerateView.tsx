import { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useBidStore } from '../../stores/bidStore';
import { scriptService } from '../../services/tauri';

/**
 * Quick Generate View Component
 * Fast script-to-bid conversion with drag-and-drop support
 */
export default function QuickGenerateView() {
  const [scriptFile, setScriptFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const setCurrentScript = useBidStore((state) => state.setCurrentScript);
  const setShots = useBidStore((state) => state.setShots);

  const handleSelectScript = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Script Files',
            extensions: ['pdf', 'txt', 'md', 'fountain'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setScriptFile(selected);
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      alert('Failed to open file dialog. Please try again.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(pdf|txt|md|fountain)$/i)) {
        setScriptFile(file.name);
      } else {
        alert('Please drop a valid script file (PDF, TXT, MD, or Fountain)');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleGenerate = async () => {
    if (!scriptFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Listen for processing events
      const unlistenStart = scriptService.onScriptProcessingStart((filePath) => {
        console.log('Processing started:', filePath);
      });

      const unlistenComplete = scriptService.onScriptProcessingComplete((analysis) => {
        setShots(analysis.shots);
        setCurrentScript(scriptFile);
        setProgress(100);
        setIsProcessing(false);
      });

      // Process the script
      await scriptService.processScript(scriptFile);

      // Simulate progress for demo (remove when backend is connected)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Cleanup listeners
      setTimeout(() => {
        unlistenStart.then((u) => u());
        unlistenComplete.then((u) => u());
      }, 1000);
    } catch (error) {
      console.error('Failed to generate bid:', error);
      alert(`Failed to generate bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setScriptFile(null);
    setProgress(0);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900 overflow-auto">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">Quick Generate Bid</h2>
          <p className="text-gray-400">
            Upload a script and automatically generate a professional VFX bid in seconds
          </p>
        </div>

        {/* File Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative bg-gray-800 rounded-2xl p-8 border-2 border-dashed transition-all duration-200
            ${isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-105'
              : 'border-gray-600 hover:border-blue-500 hover:bg-gray-750'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {scriptFile ? (
            <div className="text-center space-y-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <p className="text-green-400 font-medium mb-2">Script Selected</p>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-sm text-gray-300 break-all font-mono">{scriptFile}</p>
                </div>
              </div>

              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Clear and select another file
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              {/* Upload Icon */}
              <div className={`flex justify-center transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-lg text-gray-300">
                  {isDragging ? 'Drop your script here' : 'Drag & drop your script here'}
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <div className="h-px bg-gray-700 flex-1 max-w-[100px]" />
                  <span className="text-sm text-gray-500">or</span>
                  <div className="h-px bg-gray-700 flex-1 max-w-[100px]" />
                               </div>
                <button
                  onClick={handleSelectScript}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                >
                  Browse Files
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Supported formats: PDF, TXT, Markdown, Fountain
              </p>
            </div>
          )}
        </div>

        {/* Generation Options */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-700">
          <h3 className="font-semibold text-lg text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Generation Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Include detailed shot breakdown
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Calculate pricing automatically using industry standards
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Include vendor recommendations
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Apply 15% contingency by default
              </span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!scriptFile || isProcessing}
          className={`
            w-full py-4 rounded-xl font-medium text-lg transition-all duration-200
            ${!scriptFile || isProcessing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]'
            }
          `}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Bid... {progress}%
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Complete Bid
            </span>
          )}
        </button>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Processing script... This may take a moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
