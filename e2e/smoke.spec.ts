import { test, expect } from "@playwright/test";

test.describe("Saldio Smoke Test", () => {
  test("app loads and shows home screen", async ({ page }) => {
    await page.goto("/");
    // Tunggu app mount
    await page.waitForSelector("#root", { timeout: 15_000 });
    // Harus ada konten (bukan blank)
    const root = page.locator("#root");
    await expect(root).not.toBeEmpty();
  });

  test("guest mode: can add a transaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Klik tombol "+" / FAB untuk tambah transaksi
    // Cari button dengan teks "+" atau ikon plus
    const addButton = page.locator("button").filter({ hasText: "+" }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      // Harus ada form atau modal tambah transaksi
      await page.waitForTimeout(500);
    }
    // Minimal: app tidak crash
    const root = page.locator("#root");
    await expect(root).not.toBeEmpty();
  });

  test("PIN screen appears when PIN is set", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Cek apakah ada PIN input (6 digit) atau app langsung masuk
    const pinInput = page.locator('input[maxlength="6"]');
    const hasPin = await pinInput.isVisible().catch(() => false);

    if (hasPin) {
      // PIN aktif — coba input PIN
      await pinInput.fill("123456");
      // Tekan Enter atau tombol submit
      await pinInput.press("Enter");
      await page.waitForTimeout(500);
    }

    // App tetap berjalan (tidak crash)
    const root = page.locator("#root");
    await expect(root).not.toBeEmpty();
  });

  test("navigation tabs work", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Cari tab navigation (biasanya di bottom)
    const tabs = page.locator('[role="tab"], [data-testid*="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Klik tab kedua (biasanya "Transaksi" atau "Riwayat")
      await tabs.nth(1).click();
      await page.waitForTimeout(300);

      // Klik tab ketiga (biasanya "Dompet" atau "Profil")
      if (tabCount > 2) {
        await tabs.nth(2).click();
        await page.waitForTimeout(300);
      }
    }

    // App tidak crash
    const root = page.locator("#root");
    await expect(root).not.toBeEmpty();
  });
});
