import { useState, useRef, useEffect, useMemo } from "react";
import { DashboardMap } from "@/components/DashboardMap";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import type { ServiceArea, Team, AppConfig } from "@shared/schema";
import type { FilterCriteria } from "@/components/FilterPanel";
import L from "leaflet";

export default function Dashboard() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [selectedService, setSelectedService] = useState<string>('rocagem');
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterCriteria>({
    search: "",
    bairro: "all",
    lote: "all",
    status: "all",
    tipo: "all",
  });
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

  // Filtrar áreas baseado nos critérios
  const filteredRocagemAreas = useMemo(() => {
    if (!filters.search && 
        (!filters.bairro || filters.bairro === "all") && 
        (!filters.lote || filters.lote === "all") && 
        (!filters.status || filters.status === "all") && 
        (!filters.tipo || filters.tipo === "all")) {
      return rocagemAreas;
    }

    return rocagemAreas.filter(area => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const endereco = area.endereco?.toLowerCase() || "";
        const bairro = area.bairro?.toLowerCase() || "";
        if (!endereco.includes(searchLower) && !bairro.includes(searchLower)) {
          return false;
        }
      }

      if (filters.bairro && filters.bairro !== "all" && area.bairro !== filters.bairro) return false;
      if (filters.lote && filters.lote !== "all" && area.lote?.toString() !== filters.lote) return false;
      if (filters.status && filters.status !== "all" && area.status !== filters.status) return false;
      if (filters.tipo && filters.tipo !== "all" && area.tipo !== filters.tipo) return false;

      return true;
    });
  }, [rocagemAreas, filters]);

  const hasActiveFilters = filters.search || 
    (filters.bairro && filters.bairro !== "all") || 
    (filters.lote && filters.lote !== "all") || 
    (filters.status && filters.status !== "all") || 
    (filters.tipo && filters.tipo !== "all");

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
    "--sidebar-width": "28rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleAreaClick = (area: ServiceArea) => {
    if (selectionMode) {
      setSelectedAreaIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(area.id)) {
          newSet.delete(area.id);
        } else {
          newSet.add(area.id);
        }
        return newSet;
      });
    } else {
      setSelectedArea(area);
    }
  };

  const handleAreaUpdate = (updatedArea: ServiceArea) => {
    setSelectedArea(updatedArea);
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedAreaIds(new Set());
    }
    setSelectedArea(null);
    setIsRegistrationMode(false);
  };

  const handleRegistrationModeChange = (isActive: boolean) => {
    setIsRegistrationMode(isActive);
    setSelectionMode(isActive);
    if (!isActive) {
      setSelectedAreaIds(new Set());
    }
    setSelectedArea(null);
  };

  const handleClearSelection = () => {
    setSelectedAreaIds(new Set());
  };

  return (
    <SidebarProvider 
      style={style as React.CSSProperties}
      defaultOpen={typeof window !== 'undefined' && window.innerWidth > 1024}
    >
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          selectedArea={selectedArea}
          onAreaClose={() => setSelectedArea(null)}
          onAreaUpdate={handleAreaUpdate}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          isRegistrationMode={isRegistrationMode}
          onRegistrationModeChange={handleRegistrationModeChange}
          selectedAreaIds={selectedAreaIds}
          onClearSelection={handleClearSelection}
          rocagemAreas={rocagemAreas}
          filters={filters}
          onFilterChange={setFilters}
          filteredCount={filteredRocagemAreas.length}
        />
        
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
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
                teamsCapina: true,
              }}
              onAreaClick={handleAreaClick}
              filteredAreaIds={hasActiveFilters ? new Set(filteredRocagemAreas.map(a => a.id)) : undefined}
              mapRef={mapRef}
              selectionMode={selectionMode}
              selectedAreaIds={selectedAreaIds}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
