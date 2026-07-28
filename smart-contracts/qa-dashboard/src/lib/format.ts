import { formatUnits, parseUnits } from "ethers";

export function fmtToken(wei: bigint | number | string, decimals = 18, digits = 4) {
  try {
    const v = typeof wei === "bigint" ? wei : BigInt(wei);
    const n = Number(formatUnits(v, decimals));
    if (!Number.isFinite(n)) return String(wei);
    return n.toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  } catch {
    return String(wei);
  }
}

export function fmtUsd(n: bigint | number | string) {
  const v = typeof n === "bigint" ? Number(n) : Number(n);
  return `$${v.toLocaleString()}`;
}

export function toWei(amount: string | number, decimals = 18) {
  return parseUnits(String(amount), decimals);
}

export function fmtTs(sec: bigint | number) {
  const n = Number(sec);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString();
}

export function pctBps(bps: bigint | number) {
  return `${(Number(bps) / 100).toFixed(2)}%`;
}
