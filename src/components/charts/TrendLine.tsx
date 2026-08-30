import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface Props {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  /** Isi gradasi di bawah garis */
  fill?: boolean;
}

/** Maks label yang ditampilkan berjejer — lebih dari ini akan berdesakan/tumpang tindih. */
const MAX_VISIBLE_LABELS = 6;

/** Sisakan ~MAX_VISIBLE_LABELS label yang tersebar merata (selalu memuat label
 * pertama & terakhir), sisanya diganti string kosong — supaya jumlah/urutan
 * elemen (dan karenanya perataan flex justify-between) tetap sama dengan titik
 * data, hanya teksnya yang disembunyikan. */
function thinLabels(labels: string[]): string[] {
  if (labels.length <= MAX_VISIBLE_LABELS) return labels;
  const step = (labels.length - 1) / (MAX_VISIBLE_LABELS - 1);
  const keep = new Set(
    Array.from({ length: MAX_VISIBLE_LABELS }, (_, i) => Math.round(i * step))
  );
  return labels.map((l, i) => (keep.has(i) ? l : ""));
}

/** Line chart sederhana (tren kekayaan / harga emas) dengan react-native-svg. */
export function TrendLine({ values, labels, height = 110, color = "#7C5CF6", fill = true }: Props) {
  const [width, setWidth] = useState(0);

  const pad = 6;
  const chartH = height - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points =
    width > 0 && values.length > 1
      ? values.map((v, i) => {
          const x = pad + (i / (values.length - 1)) * (width - pad * 2);
          const y = pad + (1 - (v - min) / range) * chartH;
          return { x, y };
        })
      : [];

  // Kurva halus dengan segmen bezier antar titik
  let d = "";
  if (points.length > 1) {
    d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }
  const areaD =
    d && points.length > 1
      ? `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : "";

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && d ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.25} />
                <Stop offset="1" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {fill && areaD ? <Path d={areaD} fill="url(#trendFill)" /> : null}
            <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>
      {labels && labels.length > 1 ? (
        <View className="mt-1 flex-row justify-between">
          {thinLabels(labels).map((l, i) => (
            <Text key={i} className="font-sans text-[11px] text-saldio-muted dark:text-saldio-dark-muted">
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
