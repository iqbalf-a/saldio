import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { WalletBadge } from "../components/WalletBadge";
import { CATEGORIES, categoryByKey } from "../lib/categories";
import { formatRupiah, formatShortDate, formatSignedRupiah } from "../lib/format";
import { walletBalance } from "../lib/balances";
import { extractPdfLines, PdfPasswordError } from "../lib/pdf/extract";
import { parseStatement, PARSER_LABELS } from "../lib/pdf/parsers";
import type { ParsedTransaction } from "../lib/pdf/parseCommon";
import type { TransactionSource } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import type { RootScreenProps } from "../navigation/types";

type Step = 1 | 2 | 3 | 4;

interface ReviewRow extends ParsedTransaction {
  key: string;
  selected: boolean;
  duplicate: boolean;
}

type ParseStage = "open" | "format" | "extract" | "categorize" | "done";

const SOURCE_BY_TEMPLATE: Record<string, TransactionSource> = {
  bca: "import_pdf_bca",
  mandiri: "import_pdf_mandiri",
  bank_jago: "import_pdf_bank_jago",
  neo_bank: "import_pdf_neo_bank",
  super_bank: "import_pdf_super_bank",
};

function StepBar({ step }: { step: Step }) {
  return (
    <View className="mb-5 flex-row gap-2">
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          className={`h-1 flex-1 rounded-full ${s <= step ? "bg-saldio-blue" : "bg-saldio-border"}`}
        />
      ))}
    </View>
  );
}

