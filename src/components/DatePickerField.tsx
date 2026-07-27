import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatMediumDate, formatMonthLabel, parseISODate, toISODate } from "../lib/format";
import { useDarkColor } from "../lib/darkColors";

const WEEKDAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WEEKDAYS_MIN = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface Props {
  /** Tanggal terpilih, ISO (YYYY-MM-DD) */
  value: string;
  onChange: (iso: string) => void;
  /** Warna aksen mengikuti konteks layar (emas untuk dompet emas) */
  accent?: "blue" | "gold";
}

/** Field tanggal + kalender bottom-sheet setema, dengan chip Hari ini/Kemarin. */
export function DatePickerField({ value, onChange, accent = "blue" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISODate(value) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const todayIso = toISODate(new Date());
  const yesterdayIso = toISODate(new Date(Date.now() - 86400000));
  const accentBg = accent === "gold" ? "bg-saldio-gold dark:bg-saldio-dark-gold" : "bg-saldio-blue dark:bg-saldio-dark-blue";
  const accentText = accent === "gold" ? "text-saldio-gold-deep dark:text-saldio-dark-gold-deep" : "text-saldio-blue dark:text-saldio-dark-blue";
  const accentSoftBg = accent === "gold" ? "bg-saldio-gold-bg dark:bg-saldio-dark-gold-bg" : "bg-saldio-sky dark:bg-saldio-dark-sky";
  const accentColor = accent === "gold" ? "#8A6A10" : "#3D51E0";
  const ink = useDarkColor("ink");
  const muted = useDarkColor("muted");

  const openPicker = () => {
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // Grid kalender: mulai Senin
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isoOf = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const pick = (day: number) => {
    onChange(isoOf(day));
    setOpen(false);
  };

  return (
    <View>
      {/* Chip cepat */}
      <View className="mb-2 flex-row gap-2">
        {[
          { label: "Hari ini", iso: todayIso },
          { label: "Kemarin", iso: yesterdayIso },
        ].map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => onChange(opt.iso)}
            className={`rounded-full px-4 py-2 ${value === opt.iso ? accentSoftBg : "bg-white dark:bg-saldio-dark-card"}`}
          >
            <Text
              className={`font-sans-semibold text-xs ${
                value === opt.iso ? accentText : "text-saldio-soft dark:text-saldio-dark-soft"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Field tanggal */}
      <Pressable
        onPress={openPicker}
        className="flex-row items-center gap-3 rounded-2xl bg-white dark:bg-saldio-dark-card px-4 py-3.5 active:opacity-80"
      >
        <Ionicons name="calendar" size={18} color={accentColor} />
        <Text className="flex-1 font-sans-semibold text-base text-saldio-ink dark:text-saldio-dark-ink">
          {WEEKDAYS_LONG[selected.getDay()]}, {formatMediumDate(toISODate(selected))}
        </Text>
        <Ionicons name="chevron-down" size={16} color={muted} />
      </Pressable>

      {/* Kalender */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="mx-4 mb-6 rounded-3xl bg-white dark:bg-saldio-dark-card p-5" onPress={() => {}}>
            {/* Navigasi bulan */}
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => shiftMonth(-1)}
                className="h-10 w-10 items-center justify-center rounded-full bg-saldio-bg dark:bg-saldio-dark-bg active:opacity-70"
              >
                <Ionicons name="chevron-back" size={18} color={ink} />
              </Pressable>
              <Text className="font-sans-bold text-base text-saldio-ink dark:text-saldio-dark-ink">
                {formatMonthLabel(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)}
              </Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                className="h-10 w-10 items-center justify-center rounded-full bg-saldio-bg dark:bg-saldio-dark-bg active:opacity-70"
              >
                <Ionicons name="chevron-forward" size={18} color={ink} />
              </Pressable>
            </View>

            {/* Nama hari */}
            <View className="mb-1 flex-row">
              {WEEKDAYS_MIN.map((d) => (
                <View key={d} className="flex-1 items-center py-1">
                  <Text className="font-sans-medium text-[11px] text-saldio-muted dark:text-saldio-dark-muted">{d}</Text>
                </View>
              ))}
            </View>

            {/* Grid tanggal */}
            {weeks.map((week, wi) => (
              <View key={wi} className="flex-row">
                {week.map((day, di) => {
                  if (day === null) return <View key={di} className="flex-1 py-1" />;
                  const iso = isoOf(day);
                  const isSelected = iso === value;
                  const isToday = iso === todayIso;
                  return (
                    <View key={di} className="flex-1 items-center py-1">
                      <Pressable
                        onPress={() => pick(day)}
                        className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${
                          isSelected ? accentBg : ""
                        }`}
                        style={
                          !isSelected && isToday
                            ? { borderWidth: 1.5, borderColor: accentColor }
                            : undefined
                        }
                      >
                        <Text
                          className={`font-sans-semibold text-sm ${
                            isSelected ? "text-white" : isToday ? accentText : "text-saldio-ink dark:text-saldio-dark-ink"
                          }`}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
