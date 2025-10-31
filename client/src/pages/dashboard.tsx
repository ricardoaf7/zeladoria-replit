import { useState, useRef, useEffect } from "react";
import { DashboardMap } from "@/components/DashboardMap";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import type { ServiceArea, Team, AppConfig } from "@shared/schema";
import L from "leaflet";

export default function Dashboard() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [selectedService, setSelectedService] = useState<string>('rocagem');
  const mapRef = useRef<L.Map | null>(null);

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

  useEffect(() => {
    if (selectedArea && mapRef.current) {
      const lat = selectedArea.lat;
      const lng = selectedArea.lng;
      
      if (lat && lng) {
        mapRef.current.panTo([lat, lng], { animate: true });
        if (selectedArea.polygon) {
          mapRef.current.setZoom(16);
        }
      }
    }
  }, [selectedArea]);

  const style = {
    "--sidebar-width": "22rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleAreaClick = (area: ServiceArea) => {
    setSelectedArea(area);
  };

  const handleAreaUpdate = (updatedArea: ServiceArea) => {
    setSelectedArea(updatedArea);
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          selectedArea={selectedArea}
          onAreaClose={() => setSelectedArea(null)}
          onAreaUpdate={handleAreaUpdate}
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
              layerFilters={{
                rocagemLote1: selectedService === 'rocagem',
                rocagemLote2: selectedService === 'rocagem',
                jardins: selectedService === 'jardins',
                teamsGiroZero: true,
                teamsAcabamento: true,
                teamsColeta: true,
                teamsTouceiras: true,
              }}
              onAreaClick={handleAreaClick}
              mapRef={mapRef}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
