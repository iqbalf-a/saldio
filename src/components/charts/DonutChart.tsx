import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

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
      <Svg width={size} height={size}>
        {/* Mulai dari jam 12 */}
        <G rotation={-90} originX={center} originY={center}>
          {total === 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E6EAF2"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            rendered
          )}
        </G>
      </Svg>
      <View className="absolute items-center">
        {centerTop ? <Text className="font-sans-bold text-xl text-saldio-ink">{centerTop}</Text> : null}
        {centerBottom ? <Text className="font-sans text-xs text-saldio-muted">{centerBottom}</Text> : null}
      </View>
    </View>
  );
}
