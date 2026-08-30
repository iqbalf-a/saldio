import { useCallback } from "react";
import { useAppData } from "./AppDataContext";
import { useAuth } from "./AuthContext";

/**
 * Sign-out yang aman lintas-akun: bersihkan cache ledger lokal DULU, baru
 * panggil signOut(). Satu-satunya cara yang boleh dipakai untuk keluar dari
 * akun — jangan panggil clearLocalData()+signOut() manual di tempat lain,
 * supaya titik pemanggilan baru di masa depan tidak bisa lupa urutannya
 * (persis bug yang pernah lolos: AuthErrorHandler sempat hanya memanggil
 * signOut() tanpa clearLocalData(), membuka celah kebocoran cache akun yang
 * sama seperti bug wallet-leak semula, lewat jalur token-kedaluwarsa).
 */
export function useFullSignOut(): () => void {
  const { clearLocalData } = useAppData();
  const { signOut } = useAuth();

  return useCallback(() => {
    clearLocalData();
    signOut();
  }, [clearLocalData, signOut]);
}
