import { useState } from 'react';
import { chatService } from '../services/tauri';

export interface UseLlmResult {
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<string>;
  executeCommand: (command: string, args: string[]) => Promise<string>;
}

/**
 * Hook for interacting with the LLM
 */
export function useLlm(): UseLlmResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatService.sendMessage(message);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (command: string, args: string[] = []): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatService.executeCommand({ command, args });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    sendMessage,
    executeCommand,
  };
}
