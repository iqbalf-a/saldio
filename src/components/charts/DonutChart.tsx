import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../ThemeProvider";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerTop?: string;
  centerBottom?: string;
}

/** Donut chart komposisi aset — digambar dengan stroke-dasharray per irisan. */
export function DonutChart({ slices, size = 140, strokeWidth = 22, centerTop, centerBottom }: Props) {
  const { isDark } = useTheme();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const rendered = slices
    .filter((s) => s.value > 0)
    .map((slice, i) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const length = fraction * circumference;
      const el = (
        <Circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          stroke={slice.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${length} ${circumference - length}`}
          strokeDashoffset={-offset}
          fill="none"
          strokeLinecap="butt"
        />
      );
      offset += length;
      return el;
    });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* Diputar -90° agar irisan pertama mulai dari jam 12 */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {total === 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#3A4566' : '#E6EAF2'}
            strokeWidth={strokeWidth}
            fill="none"
          />
        ) : (
          rendered
        )}
      </Svg>
      <View className="absolute items-center">
        {centerTop ? <Text className="font-sans-bold text-xl text-saldio-ink dark:text-saldio-dark-ink">{centerTop}</Text> : null}
        {centerBottom ? <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">{centerBottom}</Text> : null}
      </View>
    </View>
  );
}
