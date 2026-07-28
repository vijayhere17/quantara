import { Toaster } from "sonner";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { UsersPanel } from "@/components/panels/UsersPanel";
import { TreePanel } from "@/components/panels/TreePanel";
import { PackagesPanel } from "@/components/panels/PackagesPanel";
import { RoiPanel } from "@/components/panels/RoiPanel";
import { IncomePanel } from "@/components/panels/IncomePanel";
import { RankPanel } from "@/components/panels/RankPanel";
import { GrowthAcceleratorPanel } from "@/components/panels/GrowthAcceleratorPanel";
import { TierBoosterPanel } from "@/components/panels/TierBoosterPanel";
import { CommunityPanel } from "@/components/panels/CommunityPanel";
import { RecyclingPanel } from "@/components/panels/RecyclingPanel";
import { EventsPanel } from "@/components/panels/EventsPanel";
import { TransactionsPanel } from "@/components/panels/TransactionsPanel";
import { ReportsPanel } from "@/components/panels/ReportsPanel";
import { TimeTravelPanel } from "@/components/panels/TimeTravelPanel";
import { DemoPanel } from "@/components/panels/DemoPanel";
import { ResetPanel } from "@/components/panels/ResetPanel";
import { LogsPanel } from "@/components/panels/LogsPanel";
import { DevPanel } from "@/components/panels/DevPanel";
import { useBootstrap } from "@/hooks/useContracts";
import { useDashboardStore } from "@/store/dashboardStore";

export default function App() {
  useBootstrap();
  const tab = useDashboardStore((s) => s.tab);
  const contracts = useDashboardStore((s) => s.contracts);
  const connecting = useDashboardStore((s) => s.connecting);
  const connectionError = useDashboardStore((s) => s.connectionError);

  const panel = (() => {
    switch (tab) {
      case "overview":
        return <OverviewPanel />;
      case "users":
        return <UsersPanel />;
      case "tree":
        return <TreePanel />;
      case "packages":
        return <PackagesPanel />;
      case "roi":
        return <RoiPanel />;
      case "income":
        return <IncomePanel />;
      case "rank":
        return <RankPanel />;
      case "ga":
        return <GrowthAcceleratorPanel />;
      case "tier":
        return <TierBoosterPanel />;
      case "community":
        return <CommunityPanel />;
      case "recycling":
        return <RecyclingPanel />;
      case "events":
        return <EventsPanel />;
      case "txs":
        return <TransactionsPanel />;
      case "reports":
        return <ReportsPanel />;
      case "timetravel":
        return <TimeTravelPanel />;
      case "demo":
        return <DemoPanel />;
      case "reset":
        return <ResetPanel />;
      case "logs":
        return <LogsPanel />;
      case "dev":
        return <DevPanel />;
      default:
        return <OverviewPanel />;
    }
  })();

  return (
    <>
      <DashboardShell
        connected={Boolean(contracts)}
        error={
          connecting
            ? "Connecting to Hardhat…"
            : connectionError
        }
      >
        <div className="animate-fade-up">{panel}</div>
      </DashboardShell>
      <Toaster
        theme="dark"
        position="bottom-right"
        richColors
        closeButton
      />
    </>
  );
}
