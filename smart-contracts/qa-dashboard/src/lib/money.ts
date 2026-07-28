import { Contract, formatUnits } from "ethers";
import type { Contracts } from "@/lib/contracts";

/** BTC price from feed (e.g. 60000). */
export async function getBtcUsdPrice(c: Contracts): Promise<number> {
  try {
    const feedAddr: string = await c.core.btcPriceFeed();
    const feed = new Contract(
      feedAddr,
      ["function getBTCPrice() view returns (int256)"],
      c.provider,
    );
    const p: bigint = await feed.getBTCPrice();
    return Number(p);
  } catch {
    return 60000;
  }
}

export async function getTokenDecimals(c: Contracts): Promise<number> {
  try {
    return Number(await c.token.decimals());
  } catch {
    return 18;
  }
}

/** token wei → USD using core price formula inverse */
export function tokenWeiToUsd(
  wei: bigint,
  btcPrice: number,
  decimals = 18,
): number {
  if (btcPrice <= 0) return 0;
  const token = Number(formatUnits(wei, decimals));
  return token * btcPrice;
}

export function fmtTokenAmt(wei: bigint, decimals = 18, digits = 6): string {
  const n = Number(formatUnits(wei, decimals));
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(2);
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function fmtUsdAmt(usd: number, digits = 2): string {
  if (!Number.isFinite(usd)) return "$0";
  return `$${usd.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}`;
}

export type DualAmount = {
  wei: bigint;
  token: string;
  usd: string;
  usdNumber: number;
  label: string; // "0.000833 BTCB · $50.00"
};

export function toDual(
  wei: bigint,
  btcPrice: number,
  decimals = 18,
  tokenSymbol = "BTCB",
): DualAmount {
  const usdNumber = tokenWeiToUsd(wei, btcPrice, decimals);
  const token = fmtTokenAmt(wei, decimals);
  const usd = fmtUsdAmt(usdNumber);
  return {
    wei,
    token,
    usd,
    usdNumber,
    label: `${token} ${tokenSymbol} · ${usd}`,
  };
}

export async function dualFromContracts(
  c: Contracts,
  wei: bigint,
): Promise<DualAmount> {
  const [price, decimals, symbol] = await Promise.all([
    getBtcUsdPrice(c),
    getTokenDecimals(c),
    c.token.symbol().catch(() => "BTCB"),
  ]);
  return toDual(wei, price, decimals, String(symbol));
}
