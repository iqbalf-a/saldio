import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { GOOGLE_OAUTH } from "../lib/config";
import { buildDemoData } from "../lib/demoData";
import { useAppData } from "../state/AppDataContext";
import { useAuth } from "../state/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export function OnboardingScreen() {
  const { signIn, signInOffline, signInGuest } = useAuth();
  const { replaceAll } = useAppData();

  const enterGuestMode = () => {
    replaceAll(buildDemoData());
    signInGuest();
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_OAUTH.webClientId,
    androidClientId: GOOGLE_OAUTH.androidClientId,
    scopes: GOOGLE_OAUTH.scopes,
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== "success" || !response.authentication?.accessToken) {
        if (response?.type === "error") setError("Login Google gagal. Coba lagi.");
        return;
      }
      const token = response.authentication.accessToken;
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const info = await res.json();
        await signIn({ name: info.name ?? "Pengguna", email: info.email ?? "", picture: info.picture }, token);
      } catch {
        setError("Gagal mengambil profil Google.");
      } finally {
        setBusy(false);
      }
    })();
  }, [response, signIn]);

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center">
        <LinearGradient
          colors={["#1E2A78", "#3D51E0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 28, marginBottom: 32 }}
        >
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="wallet" size={28} color="white" />
          </View>
          <Text className="mt-5 font-sans-bold text-3xl text-white">Saldio</Text>
          <Text className="mt-2 font-sans text-[15px] leading-6 text-white/80">
            Catat semua dompet, rekening bank, dan emasmu di satu tempat. Data tersimpan di Google
            Drive milikmu — Saldio tidak punya server sendiri.
          </Text>
        </LinearGradient>

        <View className="gap-3">
          <View className="flex-row items-start gap-3 rounded-2xl bg-white p-4">
            <Ionicons name="document-text" size={20} color="#3D51E0" />
            <Text className="flex-1 font-sans text-sm leading-5 text-saldio-soft">
              Impor mutasi PDF dari BCA, Mandiri, dan Bank Jago — diproses di perangkatmu.
            </Text>
          </View>
          <View className="flex-row items-start gap-3 rounded-2xl bg-white p-4">
            <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
            <Text className="flex-1 font-sans text-sm leading-5 text-saldio-soft">
              Login dengan Google agar datamu ikut ke mana pun, tersimpan aman di Drive-mu sendiri.
            </Text>
          </View>
        </View>
      </View>

      <View className="pb-6">
        {error ? (
          <Text className="mb-3 text-center font-sans text-sm text-saldio-red">{error}</Text>
        ) : null}
        <PrimaryButton
          label="Masuk dengan Google"
          loading={busy}
          disabled={!request}
          onPress={() => {
            setError(null);
            setBusy(true);
            promptAsync().finally(() => setBusy(false));
          }}
        />
        <Pressable
          onPress={enterGuestMode}
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-saldio-border bg-white active:opacity-80"
        >
          <Ionicons name="eye" size={16} color="#3D51E0" />
          <Text className="font-sans-semibold text-base text-saldio-blue">
            Lihat Mode Tamu (data contoh)
          </Text>
        </Pressable>
        <Pressable onPress={signInOffline} className="mt-4 items-center active:opacity-70">
          <Text className="font-sans-medium text-sm text-saldio-soft">
            Coba dulu tanpa akun (data hanya di perangkat ini)
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
