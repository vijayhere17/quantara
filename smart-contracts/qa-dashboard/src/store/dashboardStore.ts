import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardTab } from "@/lib/constants";
import type { Contracts } from "@/lib/contracts";

export type UiMode = "client" | "developer";

export type LogLevel = "info" | "ok" | "warn" | "error";

export type AppLog = {
  id: string;
  at: number;
  level: LogLevel;
  message: string;
  detail?: string;
};

export type TxRecord = {
  id: string;
  hash: string;
  method: string;
  status: "success" | "failed" | "pending";
  gasUsed?: string;
  timestamp: number;
  from?: string;
  to?: string;
  params?: string;
  error?: string;
};

export type TrackedUser = {
  id: number;
  address: string;
  walletIndex?: number;
  label?: string;
  sponsor?: string;
  createdAt: number;
};

export type SessionSnapshot = {
  savedAt: string;
  users: TrackedUser[];
  selectedUser?: string;
  notes?: string;
};

type DashboardState = {
  mode: UiMode;
  tab: DashboardTab;
  contracts: Contracts | null;
  connecting: boolean;
  connectionError?: string;
  refreshTick: number;
  selectedUser?: string;
  detailsUser?: string;
  users: TrackedUser[];
  logs: AppLog[];
  txs: TxRecord[];
  lastDistribution?: import("@/lib/distribution").ActivationDistribution;
  busy: boolean;
  busyLabel?: string;
  demoRunning: boolean;

  setMode: (mode: UiMode) => void;
  setTab: (tab: DashboardTab) => void;
  setContracts: (c: Contracts | null) => void;
  setConnecting: (v: boolean, err?: string) => void;
  bumpRefresh: () => void;
  setSelectedUser: (addr?: string) => void;
  setDetailsUser: (addr?: string) => void;
  setUsers: (users: TrackedUser[]) => void;
  upsertUser: (user: TrackedUser) => void;
  upsertUsers: (users: TrackedUser[]) => void;
  removeUser: (address: string) => void;
  addLog: (level: LogLevel, message: string, detail?: string) => void;
  clearLogs: () => void;
  addTx: (tx: TxRecord) => void;
  clearTxs: () => void;
  setLastDistribution: (
    d?: import("@/lib/distribution").ActivationDistribution,
  ) => void;
  setBusy: (busy: boolean, label?: string) => void;
  setDemoRunning: (v: boolean) => void;
  exportSession: () => SessionSnapshot;
  importSession: (s: SessionSnapshot) => void;
  resetLocal: () => void;
  /** Wipe tracked users except Root; clear distribution/logs/txs. Returns removed count. */
  resetKeepRoot: (rootAddress: string) => number;
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      mode: "client",
      tab: "overview",
      contracts: null,
      connecting: false,
      refreshTick: 0,
      users: [],
      logs: [],
      txs: [],
      busy: false,
      demoRunning: false,

      setMode: (mode) => set({ mode }),
      setTab: (tab) => set({ tab }),
      setContracts: (contracts) => set({ contracts }),
      setConnecting: (connecting, connectionError) =>
        set({ connecting, connectionError }),
      bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
      setSelectedUser: (selectedUser) => set({ selectedUser }),
      setDetailsUser: (detailsUser) => set({ detailsUser }),
      setUsers: (users) => set({ users }),
      upsertUser: (user) =>
        set((s) => {
          const rest = s.users.filter(
            (u) => u.address.toLowerCase() !== user.address.toLowerCase(),
          );
          return { users: [...rest, user].sort((a, b) => a.id - b.id) };
        }),
      upsertUsers: (incoming) =>
        set((s) => {
          const byAddr = new Map(
            s.users.map((u) => [u.address.toLowerCase(), u] as const),
          );
          for (const user of incoming) {
            byAddr.set(user.address.toLowerCase(), user);
          }
          return {
            users: [...byAddr.values()].sort((a, b) => a.id - b.id),
          };
        }),
      removeUser: (address) =>
        set((s) => ({
          users: s.users.filter(
            (u) => u.address.toLowerCase() !== address.toLowerCase(),
          ),
          selectedUser:
            s.selectedUser?.toLowerCase() === address.toLowerCase()
              ? undefined
              : s.selectedUser,
          detailsUser:
            s.detailsUser?.toLowerCase() === address.toLowerCase()
              ? undefined
              : s.detailsUser,
        })),
      addLog: (level, message, detail) =>
        set((s) => ({
          logs: [
            {
              id: `${Date.now()}-${Math.random()}`,
              at: Date.now(),
              level,
              message,
              detail,
            },
            ...s.logs,
          ].slice(0, 500),
        })),
      clearLogs: () => set({ logs: [] }),
      addTx: (tx) =>
        set((s) => ({ txs: [tx, ...s.txs].slice(0, 300) })),
      clearTxs: () => set({ txs: [] }),
      setLastDistribution: (lastDistribution) => set({ lastDistribution }),
      setBusy: (busy, busyLabel) => set({ busy, busyLabel }),
      setDemoRunning: (demoRunning) => set({ demoRunning }),
      exportSession: () => ({
        savedAt: new Date().toISOString(),
        users: get().users,
        selectedUser: get().selectedUser,
      }),
      importSession: (s) =>
        set({
          users: s.users || [],
          selectedUser: s.selectedUser,
        }),
      resetLocal: () =>
        set({
          users: [],
          selectedUser: undefined,
          detailsUser: undefined,
          lastDistribution: undefined,
          logs: [],
          txs: [],
          refreshTick: get().refreshTick + 1,
        }),
      resetKeepRoot: (rootAddress: string) => {
        const before = get().users.length;
        const root = get().users.find(
          (u) => u.address.toLowerCase() === rootAddress.toLowerCase(),
        ) || {
          id: 0,
          address: rootAddress,
          walletIndex: 0,
          label: "Root",
          createdAt: Date.now(),
        };
        set({
          users: [
            {
              ...root,
              id: 0,
              label: root.label || "Root",
              walletIndex: root.walletIndex ?? 0,
            },
          ],
          selectedUser: root.address,
          detailsUser: undefined,
          lastDistribution: undefined,
          logs: [],
          txs: [],
          refreshTick: get().refreshTick + 1,
        });
        return Math.max(0, before - 1);
      },
    }),
    {
      name: "quantara-qa-dashboard",
      partialize: (s) => ({
        mode: s.mode,
        tab: s.tab,
        users: s.users,
        selectedUser: s.selectedUser,
        logs: s.logs.slice(0, 100),
        txs: s.txs.slice(0, 100),
      }),
    },
  ),
);
