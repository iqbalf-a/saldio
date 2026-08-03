import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { formatCompactRupiah } from "../../lib/format";
import { useDarkColor } from "../../lib/darkColors";

const WEEKDAYS_MIN = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const GREEN = "#16A34A";
const RED = "#E23B3B";

interface Props {
  /** "2026-07" */
  yearMonth: string;
  /** ISO date -> net Rupiah (income - expense) untuk hari itu */
  dailyTotals: Record<string, number>;
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
}

function hexWithAlpha(hex: string, alpha01: number): string {
  const a = Math.round(Math.min(Math.max(alpha01, 0), 1) * 255);
  return `${hex}${a.toString(16).padStart(2, "0")}`;
}

export function ExpenseCalendar({ yearMonth, dailyTotals, selectedDate, onSelectDate }: Props) {
  const [year, month] = yearMonth.split("-").map(Number); // month: 1-indexed
  const ink = useDarkColor("ink");
  const muted = useDarkColor("muted");
  const todayIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const maxAbs = useMemo(() => {
    const values = Object.values(dailyTotals).map((v) => Math.abs(v));
    return values.length > 0 ? Math.max(...values) : 0;
  }, [dailyTotals]);

  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isoOf = (day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <View className="rounded-3xl bg-white dark:bg-saldio-dark-card p-4">
      <View className="mb-2 flex-row">
        {WEEKDAYS_MIN.map((d) => (
          <View key={d} className="flex-1 items-center py-1">
            <Text className="font-sans-medium text-[10px] text-saldio-muted dark:text-saldio-dark-muted">{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day, di) => {
            if (day === null) return <View key={di} className="flex-1 p-0.5" style={{ aspectRatio: 1 }} />;
            const iso = isoOf(day);
            const value = dailyTotals[iso];
            const hasData = value !== undefined && value !== 0;
            const intensity = hasData && maxAbs > 0 ? Math.abs(value) / maxAbs : 0;
            const bg = hasData ? hexWithAlpha(value > 0 ? GREEN : RED, 0.15 + intensity * 0.7) : "transparent";
            const isSelected = iso === selectedDate;
            const isToday = iso === todayIso;
            return (
              <View key={di} className="flex-1 p-0.5" style={{ aspectRatio: 1 }}>
                <Pressable
                  onPress={() => onSelectDate(iso)}
                  className="flex-1 items-center justify-center rounded-xl active:opacity-70"
                  style={{
                    backgroundColor: bg,
                    borderWidth: isSelected ? 2 : isToday ? 1 : 0,
                    borderColor: "#3D51E0",
                  }}
                >
                  <Text
                    className="font-sans-semibold text-[11px]"
                    style={{ color: hasData ? (value > 0 ? GREEN : RED) : ink }}
                  >
                    {day}
                  </Text>
                  {hasData ? (
                    <Text className="font-mono-medium text-[8px]" style={{ color: value > 0 ? GREEN : RED }}>
                      {formatCompactRupiah(value)}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
      <View className="mt-3 flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: hexWithAlpha(GREEN, 0.6) }} />
          <Text className="font-sans text-[10px] text-saldio-muted dark:text-saldio-dark-muted">Surplus</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: hexWithAlpha(RED, 0.6) }} />
          <Text className="font-sans text-[10px] text-saldio-muted dark:text-saldio-dark-muted">Defisit</Text>
        </View>
      </View>
    </View>
  );
}
