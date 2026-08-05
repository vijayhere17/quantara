/**
 * Persist randomly generated QA wallets (BSC Testnet).
 * Hardhat mnemonic accounts must NOT be funded on public testnets.
 */
import { Wallet, type HDNodeWallet } from "ethers";

const STORAGE_KEY = "quantara_qa_session_wallets_v1";

type WalletMap = Record<string, string>; // address.lower → privateKey

function readMap(): WalletMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WalletMap;
  } catch {
    return {};
  }
}

function writeMap(map: WalletMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function rememberSessionWallet(address: string, privateKey: string) {
  const map = readMap();
  map[address.toLowerCase()] = privateKey;
  writeMap(map);
}

export function getSessionPrivateKey(address: string): string | null {
  const map = readMap();
  return map[address.toLowerCase()] || null;
}

export function createSessionWallet(): HDNodeWallet {
  const w = Wallet.createRandom();
  rememberSessionWallet(w.address, w.privateKey);
  return w;
}

export function listSessionAddresses(): string[] {
  return Object.keys(readMap());
}
