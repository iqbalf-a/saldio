import { formatCompactRupiah } from "./format";

test("formatCompactRupiah abbreviates millions as 'jt'", () => {
  expect(formatCompactRupiah(8450000)).toBe("8,5jt");
});

test("formatCompactRupiah abbreviates thousands as 'rb'", () => {
  expect(formatCompactRupiah(150000)).toBe("150rb");
});

test("formatCompactRupiah keeps small amounts as-is", () => {
  expect(formatCompactRupiah(500)).toBe("500");
});

test("formatCompactRupiah preserves sign", () => {
  expect(formatCompactRupiah(-150000)).toBe("-150rb");
});
