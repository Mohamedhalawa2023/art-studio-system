'use client';
import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number; // Maximum ms between keystrokes to consider part of a scanner burst
  minLength?: number;     // Minimum length of scanned barcode
}

/**
 * Enterprise Global Hardware Barcode Scanner Listener
 * Buffers high-speed keystroke bursts (<50ms) typical of USB/HID laser scanners.
 * Prevents accidental form submissions or button triggering by intercepting the terminal 'Enter' key.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 50,
  minLength = 3
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle barcode completion on 'Enter'
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          // Scanner burst detected - prevent form submission or focused button triggering
          e.preventDefault();
          e.stopPropagation();

          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';

          if (scannedCode) {
            onScan(scannedCode);
          }
          return;
        }
        // Normal human Enter keypress, do not intercept
        bufferRef.current = '';
        return;
      }

      // If interval between consecutive keys is too large, reset buffer (it was human typing)
      if (interval > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Collect single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, onScan, maxIntervalMs, minLength]);
}
