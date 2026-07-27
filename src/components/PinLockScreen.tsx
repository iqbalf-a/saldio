import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDarkColor } from "../lib/darkColors";
import { savePinHash, verifyPin, removePinHash } from "../lib/pin";
import { usePinKeyboard } from "../lib/usePinKeyboard";
import { getLockoutRemaining } from "../lib/pin";

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

/** Baris titik indikator 6 digit PIN. */
function PinDots({ filled, error, size = "lg" }: { filled: number; error: boolean; size?: "lg" | "sm" }) {
  const dot = size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <View className="flex-row gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          className={`${dot} rounded-full ${
            i < filled ? (error ? "bg-saldio-red dark:bg-red-400" : "bg-saldio-blue dark:bg-saldio-dark-blue") : "bg-saldio-border dark:bg-saldio-dark-border"
          }`}
        />
      ))}
    </View>
  );
}

/** Keypad numerik bersama untuk layar penuh (lg) dan modal (sm). */
function PinKeypad({
  onDigit,
  onDelete,
  disabled,
  size = "lg",
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled: boolean;
  size?: "lg" | "sm";
}) {
  const lg = size === "lg";
  const btn = lg ? "h-16 w-16" : "h-12 w-12";
  const rowGap = lg ? "gap-6" : "gap-4";
  const muted = useDarkColor("muted");
  return (
    <View className={lg ? "gap-4" : "gap-3"}>
      {KEYPAD_ROWS.map((row, ri) => (
        <View key={ri} className={`flex-row justify-center ${rowGap}`}>
          {row.map((key) => {
            if (key === "") return <View key="empty" className={btn} />;
            if (key === "del") {
              return (
                <Pressable
                  key="del"
                  onPress={onDelete}
                  disabled={disabled}
                  className={`${btn} items-center justify-center rounded-full active:opacity-60`}
                >
                  <Ionicons name="backspace-outline" size={lg ? 24 : 20} color={muted} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                onPress={() => onDigit(key)}
                disabled={disabled}
                className={`${btn} items-center justify-center rounded-full active:opacity-70 ${
                  lg ? "bg-white dark:bg-saldio-dark-card" : "bg-saldio-bg dark:bg-saldio-dark-bg"
                }`}
                style={lg ? { boxShadow: "0px 2px 8px rgba(23, 32, 90, 0.06)" } : undefined}
              >
                <Text className={`font-sans-bold text-saldio-ink dark:text-saldio-dark-ink ${lg ? "text-2xl" : "text-lg"}`}>
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface PinLockScreenProps {
  onUnlock: () => void;
}

/** Layar kunci penuh saat app dibuka — hanya verifikasi PIN. */
export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const insets = useSafeAreaInsets();
  const blue = useDarkColor("blue");
  const ink = useDarkColor("ink");
  const muted = useDarkColor("muted");
  const red = useDarkColor("red");

  // Countdown timer saat lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const id = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1000) { clearInterval(id); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutRemaining > 0]);

  // Cek lockout saat mount
  useEffect(() => {
    getLockoutRemaining().then((r) => { if (r > 0) setLockoutRemaining(r); });
  }, []);

  const submit = async (value: string) => {
    setLoading(true);
    try {
      const result = await verifyPin(value);
      if (result.ok) {
        onUnlock();
      } else {
        setError(true);
        setPin("");
        if (result.lockoutRemaining > 0) setLockoutRemaining(result.lockoutRemaining);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 6 || loading || lockoutRemaining > 0) return;
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length === 6) submit(next);
  };

  const handleDelete = () => {
    if (lockoutRemaining > 0) return;
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  usePinKeyboard({ onDigit: handleDigit, onDelete: handleDelete, disabled: loading });

  return (
    <View className="flex-1 bg-saldio-bg dark:bg-saldio-dark-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-saldio-blue/10 dark:bg-saldio-dark-blue/10">
          <Ionicons name="lock-closed" size={30} color={blue} />
        </View>

        <Text className="mt-6 text-center font-sans-bold text-xl text-saldio-ink dark:text-saldio-dark-ink">
          Masukkan PIN
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
          PIN diperlukan untuk membuka Saldio
        </Text>

        <View className="mt-8">
          <PinDots filled={pin.length} error={error} size="lg" />
        </View>

        {error && (
          <Text className="mt-3 font-sans text-sm text-saldio-red dark:text-saldio-dark-red">PIN salah, coba lagi</Text>
        )}

        {lockoutRemaining > 0 && (
          <Text className="mt-3 font-sans text-sm text-saldio-red dark:text-saldio-dark-red">
            Terlalu banyak percobaan. Tunggu {Math.ceil(lockoutRemaining / 1000)} detik
          </Text>
        )}
      </View>

      <View className="px-10 pb-10">
        <PinKeypad onDigit={handleDigit} onDelete={handleDelete} disabled={loading || lockoutRemaining > 0} size="lg" />
      </View>
    </View>
  );
}

/** Modal PIN untuk setup/ubah/nonaktifkan dari ProfileScreen. */
interface PinModalProps {
  visible: boolean;
  mode: "setup" | "change_old" | "change_new" | "disable";
  oldPin?: string;
  onDone: () => void;
  onCancel: () => void;
  onNeedChangeNew?: (oldPin: string) => void;
}

export function PinModal({ visible, mode, oldPin: oldPinProp, onDone, onCancel, onNeedChangeNew }: PinModalProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  // Entri pertama untuk mode setup/change_new — PIN baru harus diketik dua kali
  const [firstEntry, setFirstEntry] = useState<string | null>(null);
  const blue = useDarkColor("blue");
  const ink = useDarkColor("ink");
  const muted = useDarkColor("muted");
  const red = useDarkColor("red");

  useEffect(() => {
    if (visible) {
      setPin("");
      setError(null);
      setFirstEntry(null);
      getLockoutRemaining().then((r) => { if (r > 0) setLockoutRemaining(r); });
    }
  }, [visible, mode]);

  // Countdown timer saat lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const id = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1000) { clearInterval(id); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutRemaining > 0]);

  const confirming = (mode === "setup" || mode === "change_new") && firstEntry !== null;

  const title =
    mode === "disable"
      ? "Nonaktifkan PIN"
      : mode === "change_old"
        ? "PIN Lama"
        : mode === "setup"
          ? confirming
            ? "Konfirmasi PIN"
            : "Buat PIN 6 Digit"
          : confirming
            ? "Konfirmasi PIN Baru"
            : "PIN Baru";

  const subtitle =
    mode === "disable"
      ? "Masukkan PIN saat ini"
      : mode === "change_old"
        ? "Masukkan PIN lama"
        : confirming
          ? "Masukkan ulang PIN untuk konfirmasi"
          : mode === "setup"
            ? "PIN diminta lagi saat membuka aplikasi setelah 30 menit"
            : "Masukkan PIN baru (tidak boleh sama dengan PIN lama)";

  const submit = async (value: string) => {
    setLoading(true);
    try {
      if (mode === "disable") {
        const result = await verifyPin(value);
        if (result.ok) {
          await removePinHash();
          onDone();
        } else {
          setError("PIN salah");
          setPin("");
          if (result.lockoutRemaining > 0) setLockoutRemaining(result.lockoutRemaining);
        }
      } else if (mode === "change_old") {
        const result = await verifyPin(value);
        if (result.ok) {
          onNeedChangeNew?.(value);
        } else {
          setError("PIN salah");
          setPin("");
          if (result.lockoutRemaining > 0) setLockoutRemaining(result.lockoutRemaining);
        }
      } else {
        // setup / change_new: dua kali entri sebelum disimpan
        if (firstEntry === null) {
          if (mode === "change_new" && oldPinProp && value === oldPinProp) {
            setError("PIN baru tidak boleh sama dengan PIN lama");
            setPin("");
            return;
          }
          setFirstEntry(value);
          setPin("");
        } else if (value === firstEntry) {
          await savePinHash(value);
          onDone();
        } else {
          setError("PIN tidak cocok, ulangi dari awal");
          setFirstEntry(null);
          setPin("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 6 || loading || lockoutRemaining > 0) return;
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === 6) submit(next);
  };

  const handleDelete = () => {
    if (lockoutRemaining > 0) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  usePinKeyboard({ onDigit: handleDigit, onDelete: handleDelete, onEscape: onCancel, disabled: loading || lockoutRemaining > 0 });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 px-8"
        onPress={onCancel}
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Pressable className="w-full items-center rounded-3xl bg-white dark:bg-saldio-dark-card px-6 py-8" onPress={() => {}}>
          <View className="h-14 w-14 items-center justify-center rounded-full bg-saldio-blue/10 dark:bg-saldio-dark-blue/10">
            <Ionicons name="lock-closed" size={28} color={blue} />
          </View>

          <Text className="mt-5 text-center font-sans-bold text-lg text-saldio-ink dark:text-saldio-dark-ink">{title}</Text>
          <Text className="mt-2 text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">{subtitle}</Text>

          <View className="mt-6">
            <PinDots filled={pin.length} error={!!error} size="sm" />
          </View>

          {error && <Text className="mt-3 font-sans text-sm text-saldio-red dark:text-saldio-dark-red">{error}</Text>}

          {lockoutRemaining > 0 && (
            <Text className="mt-3 font-sans text-sm text-saldio-red dark:text-saldio-dark-red">
              Terlalu banyak percobaan. Tunggu {Math.ceil(lockoutRemaining / 1000)} detik
            </Text>
          )}

          <View className="mt-6">
            <PinKeypad onDigit={handleDigit} onDelete={handleDelete} disabled={loading || lockoutRemaining > 0} size="sm" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}