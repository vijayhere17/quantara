import { Toaster } from "sonner";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { UsersPanel } from "@/components/panels/UsersPanel";
import { TreePanel } from "@/components/panels/TreePanel";
import { PackagesPanel } from "@/components/panels/PackagesPanel";
import { IncomePanel } from "@/components/panels/IncomePanel";
import { ReportsPanel } from "@/components/panels/ReportsPanel";
import { DeveloperPanel } from "@/components/panels/DeveloperPanel";
import { UserDetailsModal } from "@/components/users/UserDetailsModal";
import { useBootstrap } from "@/hooks/useContracts";
import { useDashboardStore } from "@/store/dashboardStore";
import { NETWORK_NAME } from "@/lib/constants";

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
      case "packages":
        return <PackagesPanel />;
      case "income":
        return <IncomePanel />;
      case "tree":
        return <TreePanel />;
      case "reports":
        return <ReportsPanel />;
      case "developer":
        return <DeveloperPanel />;
      default:
        return <OverviewPanel />;
    }
  })();

  return (
    <>
      <DashboardShell
        connected={Boolean(contracts)}
        error={connecting ? `Connecting to ${NETWORK_NAME}…` : connectionError}
      >
        <div className="animate-fade-up">{panel}</div>
      </DashboardShell>
      <UserDetailsModal />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </>
  );
}
