import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Banner "Versi baru tersedia" — muncul dari service worker ketika ada update.
 */
export function UpdateBanner() {
  const [show, setShow] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      regRef.current = reg;
      if (reg.waiting) setShow(true);

      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    });

    // Muat ulang otomatis saat SW baru mengambil alih (controller berubah)
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const handleUpdate = () => {
    regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  if (!show) return null;

  return (
    <View
      className="absolute bottom-24 left-4 right-4 z-50 flex-row items-center gap-3 rounded-2xl bg-saldio-blue px-4 py-3"
      style={{ elevation: 8 }}
    >
      <Ionicons name="refresh-circle" size={22} color="#fff" />
      <Text className="flex-1 font-sans-semibold text-sm text-white">
        Versi baru tersedia
      </Text>
      <Pressable
        onPress={handleUpdate}
        className="rounded-lg bg-white/20 px-3 py-1.5 active:opacity-80"
      >
        <Text className="font-sans-semibold text-xs text-white">Muat Ulang</Text>
      </Pressable>
    </View>
  );
}
