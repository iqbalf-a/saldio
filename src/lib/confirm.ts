/**
 * Legacy confirmDestructive — sekarang diarahkan ke ConfirmModal via context.
 * Import useConfirm di komponen, atau pakai fungsi ini dari non-component code.
 */
let _confirmFn: ((opts: { title: string; message: string; confirmLabel?: string; onConfirm: () => void }) => void) | null = null;

export function setGlobalConfirm(fn: typeof _confirmFn) {
  _confirmFn = fn;
}

export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (_confirmFn) {
    _confirmFn({ title, message, confirmLabel, onConfirm });
  }
}
