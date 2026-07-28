import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useContracts, useTxRunner } from "@/hooks/useContracts";
import { useDashboardStore } from "@/store/dashboardStore";

const SNAPSHOT_KEY = "quantara-evm-snapshot";

export function ResetPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const resetLocal = useDashboardStore((s) => s.resetLocal);
  const setUsers = useDashboardStore((s) => s.setUsers);
  const clearLogs = useDashboardStore((s) => s.clearLogs);
  const clearTxs = useDashboardStore((s) => s.clearTxs);
  const addLog = useDashboardStore((s) => s.addLog);
  const busy = useDashboardStore((s) => s.busy);
  const users = useDashboardStore((s) => s.users);
  const contractsStore = useDashboardStore((s) => s.contracts);

  const onResetLocal = () => {
    if (!window.confirm("Reset local dashboard state (users, logs, txs)?"))
      return;
    resetLocal();
    addLog("warn", "Local dashboard reset");
  };

  const onResetUsers = () => {
    if (!window.confirm("Clear selected/tracked users list?")) return;
    const root = contractsStore?.addresses.RootUser;
    setUsers(
      root
        ? [
            {
              id: 0,
              address: root,
              walletIndex: 0,
              label: "Root",
              createdAt: Date.now(),
            },
          ]
        : [],
    );
    addLog("warn", "Users list reset", root ? "Root retained" : undefined);
  };

  const onClearLogsTxs = () => {
    if (!window.confirm("Clear logs and transactions?")) return;
    clearLogs();
    clearTxs();
    addLog("info", "Logs and txs cleared");
  };

  const onTakeSnapshot = async () => {
    await run("evm_snapshot", async (c) => {
      const id = await c.provider.send("evm_snapshot", []);
      sessionStorage.setItem(SNAPSHOT_KEY, String(id));
      addLog("ok", "Snapshot saved", String(id));
      return { result: id };
    });
  };

  const onRevertSnapshot = async () => {
    const id = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!id) {
      addLog(
        "warn",
        "No snapshot id in sessionStorage — redeploy contracts or take a snapshot first",
      );
      window.alert(
        "No snapshot id found. Take a snapshot first, or redeploy Hardhat contracts.",
      );
      return;
    }
    if (!window.confirm(`Revert blockchain to snapshot ${id}?`)) return;
    await run("evm_revert", async (c) => {
      await c.provider.send("evm_revert", [id]);
      sessionStorage.removeItem(SNAPSHOT_KEY);
      // snapshot ids are one-shot; take a fresh one
      try {
        const fresh = await c.provider.send("evm_snapshot", []);
        sessionStorage.setItem(SNAPSHOT_KEY, String(fresh));
      } catch {
        /* */
      }
      addLog("warn", "Chain reverted to snapshot", id);
      return { result: true };
    });
  };

  const onHardhatReset = async () => {
    if (
      !window.confirm(
        "Try provider.send('hardhat_reset')? This may wipe the node; you will need to redeploy.",
      )
    )
      return;
    await run("hardhat_reset", async (c) => {
      try {
        await c.provider.send("hardhat_reset", []);
        addLog("warn", "hardhat_reset succeeded — redeploy contracts");
      } catch (e) {
        addLog(
          "error",
          "hardhat_reset unavailable",
          String(e).slice(0, 200) + " — restart node and redeploy",
        );
        throw e;
      }
      return { result: true };
    });
  };

  const onCompleteReset = () => {
    if (
      !window.confirm(
        "Complete System Reset: clear local state and recommend redeploy?",
      )
    )
      return;
    resetLocal();
    sessionStorage.removeItem(SNAPSHOT_KEY);
    addLog(
      "warn",
      "Complete System Reset (local)",
      "Restart Hardhat node and run npm run deploy to reset on-chain state",
    );
    window.alert(
      "Local state cleared. Restart the Hardhat node and redeploy contracts for a full chain reset.",
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Reset</h2>
        <p className="text-xs text-muted">
          Destructive actions require confirmation · {users.length} tracked users
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Local dashboard</CardTitle>
            <CardDescription>Browser / Zustand only</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={busy} onClick={onResetLocal}>
              Reset local dashboard
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onResetUsers}>
              Reset users list
            </Button>
            <Button variant="outline" disabled={busy} onClick={onClearLogsTxs}>
              Clear logs / txs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blockchain</CardTitle>
            <CardDescription>Hardhat snapshot / reset</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              disabled={!contracts || busy}
              onClick={() => void onTakeSnapshot()}
            >
              Take snapshot
            </Button>
            <Button
              variant="secondary"
              disabled={!contracts || busy}
              onClick={() => void onRevertSnapshot()}
            >
              evm_revert
            </Button>
            <Button
              variant="danger"
              disabled={!contracts || busy}
              onClick={() => void onHardhatReset()}
            >
              hardhat_reset
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Complete System Reset</CardTitle>
            <CardDescription>
              Local wipe + instruct redeploy for clean chain state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" disabled={busy} onClick={onCompleteReset}>
              Complete System Reset
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