function StageRow({ label, state }: { label: string; state: "done" | "active" | "pending" }) {
  return (
    <View className="flex-row items-center gap-2.5 py-1.5">
      {state === "done" ? (
        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
      ) : state === "active" ? (
        <ActivityIndicator size={16} color="#3D51E0" />
      ) : (
        <View className="h-[18px] w-[18px] rounded-full border-2 border-saldio-border" />
      )}
      <Text
        className={`font-sans-medium text-sm ${
          state === "done" ? "text-saldio-green" : state === "active" ? "text-saldio-blue" : "text-saldio-muted"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export function ImportPdfScreen({ route, navigation }: RootScreenProps<"ImportPdf">) {
  const { data, addTransactions } = useAppData();
  const wallet = data.wallets.find((w) => w.id === route.params.walletId);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [stage, setStage] = useState<ParseStage>("open");
  const [pageCount, setPageCount] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [imported, setImported] = useState({ count: 0, skipped: 0, inflow: 0, outflow: 0 });

  const parserLabel = wallet ? PARSER_LABELS[wallet.template] ?? wallet.name : "";
  const selectedCount = rows.filter((r) => r.selected).length;

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setFile({ uri: result.assets[0].uri, name: result.assets[0].name });
    setPassword("");
    setNeedPassword(false);
    setError(null);
  };

  const startParse = async () => {
    if (!file || !wallet) return;
    setStep(2);
    setError(null);
    try {
      setStage("open");
      const { lines, pageCount: pages } = await extractPdfLines(
        file.uri,
        password.trim() || undefined
      );
      setPageCount(pages);
      setStage("format");
      const parsed = parseStatement(wallet.template, lines);
      setStage("extract");
      if (parsed.length === 0) {
        setError(
          `Tidak ada transaksi yang dikenali di file ini. Pastikan file adalah e-statement resmi ${parserLabel}.`
        );
        setStep(1);
        return;
      }
      setStage("categorize");
      // Deteksi duplikat: cocok dengan transaksi tersimpan, atau kembar di dalam batch
      const existing = new Set(
        data.transactions
          .filter((t) => t.walletId === wallet.id)
          .map((t) => `${t.date}|${t.amount}|${t.type === "income" ? "in" : "out"}`)
      );
      const seen = new Set<string>();
      const review: ReviewRow[] = parsed.map((p, i) => {
        const sig = `${p.date}|${p.amount}|${p.direction}`;
        const duplicate = existing.has(sig) || seen.has(sig);
        seen.add(sig);
        return { ...p, key: `row_${i}`, selected: !duplicate, duplicate };
      });
      setRows(review);
      setStage("done");
      setStep(3);
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setNeedPassword(true);
        setError(
          e.wrongPassword
            ? "Password salah — periksa lagi lalu coba ulang."
            : "PDF ini terkunci. Masukkan password dari bank (biasanya tanggal lahir, mis. HHBBTTTT)."
        );
      } else {
        setError(
          "Gagal membaca PDF di perangkat ini. Coba lewat Saldio versi web, atau catat transaksi secara manual."
        );
      }
      setStep(1);
    }
  };

  const doImport = () => {
    if (!wallet) return;
    const source = SOURCE_BY_TEMPLATE[wallet.template] ?? "manual";
    const chosen = rows.filter((r) => r.selected);
    addTransactions(
      chosen.map((r) => ({
        walletId: wallet.id,
        date: r.date,
        type: r.direction === "in" ? ("income" as const) : ("expense" as const),
        amount: r.amount,
        category: r.category,
        note: r.description,
        source,
      }))
    );
    setImported({
      count: chosen.length,
      skipped: rows.length - chosen.length,
      inflow: chosen.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0),
      outflow: chosen.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0),
    });
    setStep(4);
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPassword("");
    setNeedPassword(false);
    setRows([]);
    setError(null);
    setStage("open");
  };

  if (!wallet) {
    navigation.goBack();
    return null;
  }

  const stageState = (s: ParseStage): "done" | "active" | "pending" => {
    const order: ParseStage[] = ["open", "format", "extract", "categorize", "done"];
    const cur = order.indexOf(stage);
    const idx = order.indexOf(s);
    if (idx < cur) return "done";
    if (idx === cur) return "active";
    return "pending";
  };

  return (
    <Screen>
      {/* Langkah 1 — pilih file */}
      {step === 1 && (
        <>
          <ScreenHeader title="Impor Mutasi PDF" />
          <StepBar step={1} />
          <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
            <WalletBadge name={wallet.name} template={wallet.template} type={wallet.type} size={40} />
            <View className="flex-1">
              <Text className="font-sans-semibold text-[15px] text-saldio-ink">{wallet.name}</Text>
              <Text className="mt-0.5 font-sans text-xs text-saldio-muted">
                Parser mutasi {parserLabel} akan digunakan
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          </View>

          <Pressable
            onPress={pickFile}
            className="mt-4 items-center rounded-3xl border-2 border-dashed border-saldio-blue/40 bg-white px-6 py-10 active:opacity-80"
          >
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-saldio-sky">
              <Ionicons name={file ? "document-text" : "cloud-upload"} size={28} color="#3D51E0" />
            </View>
            <Text className="mt-4 font-sans-semibold text-base text-saldio-ink">
              {file ? file.name : "Pilih file PDF mutasi"}
            </Text>
            <Text className="mt-1.5 text-center font-sans text-xs leading-4 text-saldio-muted">
              {file
                ? "Ketuk untuk mengganti file"
                : `e-Statement resmi dari aplikasi ${parserLabel}, maksimal 12 bulan terakhir`}
            </Text>
            {!file ? (
              <View className="mt-4 rounded-full bg-saldio-sky px-5 py-2.5">
                <Text className="font-sans-semibold text-sm text-saldio-blue">Telusuri File</Text>
              </View>
            ) : null}
          </Pressable>

          <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-saldio-gold-bg p-4">
            <Ionicons name="shield-checkmark" size={16} color="#B08415" />
            <Text className="flex-1 font-sans text-xs leading-4 text-saldio-gold-ink">
              File diproses di perangkat kamu, lalu disimpan ke Google Drive milikmu. Saldio tidak
              punya server sendiri.
            </Text>
          </View>

          {error ? (
            <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-saldio-red-bg p-4">
              <Ionicons name="alert-circle" size={16} color="#E23B3B" />
              <Text className="flex-1 font-sans text-xs leading-4 text-saldio-red">{error}</Text>
            </View>
          ) : null}

          {needPassword ? (
            <View className="mt-4 rounded-2xl bg-white px-4 py-3">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="lock-closed" size={12} color="#3D51E0" />
                <Text className="font-sans text-xs text-saldio-blue">Password PDF</Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password dari bank"
                placeholderTextColor="#8A94A6"
                secureTextEntry
                autoCapitalize="none"
                className="mt-1 font-mono-medium text-base text-saldio-ink"
              />
            </View>
          ) : null}

          <View className="mt-6">
            <PrimaryButton label="Lanjut" onPress={startParse} disabled={!file} />
          </View>
        </>
      )}

      {/* Langkah 2 — membaca */}
      {step === 2 && (
        <>
          <StepBar step={2} />
          <View className="items-center py-16">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-saldio-sky">
              <ActivityIndicator size="large" color="#3D51E0" />
            </View>
            <Text className="mt-6 font-sans-bold text-xl text-saldio-ink">Membaca mutasi…</Text>
            <Text className="mt-2 font-sans text-sm text-saldio-muted">{file?.name}</Text>
            <Text className="mt-1 font-sans text-xs text-saldio-muted">
              Parser {parserLabel}
              {pageCount > 0 ? ` · ${pageCount} halaman` : ""}
            </Text>
            <View className="mt-8 self-stretch rounded-3xl bg-white p-5">
              <StageRow label="Membuka dokumen" state={stageState("open")} />
              <StageRow label={`Mengenali format ${parserLabel}`} state={stageState("format")} />
              <StageRow label="Mengekstrak transaksi…" state={stageState("extract")} />
              <StageRow label="Menebak kategori" state={stageState("categorize")} />
            </View>
            <Pressable onPress={reset} className="mt-8 active:opacity-70">
              <Text className="font-sans-medium text-sm text-saldio-muted">Batalkan</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Langkah 3 — tinjau */}
      {step === 3 && (
        <>
          <ScreenHeader title="Tinjau Transaksi" onBack={reset} />
          <Text className="-mt-3 mb-4 font-sans text-sm text-saldio-muted">
            {selectedCount} dipilih dari {rows.length} hasil ekstraksi
          </Text>
          <StepBar step={3} />
          <View className="gap-3">
            {rows.map((r) => {
              const cat = categoryByKey(r.category);
              return (
                <Pressable
                  key={r.key}
                  onPress={() =>
                    setRows((prev) =>
                      prev.map((x) => (x.key === r.key ? { ...x, selected: !x.selected } : x))
                    )
                  }
                  className={`rounded-2xl p-4 active:opacity-80 ${
                    r.duplicate && !r.selected
                      ? "border border-saldio-gold/50 bg-saldio-gold-bg"
                      : "bg-white"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md ${
                        r.selected ? "bg-saldio-blue" : "border-2 border-saldio-border bg-white"
                      }`}
                    >
                      {r.selected ? <Ionicons name="checkmark" size={14} color="white" /> : null}
                    </View>
                    <Text
                      className="flex-1 font-sans-semibold text-[13px] text-saldio-ink"
                      numberOfLines={1}
                    >
                      {r.description}
                    </Text>
                    <Text
                      className={`font-mono-semibold text-[13px] ${
                        r.direction === "in" ? "text-saldio-green" : "text-saldio-red"
                      }`}
                    >
                      {formatSignedRupiah(r.direction === "in" ? r.amount : -r.amount)}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row items-center gap-2 pl-9">
                    <Text className="font-sans text-xs text-saldio-muted">
                      {formatShortDate(r.date)}
                    </Text>
                    {r.duplicate ? (
                      <View className="flex-row items-center gap-1 rounded-md bg-saldio-gold/20 px-2 py-0.5">
                        <Ionicons name="warning" size={10} color="#8A6A10" />
                        <Text className="font-sans-medium text-[10px] text-saldio-gold-ink">
                          Kemungkinan duplikat
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setEditingKey(r.key)}
                        className="flex-row items-center gap-1 rounded-md px-2 py-0.5"
                        style={{ backgroundColor: cat.background }}
                      >
                        <Text className="font-sans-medium text-[10px]" style={{ color: cat.color }}>
                          {cat.label}
                        </Text>
                        <Ionicons name="pencil" size={9} color={cat.color} />
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-6">
            <PrimaryButton
              label={`Impor ${selectedCount} Transaksi`}
              onPress={doImport}
              disabled={selectedCount === 0}
            />
          </View>
        </>
      )}

      {/* Langkah 4 — selesai */}
      {step === 4 && (
        <>
          <StepBar step={4} />
          <View className="items-center pt-12">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-saldio-green-bg">
              <Ionicons name="checkmark" size={44} color="#16A34A" />
            </View>
            <Text className="mt-6 font-sans-bold text-2xl text-saldio-ink">
              {imported.count} transaksi diimpor
            </Text>
            <Text className="mt-2 text-center font-sans text-sm leading-5 text-saldio-muted">
              Berhasil ditambahkan ke <Text className="font-sans-bold">{wallet.name}</Text>.
              {imported.skipped > 0 ? `\n${imported.skipped} transaksi dilewati.` : ""}
            </Text>

            <View className="mt-8 self-stretch rounded-3xl bg-white p-5">
              <View className="flex-row justify-between py-1.5">
                <Text className="font-sans text-sm text-saldio-soft">Pemasukan</Text>
                <Text className="font-mono-semibold text-sm text-saldio-green">
                  {formatSignedRupiah(imported.inflow)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="font-sans text-sm text-saldio-soft">Pengeluaran</Text>
                <Text className="font-mono-semibold text-sm text-saldio-red">
                  {formatSignedRupiah(-imported.outflow)}
                </Text>
              </View>
              <View className="my-2 h-px bg-saldio-border" />
              <View className="flex-row justify-between py-1.5">
                <Text className="font-sans-semibold text-sm text-saldio-ink">
                  Saldo {wallet.name} kini
                </Text>
                <Text className="font-mono-bold text-sm text-saldio-ink">
                  {formatRupiah(walletBalance(data, wallet))}
                </Text>
              </View>
            </View>

            <View className="mt-8 self-stretch">
              <PrimaryButton label="Lihat Dompet" onPress={() => navigation.goBack()} />
            </View>
            <Pressable onPress={reset} className="mt-4 active:opacity-70">
              <Text className="font-sans-semibold text-sm text-saldio-blue">Impor PDF Lain</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Modal ganti kategori */}
      <Modal
        visible={editingKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingKey(null)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/40 px-8"
          onPress={() => setEditingKey(null)}
        >
          <View className="rounded-3xl bg-white p-4">
            <Text className="mb-2 px-2 font-sans-bold text-base text-saldio-ink">
              Pilih kategori
            </Text>
            {CATEGORIES.filter((c) => c.key !== "Emas").map((c) => (
              <Pressable
                key={c.key}
                onPress={() => {
                  setRows((prev) =>
                    prev.map((x) => (x.key === editingKey ? { ...x, category: c.key } : x))
                  );
                  setEditingKey(null);
                }}
                className="flex-row items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-saldio-bg"
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: c.background }}
                >
                  <Ionicons name={c.icon as never} size={15} color={c.color} />
                </View>
                <Text className="font-sans-semibold text-sm text-saldio-ink">{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
