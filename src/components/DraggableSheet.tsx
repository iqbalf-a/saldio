import React, { useRef, useState } from "react";
import { Animated, PanResponder, View } from "react-native";

interface DraggableSheetProps {
  /** Posisi `top` (px) saat sheet dalam keadaan tertutup — biasanya tinggi konten di atasnya. */
  collapsedTop: number;
  /** Posisi `top` (px) saat sheet dibuka penuh. Default 0. */
  expandedTop?: number;
  children: React.ReactNode;
}

/**
 * Style web-only untuk cegah browser menganggap drag sebagai seleksi teks/scroll.
 * Cast `as any` karena `userSelect`/`touchAction`/`cursor: "grab"` valid di CSS web
 * tapi tidak semua ada di tipe ViewStyle React Native.
 */
const NO_SELECT_STYLE = { userSelect: "none", touchAction: "none", cursor: "grab" } as any;

/**
 * Sheet yang bisa diseret ke atas/bawah lewat handle-nya (mis. daftar transaksi
 * di detail dompet) — dua posisi berhenti: tertutup (collapsedTop) dan
 * terbuka penuh (expandedTop). Cuma area handle yang merespons drag, supaya
 * scroll konten di dalam sheet (saat terbuka) tidak bentrok dengan gesture ini.
 *
 * Handle pakai satu sistem gesture saja (PanResponder, bukan Pressable+
 * PanResponder digabung) — kalau geser sangat kecil, dianggap tap (toggle),
 * kalau geser jauh, dianggap drag. Menggabungkan Pressable dengan PanResponder
 * di node yang sama membuat keduanya rebutan responder dan drag jadi tidak
 * responsif di web.
 */
export function DraggableSheet({ collapsedTop, expandedTop = 0, children }: DraggableSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const topAnim = useRef(new Animated.Value(collapsedTop)).current;
  const grantTopRef = useRef(collapsedTop);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const snapTo = (toExpanded: boolean) => {
    setExpanded(toExpanded);
    Animated.spring(topAnim, {
      toValue: toExpanded ? expandedTop : collapsedTop,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  // Reposisi kalau tinggi konten di atas sheet berubah (mis. rotasi/resize),
  // tapi hanya ketika sheet sedang tertutup — kalau sedang terbuka biarkan saja.
  React.useEffect(() => {
    if (!expandedRef.current) topAnim.setValue(collapsedTop);
  }, [collapsedTop]); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        topAnim.stopAnimation((v) => {
          grantTopRef.current = v;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(collapsedTop, Math.max(expandedTop, grantTopRef.current + g.dy));
        topAnim.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        // Gerakan sangat kecil -> perlakukan sebagai tap (toggle), bukan drag
        if (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6) {
          snapTo(!expandedRef.current);
          return;
        }
        const current = grantTopRef.current + g.dy;
        const mid = (collapsedTop + expandedTop) / 2;
        const goExpanded = current < mid || g.vy < -0.5;
        snapTo(goExpanded);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: topAnim,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: "0px -4px 16px rgba(23, 32, 90, 0.06)",
      }}
    >
      <View
        {...panResponder.panHandlers}
        accessibilityLabel="sheet-handle"
        className="items-center pb-1 pt-3"
        style={NO_SELECT_STYLE}
      >
        <View className="h-1.5 w-10 rounded-full bg-saldio-border" style={NO_SELECT_STYLE} />
      </View>
      {children}
    </Animated.View>
  );
}
