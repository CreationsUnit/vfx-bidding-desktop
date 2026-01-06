import { useEffect, useState } from 'react';

/**
 * Hook for handling file drop events in the app
 */
export function useFileDrop(_onDrop: (filePath: string) => void) {
  const [isDragging] = useState(false);

  useEffect(() => {
    // TODO: Set up Tauri file drop event listeners
    // This will be implemented when Tauri file drop handlers are added
  }, [_onDrop]);

  return {
    isDragging,
  };
}
