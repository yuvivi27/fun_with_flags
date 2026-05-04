"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_AUTO_HIDE_MS = 3000;

/**
 * Show/hide password control: when revealed, automatically hides again after `autoHideMs`.
 */
export function useAutoHidePasswordVisibility(
  autoHideMs: number = DEFAULT_AUTO_HIDE_MS,
) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const toggle = useCallback(() => {
    setVisible((showing) => {
      if (showing) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return false;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, autoHideMs);
      return true;
    });
  }, [autoHideMs]);

  return { visible, toggle };
}
