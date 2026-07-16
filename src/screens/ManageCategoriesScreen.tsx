import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppData } from "../state/AppDataContext";
import { allCategories, CATEGORIES } from "../lib/categories";
import { useConfirm } from "../components/ConfirmModal";
import type { Category } from "../lib/categories";
import type { HomeScreenProps } from "../navigation/types";

const ICON_OPTIONS = [
  "restaurant", "bicycle", "basket", "flash", "film", "briefcase",
  "swap-horizontal", "apps", "heart", "cart", "cafe", "gift",
  "home", "car", "airplane", "paw", "musical-notes", "book",
  "fitness", "medkit", "school", "pencil", "build", "game-controller",
];

const COLOR_OPTIONS = [
  { color: "#E86A33", background: "#FDEEE4" },
  { color: "#2F6BFF", background: "#E8F0FE" },
  { color: "#8B5CF6", background: "#F1EAFE" },
  { color: "#D9A400", background: "#FEF6DC" },
  { color: "#E23B3B", background: "#FDE8E8" },
  { color: "#16A34A", background: "#E7F6EC" },
  { color: "#0EA5E9", background: "#E6F6FE" },
  { color: "#EC4899", background: "#FDE8F3" },
  { color: "#F97316", background: "#FEE9D6" },
  { color: "#64748B", background: "#EDF1F7" },
];

export function ManageCategoriesScreen({ navigation }: HomeScreenProps<"ManageCategories">) {
  const { data, addCustomCategory, updateCustomCategory, removeCustomCategory } = useAppData();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("apps");
  const [colorIdx, setColorIdx] = useState(0);

  const customList = data.customCategories ?? [];
  const all = allCategories(customList);
  const builtInKeys = new Set(CATEGORIES.map((c) => c.key));

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setName("");
    setIcon("apps");
    setColorIdx(0);
  };

  const startEdit = (cat: Category) => {
    setAdding(false);
    setEditing(cat.key);
    setName(cat.label);
    setIcon(cat.icon);
    const idx = COLOR_OPTIONS.findIndex((c) => c.color === cat.color);
    setColorIdx(idx >= 0 ? idx : 0);
  };

  const cancel = () => {
    setAdding(false);
    setEditing(null);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const palette = COLOR_OPTIONS[colorIdx];
    if (adding) {
      addCustomCategory({ label: trimmed, icon, color: palette.color, background: palette.background });
    } else if (editing) {
      updateCustomCategory(editing, { label: trimmed, icon, color: palette.color, background: palette.background });
    }
    cancel();
  };

  const handleDelete = (cat: Category) => {
    confirm({
      title: `Hapus "${cat.label}"?`,
      message: "Kategori kustom akan dihapus. Transaksi yang sudah ada tetap memakai nama kategori sebelumnya.",
      confirmLabel: "Hapus",
      onConfirm: () => {
        removeCustomCategory(cat.key);
        if (editing === cat.key) cancel();
      },
    });
  };

  const palette = COLOR_OPTIONS[colorIdx];
  const isFormOpen = adding || editing !== null;

  return (
    <Screen>
      <ScreenHeader title="Kategori" />

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-sans text-sm text-saldio-muted">
          {CATEGORIES.length} bawaan · {customList.length} kustom
        </Text>
        {!isFormOpen && (
          <Pressable
            onPress={startAdd}
            className="flex-row items-center gap-1.5 rounded-xl bg-saldio-blue px-3 py-2 active:opacity-70"
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text className="font-sans-semibold text-xs text-white">Tambah</Text>
          </Pressable>
        )}
      </View>

      {/* Form tambah / edit */}
      {isFormOpen && (
        <View className="mb-5 rounded-2xl bg-white p-4">
          <Text className="mb-3 font-sans-semibold text-sm text-saldio-ink">
            {adding ? "Kategori Baru" : "Edit Kategori"}
          </Text>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Nama</Text>
          <View className="mb-4 rounded-xl bg-saldio-bg px-3 py-2.5">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="mis. Kopi, Parkir, Langganan…"
              placeholderTextColor="#8A94A6"
              className="font-sans text-sm text-saldio-ink"
              autoFocus
            />
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Ikon</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {ICON_OPTIONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => setIcon(ic)}
                className={`h-10 w-10 items-center justify-center rounded-xl ${
                  icon === ic ? "bg-saldio-blue" : "bg-saldio-bg"
                }`}
              >
                <Ionicons
                  name={ic as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={icon === ic ? "#fff" : "#64748B"}
                />
              </Pressable>
            ))}
          </View>

          <Text className="mb-1.5 font-sans text-xs text-saldio-muted">Warna</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {COLOR_OPTIONS.map((c, i) => (
              <Pressable
                key={c.color}
                onPress={() => setColorIdx(i)}
                className={`h-8 w-8 rounded-full ${
                  colorIdx === i ? "border-2 border-saldio-ink" : ""
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </View>

          {/* Preview */}
          <View className="mb-4 flex-row items-center gap-2 rounded-xl p-3" style={{ backgroundColor: palette.background }}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.color} />
            <Text className="font-sans-semibold text-sm" style={{ color: palette.color }}>
              {name.trim() || "Preview"}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={cancel}
              className="flex-1 h-[52px] items-center justify-center rounded-full bg-saldio-border active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-saldio-muted">Batal</Text>
            </Pressable>
            <View className="flex-1">
              <PrimaryButton label="Simpan" onPress={save} disabled={!name.trim()} />
            </View>
          </View>
        </View>
      )}

      {/* Daftar kategori bawaan */}
      <Text className="mb-2 font-sans-semibold text-xs uppercase text-saldio-muted">Bawaan</Text>
      <View className="mb-4 gap-2">
        {CATEGORIES.map((cat) => (
          <View key={cat.key} className="flex-row items-center gap-3 rounded-2xl bg-white p-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: cat.background }}>
              <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={cat.color} />
            </View>
            <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">{cat.label}</Text>
            <Text className="font-sans text-xs text-saldio-muted">Bawaan</Text>
          </View>
        ))}
      </View>

      {/* Daftar kategori kustom */}
      {customList.length > 0 && (
        <>
          <Text className="mb-2 font-sans-semibold text-xs uppercase text-saldio-muted">Kustom</Text>
          <View className="gap-2">
            {customList.map((cat) => {
              const matched = all.find((c) => c.key === cat.key);
              if (!matched) return null;
              return (
                <View key={cat.key} className="flex-row items-center gap-3 rounded-2xl bg-white p-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: matched.background }}>
                    <Ionicons name={matched.icon as keyof typeof Ionicons.glyphMap} size={18} color={matched.color} />
                  </View>
                  <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">{matched.label}</Text>
                  <Pressable
                    onPress={() => startEdit(matched)}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-saldio-bg active:opacity-70"
                  >
                    <Ionicons name="pencil" size={14} color="#64748B" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(matched)}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-saldio-bg active:opacity-70"
                  >
                    <Ionicons name="trash-outline" size={14} color="#E23B3B" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
