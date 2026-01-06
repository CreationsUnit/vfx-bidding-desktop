import { useState } from 'react';
import { bidService } from '../services/tauri';
import { useBidStore } from '../stores/bidStore';
import type { Shot } from '../stores/bidStore';

export interface UseBidResult {
  shots: Shot[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateShot: (id: string, updates: Partial<Shot>) => Promise<void>;
  deleteShot: (id: string) => Promise<void>;
  addShot: (shot: Shot) => Promise<void>;
}

/**
 * Hook for managing bid data
 */
export function useBid(): UseBidResult {
  const { shots, setShots, updateShot: updateStoreShot, deleteShot: deleteStoreShot, addShot: addStoreShot } = useBidStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allShots = await bidService.getAllShots();
      setShots(allShots);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateShot = async (id: string, updates: Partial<Shot>) => {
    setIsLoading(true);
    setError(null);

    try {
      const currentShot = shots.find((s) => s.id === id);
      if (!currentShot) {
        throw new Error(`Shot ${id} not found`);
      }

      const updatedShot = { ...currentShot, ...updates };
      await bidService.updateShot(id, updatedShot);
      updateStoreShot(id, updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShot = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Add delete command to backend
      deleteStoreShot(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addShot = async (shot: Shot) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Add add command to backend
      addStoreShot(shot);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    shots,
    isLoading,
    error,
    refresh,
    updateShot,
    deleteShot,
    addShot,
  };
}
