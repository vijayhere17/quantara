import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  activatePackage,
  createUsersBatch,
  getSignerFor,
  increaseTime,
  useContracts,
  useTxRunner,
  walletFromIndex,
  resolveUserSigner,
} from "@/hooks/useContracts";
import { sleep } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import type { Contract } from "ethers";

export function DemoPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const users = useDashboardStore((s) => s.users);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const setDemoRunning = useDashboardStore((s) => s.setDemoRunning);
  const demoRunning = useDashboardStore((s) => s.demoRunning);
  const addLog = useDashboardStore((s) => s.addLog);
  const busy = useDashboardStore((s) => s.busy);

  const step = async (msg: string) => {
    addLog("info", msg);
    await sleep(400);
  };

  const runDemo = async () => {
    setDemoRunning(true);
    try {
      await run("One-click demo", async (c) => {
        await step("Demo: create 7-user tree under Root");
        const root = c.addresses.RootUser;
        const start =
          users.length === 0 ? 1 : Math.max(...users.map((u) => u.id), 0) + 1;

        // Root → 2 directs → each gets 2 → then 1 more = 7 new users
        const level1 = await createUsersBatch(c, 2, start, root, upsertUser);
        await step(`Registered L1: ${level1.length}`);
        const level2a = await createUsersBatch(
          c,
          2,
          start + 2,
          level1[0],
          upsertUser,
        );
        await step(`Registered under L1[0]: ${level2a.length}`);
        const level2b = await createUsersBatch(
          c,
          2,
          start + 4,
          level1[1],
          upsertUser,
        );
        await step(`Registered under L1[1]: ${level2b.length}`);
        const level3 = await createUsersBatch(
          c,
          1,
          start + 6,
          level2a[0],
          upsertUser,
        );
        await step(`Registered deep leaf: ${level3.length}`);

        const all = [...level1, ...level2a, ...level2b, ...level3];
        setSelectedUser(level1[0]);

        await step("Activate $50 on first few users");
        for (const addr of all.slice(0, 4)) {
          const tracked = useDashboardStore
            .getState()
            .users.find((u) => u.address.toLowerCase() === addr.toLowerCase());
          if (!tracked) continue;
          const signer = await resolveUserSigner(c, tracked.address, tracked.walletIndex);
          try {
            await activatePackage(c, signer, 50);
            await step(`Activated $50 on ${addr.slice(0, 10)}…`);
          } catch (e) {
            addLog("warn", "Activate skipped", String(e).slice(0, 120));
            await sleep(400);
          }
        }

        await step("Time travel +1 day");
        await increaseTime(c.provider, 24 * 60 * 60);

        await step("Claim ROI on first activated user");
        const claimer = all[0];
        const tracked = useDashboardStore
          .getState()
          .users.find((u) => u.address.toLowerCase() === claimer.toLowerCase());
        try {
          const signer =
            tracked?.walletIndex != null
              ? await resolveUserSigner(c, tracked.address, tracked.walletIndex)
              : await getSignerFor(c, claimer);
          const roi = c.roi.connect(signer) as Contract;
          const tx = await roi.claimRoi();
          await tx.wait();
          await step(`Claimed ROI tx ${tx.hash.slice(0, 12)}…`);
        } catch (e) {
          addLog("warn", "ROI claim skipped (may need accrual)", String(e).slice(0, 160));
          await sleep(400);
        }

        await step("Demo complete");
        return { result: true };
      });
    } finally {
      setDemoRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Demo</h2>
        <p className="text-xs text-muted">
          One-click walkthrough with animated log steps (sleep 400ms)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scripted QA demo</CardTitle>
          <CardDescription>
            Create 7-user tree → activate $50 on a few → +1 day → claim ROI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
            <li>Register 7 users in a small referral tree under Root</li>
            <li>Activate $50 packages on the first few</li>
            <li>Increase time by 1 day</li>
            <li>Claim Self ROI on the first activated user</li>
            <li>Each step is logged with a short pause for visibility</li>
          </ol>
          <Button
            disabled={!contracts || busy || demoRunning}
            onClick={() => void runDemo()}
          >
            {demoRunning ? "Demo running…" : "Run one-click demo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
