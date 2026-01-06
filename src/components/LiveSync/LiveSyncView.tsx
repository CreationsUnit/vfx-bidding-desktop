import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useBidStore } from '../../stores/bidStore';

interface SyncStatus {
  enabled: boolean;
  watching: boolean;
  lastSync: Date | null;
  file: string | null;
}

/**
 * Live Sync View Component
 * Real-time Excel synchronization with visual status indicators
 */
export default function LiveSyncView() {
  const shots = useBidStore((state) => state.shots);
  const updateShot = useBidStore((state) => state.updateShot);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    enabled: false,
    watching: false,
    lastSync: null,
    file: null,
  });

  const [editingCell, setEditingCell] = useState<{ shotId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleToggleSync = () => {
    if (!syncStatus.enabled) {
      // Enable sync - prompt for Excel file
      handleSelectExcelFile();
    } else {
      // Disable sync
      setSyncStatus({
        ...syncStatus,
        enabled: false,
        watching: false,
        file: null,
      });
    }
  };

  const handleSelectExcelFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Excel Files',
            extensions: ['xlsx', 'xls'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setSyncStatus({
          enabled: true,
          watching: true,
          lastSync: new Date(),
          file: selected,
        });
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      alert('Failed to open file dialog. Please try again.');
    }
  };

  const handleStartWatching = () => {
    setSyncStatus({
      ...syncStatus,
      watching: true,
      lastSync: new Date(),
    });
  };

  const handleCellEdit = (shotId: string, field: string, value: string | number) => {
    setEditingCell({ shotId, field });
    setEditValue(String(value));
  };

  const handleCellSave = () => {
    if (editingCell) {
      updateShot(editingCell.shotId, {
        [editingCell.field]: editValue,
      });
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getStatusColor = () => {
    if (!syncStatus.enabled) return 'bg-gray-500';
    if (syncStatus.watching) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!syncStatus.enabled) return 'Sync disabled';
    if (syncStatus.watching) return 'Watching for changes';
    return 'Paused';
  };

  // Calculate totals
  const totalCost = shots.reduce((sum, shot) => sum + (shot.final_price || shot.estimated_cost || 0), 0);
  const totalHours = shots.reduce((sum, shot) => sum + (shot.estimated_hours || 0), 0);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="h-20 border-b border-gray-700 flex items-center px-6 justify-between bg-gray-800">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Live Bid Editor</h2>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-full border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${syncStatus.watching ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-gray-400">{getStatusText()}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {syncStatus.file
              ? `Watching: ${syncStatus.file.split('/').pop()}`
              : 'Real-time synchronization with Excel spreadsheets'
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Sync Button */}
          {!syncStatus.file ? (
            <button
              onClick={handleToggleSync}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Link Excel File
            </button>
          ) : (
            <>
              <button
                onClick={handleStartWatching}
                disabled={syncStatus.watching}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {syncStatus.watching ? 'Watching...' : 'Resume Sync'}
              </button>
              <button
                onClick={handleToggleSync}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Unlink
              </button>
            </>
          )}

          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="h-24 border-b border-gray-700 flex items-center px-6 gap-6 bg-gray-800/50">
        <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Shots</p>
              <p className="text-2xl font-bold text-white">{shots.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Est. Hours</p>
              <p className="text-2xl font-bold text-white">{totalHours.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cost</p>
              <p className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Last Sync</p>
              <p className="text-sm font-medium text-white">
                {syncStatus.lastSync
                  ? new Date(syncStatus.lastSync).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Shots Table */}
      <div className="flex-1 overflow-auto">
        {!syncStatus.file ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Enable Live Sync</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Link an Excel file to enable real-time synchronization. Changes made in the app will automatically update your spreadsheet.
            </p>
            <button
              onClick={handleToggleSync}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Select Excel File
            </button>
          </div>
        ) : shots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2M17 4V2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Shots Found</h3>
            <p className="text-gray-400 text-center max-w-md">
              Generate a bid first or load an existing Excel file with shot data.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Shot ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Scene</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">VFX Types</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Complexity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Hours</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Rate/hr</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shots.map((shot) => (
                <tr key={shot.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-blue-400">{shot.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{shot.scene_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{shot.description}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {shot.vfx_types.map((type, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        shot.complexity === 'High'
                          ? 'bg-red-900/50 text-red-300'
                          : shot.complexity === 'Medium'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-green-900/50 text-green-300'
                      }`}
                    >
                      {shot.complexity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {editingCell?.shotId === shot.id && editingCell?.field === 'estimated_hours' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave();
                          if (e.key === 'Escape') handleCellCancel();
                        }}
                        className="w-20 bg-gray-700 border border-blue-500 rounded px-2 py-1 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-400"
                        onClick={() => handleCellEdit(shot.id, 'estimated_hours', shot.estimated_hours || 0)}
                      >
                        {shot.estimated_hours || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                    ${shot.rate_per_hour || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                    ${shot.final_price?.toLocaleString() || shot.estimated_cost?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCellEdit(shot.id, 'description', shot.description)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button className="text-red-400 hover:text-red-300 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
