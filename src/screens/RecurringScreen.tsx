import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppData } from "../state/AppDataContext";
import { useConfirm } from "../components/ConfirmModal";
import { allCategories } from "../lib/categories";
import { formatRupiah } from "../lib/format";
import type { RecurringFrequency, RecurringTransaction, Wallet } from "../lib/types";
import type { HomeScreenProps } from "../navigation/types";

const FREQ_OPTIONS: { key: RecurringFrequency; label: string }[] = [
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];

const FREQ_ICONS: Record<RecurringFrequency, string> = {
  weekly: "calendar-outline",
  monthly: "calendar",
  yearly: "today",
};

export function RecurringScreen({ navigation }: HomeScreenProps<"Recurring">) {
  const { data, addRecurring, updateRecurring, removeRecurring } = useAppData();
  const dataWallets = data.wallets ?? [];
  const confirm = useConfirm();
  const customCats = data.customCategories ?? [];
  const cats = allCategories(customCats);
  const recurring = data.recurringTransactions ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [walletId, setWalletId] = useState(data.wallets?.[0]?.id ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setTitle("");
    setAmount("");
    setCategory(undefined);
    setWalletId(data.wallets?.[0]?.id ?? "");
    setFrequency("monthly");
    setDueDate(new Date().toISOString().slice(0, 10));
  };

  const startEdit = (r: RecurringTransaction) => {
    setAdding(false);
    setEditing(r.id);
    setTitle(r.title);
    setAmount(String(r.amount));
    setCategory(r.category);
    setWalletId(r.walletId);
    setFrequency(r.frequency);
    setDueDate(r.nextDue);
  };

  const cancel = () => {
    setAdding(false);
    setEditing(null);
  };

  const save = () => {
    const trimmed = title.trim();
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!trimmed || amt <= 0 || !walletId) return;
    const base = { title: trimmed, amount: amt, category, walletId, frequency, nextDue: dueDate };
    if (adding) {
      addRecurring({ ...base, active: true });
    } else if (editing) {
      updateRecurring(editing, base);
    }
    cancel();
  };

  const handleDelete = (r: RecurringTransaction) => {
    confirm({
      title: `Hapus "${r.title}"?`,
      message: "Transaksi berulang ini akan dihapus permanen.",
      confirmLabel: "Hapus",
      onConfirm: () => {
        removeRecurring(r.id);
        if (editing === r.id) cancel();
      },
    });
  };

  const handleToggle = (r: RecurringTransaction) => {
    updateRecurring(r.id, { active: !r.active });
  };

  const isFormOpen = adding || editing !== null;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const canSubmit = !!title.trim() && parseInt(amount.replace(/\D/g, ""), 10) > 0 && !!walletId && validDate;

  return (
    <Screen>
      <ScreenHeader title="Transaksi Berulang" />

      <Text className="mb-4 font-sans text-sm text-saldio-muted">
        {recurring.length} transaksi aktif
      </Text>

      {recurring.length === 0 && !isFormOpen && (
        <View className="items-center rounded-2xl bg-white p-8">
          <Ionicons name="repeat" size={40} color="#D0D5DD" />
          <Text className="mt-3 font-sans-semibold text-sm text-saldio-ink">Belum ada transaksi berulang</Text>
          <Text className="mt-1 text-center font-sans text-xs text-saldio-muted">
            Tambahkan langganan atau tagihan rutin seperti Netflix, listrik, atau asuransi.
          </Text>
        </View>
      )}

      {/* Form tambah / edit */}
      {isFormOpen && (
        <View className="mb-5 rounded-2xl bg-white p-4">
          <Text className="mb-3 font-sans-semibold text-sm text-saldio-ink">
            {adding ? "Transaksi Baru" : "Edit Transaksi"}
          </Text>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Judul</Text>
          <View className="mb-3 rounded-xl bg-saldio-bg px-3 py-2.5">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="mis. Netflix, Listrik, Asuransi…"
              placeholderTextColor="#8A94A6"
              className="font-sans text-sm text-saldio-ink"
              autoFocus
            />
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Jumlah (Rp)</Text>
          <View className="mb-3 rounded-xl bg-saldio-bg px-3 py-2.5">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#8A94A6"
              keyboardType="numeric"
              className="font-sans text-sm text-saldio-ink"
            />
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Frekuensi</Text>
          <View className="mb-3 flex-row gap-2">
            {FREQ_OPTIONS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFrequency(f.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                  frequency === f.key ? "bg-saldio-blue" : "bg-saldio-bg"
                }`}
              >
                <Ionicons
                  name={FREQ_ICONS[f.key] as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={frequency === f.key ? "#fff" : "#64748B"}
                />
                <Text
                  className={`font-sans-semibold text-xs ${
                    frequency === f.key ? "text-white" : "text-saldio-muted"
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Tanggal Jatuh Tempo</Text>
          <View className="mb-3 rounded-xl bg-saldio-bg px-3 py-2.5">
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8A94A6"
              keyboardType="numbers-and-punctuation"
              className="font-sans text-sm text-saldio-ink"
            />
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Dompet</Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {data.wallets?.map((w: Wallet) => (
              <Pressable
                key={w.id}
                onPress={() => setWalletId(w.id)}
                className={`rounded-xl px-3 py-2 ${
                  walletId === w.id ? "bg-saldio-blue" : "bg-saldio-bg"
                }`}
              >
                <Text className={`font-sans-semibold text-xs ${walletId === w.id ? "text-white" : "text-saldio-ink"}`}>
                  {w.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Kategori</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {cats.filter((c) => c.key !== "Emas" && c.key !== "Transfer").slice(0, 10).map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                className={`flex-row items-center gap-1 rounded-lg px-2 py-1.5 ${
                  category === c.key ? "bg-saldio-blue" : "bg-saldio-bg"
                }`}
              >
                <Ionicons
                  name={c.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={category === c.key ? "#fff" : c.color}
                />
                <Text className={`text-xs ${category === c.key ? "text-white" : "text-saldio-ink"}`}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={cancel}
              className="flex-1 h-[52px] items-center justify-center rounded-full bg-saldio-border active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-saldio-muted">Batal</Text>
            </Pressable>
            <View className="flex-1">
              <PrimaryButton label="Simpan" onPress={save} disabled={!canSubmit} />
            </View>
          </View>
        </View>
      )}

      {/* Daftar transaksi berulang */}
      {recurring.length > 0 && (
        <View className="gap-2">
          {!isFormOpen && (
            <Pressable
              onPress={startAdd}
              className="mb-2 flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-saldio-border py-3 active:opacity-70"
            >
              <Ionicons name="add-circle-outline" size={18} color="#3D51E0" />
              <Text className="font-sans-semibold text-sm text-saldio-blue">Tambah Baru</Text>
            </Pressable>
          )}
          {recurring.map((r) => {
            const cat = cats.find((c) => c.key === r.category);
            const wallet = data.wallets?.find((w: Wallet) => w.id === r.walletId);
            return (
              <View
                key={r.id}
                className={`rounded-2xl bg-white p-3 ${!r.active ? "opacity-50" : ""}`}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: cat?.background ?? "#EDF1F7" }}
                  >
                    <Ionicons
                      name={(cat?.icon ?? "repeat") as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={cat?.color ?? "#64748B"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-sm text-saldio-ink">{r.title}</Text>
                    <Text className="font-sans text-xs text-saldio-muted">
                      {formatRupiah(r.amount)} · {FREQ_OPTIONS.find((f) => f.key === r.frequency)?.label} · {wallet?.name ?? "?"}
                    </Text>
                  </View>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="font-sans text-xs text-saldio-muted">
                    Jatuh tempo: {r.nextDue}
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleToggle(r)}
                      className="h-7 items-center justify-center rounded-lg bg-saldio-bg px-2 active:opacity-70"
                    >
                      <Text className="font-sans text-xs text-saldio-muted">
                        {r.active ? "Nonaktif" : "Aktif"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => startEdit(r)}
                      className="h-7 w-7 items-center justify-center rounded-lg bg-saldio-bg active:opacity-70"
                    >
                      <Ionicons name="pencil" size={12} color="#64748B" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(r)}
                      className="h-7 w-7 items-center justify-center rounded-lg bg-saldio-bg active:opacity-70"
                    >
                      <Ionicons name="trash-outline" size={12} color="#E23B3B" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
