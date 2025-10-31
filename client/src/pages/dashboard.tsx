import { useState } from "react";
import { DashboardMap } from "@/components/DashboardMap";
import { AppSidebar } from "@/components/AppSidebar";
import { AreaDetailsModal } from "@/components/AreaDetailsModal";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import type { ServiceArea, Team, AppConfig } from "@shared/schema";

export default function Dashboard() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [layerFilters, setLayerFilters] = useState({
    rocagemLote1: true,
    rocagemLote2: true,
    jardins: true,
    teamsGiroZero: true,
    teamsAcabamento: true,
    teamsColeta: true,
    teamsTouceiras: true,
  });

  const { data: rocagemAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/rocagem"],
  });

  const { data: jardinsAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/jardins"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          layerFilters={layerFilters}
          onLayerFilterChange={setLayerFilters}
          config={config}
        />
        
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="flex items-center h-14 px-4 border-b border-sidebar-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="h-[calc(100vh-3.5rem)] overflow-hidden">
            <DashboardMap
              rocagemAreas={rocagemAreas}
              jardinsAreas={jardinsAreas}
              teams={teams}
              layerFilters={layerFilters}
              onAreaClick={setSelectedArea}
            />
          </main>
        </SidebarInset>

        {selectedArea && (
          <AreaDetailsModal
            area={selectedArea}
            teams={teams}
            onClose={() => setSelectedArea(null)}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
