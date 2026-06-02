import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true']";

export function useKeyboardShortcuts({
  enabled = true,
  onTogglePlay,
  onNext,
  onPrevious,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(EDITABLE_SELECTOR)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        onTogglePlay();
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        onNext();
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNext, onPrevious, onTogglePlay]);
}
