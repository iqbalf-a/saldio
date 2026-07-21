import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Dengarkan keyboard fisik di web — angka 0-9, Backspace, Escape.
 * Hanya aktif di web (tidak mengganggu native).
 */
export function usePinKeyboard({
  onDigit,
  onDelete,
  onEscape,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onEscape?: () => void;
  disabled: boolean;
}) {
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handler = (e: KeyboardEvent) => {
      if (disabled) return;

      /* Angka 0-9 dari row atas atau numpad */
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        onDelete();
        return;
      }

      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDigit, onDelete, onEscape, disabled]);
}
