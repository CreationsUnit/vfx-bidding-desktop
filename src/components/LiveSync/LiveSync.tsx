import { useState } from "react";
import "./LiveSync.css";

interface Shot {
  id: string;
  scene_number: string;
  description: string;
  complexity: string;
  estimated_cost: number;
}

export default function LiveSync() {
  const [shots] = useState<Shot[]>([
    {
      id: "V8.1",
      scene_number: "8",
      description: "EXT. ALIEN WORLD - Spaceship crashes",
      complexity: "High",
      estimated_cost: 15000,
    },
  ]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="h-16 border-b border-gray-700 flex items-center px-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Live Bid Editor</h2>
          <p className="text-sm text-gray-400">
            Real-time synchronization with Excel
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
            Export to Excel
          </button>
        </div>
      </div>

      {/* Shots Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Shot ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Scene
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Description
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Complexity
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Est. Cost
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {shots.map((shot) => (
              <tr key={shot.id} className="border-b border-gray-700 hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-mono">{shot.id}</td>
                <td className="px-4 py-3 text-sm">{shot.scene_number}</td>
                <td className="px-4 py-3 text-sm">{shot.description}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      shot.complexity === "High"
                        ? "bg-red-900 text-red-300"
                        : "bg-green-900 text-green-300"
                    }`}
                  >
                    {shot.complexity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono">
                  ${shot.estimated_cost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-primary-400 hover:text-primary-300 mr-2">
                    Edit
                  </button>
                  <button className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
