import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryByKey } from "../lib/categories";
import { useAppData } from "../state/AppDataContext";

export function CategoryIcon({ category, size = 40 }: { category?: string; size?: number }) {
  const { data } = useAppData();
  const cat = categoryByKey(category, data.customCategories);
  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: cat.background }}
    >
      <Ionicons name={cat.icon as never} size={size * 0.45} color={cat.color} />
    </View>
  );
}
