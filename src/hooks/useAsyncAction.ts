'use client';
import { useState, useCallback, useRef } from 'react';

interface UseAsyncActionOptions {
  cooldownMs?: number;
  onError?: (err: unknown) => void;
}

/**
 * Enterprise Double-Click & Rapid Action Shield Hook
 * Prevents rapid double-clicks on submit buttons, checkout, and financial mutations.
 * Enforces atomic state locking and optional post-execution cooldown.
 */
export function useAsyncAction(options: UseAsyncActionOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);
  const { cooldownMs = 600, onError } = options;

  const execute = useCallback(
    async <T,>(action: () => Promise<T> | T): Promise<T | undefined> => {
      if (lockRef.current) {
        // Discard rapid repeated click
        return undefined;
      }

      lockRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await action();
        return result;
      } catch (err) {
        if (onError) {
          onError(err);
        } else {
          console.error('[useAsyncAction] Execution failed:', err);
        }
        throw err;
      } finally {
        // Enforce cooldown before unlocking to prevent immediate double clicks
        setTimeout(() => {
          lockRef.current = false;
          setIsSubmitting(false);
        }, cooldownMs);
      }
    },
    [cooldownMs, onError]
  );

  return {
    isSubmitting,
    execute
  };
}
