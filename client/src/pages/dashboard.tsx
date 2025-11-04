import { useState, useRef, useEffect, useMemo } from "react";
import { DashboardMap } from "@/components/DashboardMap";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapInfoCard } from "@/components/MapInfoCard";
import { QuickRegisterModal } from "@/components/QuickRegisterModal";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { BottomSheet, type BottomSheetState } from "@/components/BottomSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import type { ServiceArea, AppConfig } from "@shared/schema";
import type { FilterCriteria } from "@/components/FilterPanel";
import type { TimeRangeFilter } from "@/components/MapLegend";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import L from "leaflet";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showMapCard, setShowMapCard] = useState(false);
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<number>>(new Set());
  const [bottomSheetState, setBottomSheetState] = useState<BottomSheetState>("minimized");
  const [filters, setFilters] = useState<FilterCriteria>({
    search: "",
    bairro: "all",
    lote: "all",
    status: "all",
    tipo: "all",
  });
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>(null);
  const [customFilterDateRange, setCustomFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const mapRef = useRef<L.Map | null>(null);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
    // No mobile, não abrir automaticamente o BottomSheet
    // Deixar o usuário controlar via botão Menu
  };

  const { data: rocagemAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/rocagem"],
  });

  const { data: jardinsAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/jardins"],
  });

  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  // Função auxiliar para calcular dias ATÉ próxima previsão
  const getDaysUntilNextMowing = (area: ServiceArea): number => {
    if (!area.proximaPrevisao) return -1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(area.proximaPrevisao);
    nextDate.setHours(0, 0, 0, 0);
    
    return Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Filtrar áreas baseado nos critérios (incluindo filtro de tempo)
  const filteredRocagemAreas = useMemo(() => {
    let areas = rocagemAreas;

    // Aplicar filtro de tempo primeiro
    if (timeRangeFilter) {
      areas = areas.filter(area => {
        // Filtro "Executando" - apenas áreas com status "Em Execução"
        if (timeRangeFilter === 'executing') {
          return area.status === 'Em Execução';
        }

        // Para outros filtros, calcular dias até próxima previsão
        const days = getDaysUntilNextMowing(area);
        
        // Se não tem previsão, não mostra em nenhum filtro de tempo
        if (days === -1) return false;

        switch (timeRangeFilter) {
          case '0-5':
            return days >= 0 && days <= 5;
          case '6-15':
            return days > 5 && days <= 15;
          case '16-25':
            return days > 15 && days <= 25;
          case '26-40':
            return days > 25 && days <= 40;
          case '41-45':
            return days > 40 && days <= 45;
          case 'custom':
            // Filtro por range de datas
            if (!customFilterDateRange.from || !customFilterDateRange.to || !area.proximaPrevisao) return false;
            const fromDate = new Date(customFilterDateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(customFilterDateRange.to);
            toDate.setHours(0, 0, 0, 0);
            const nextDate = new Date(area.proximaPrevisao);
            nextDate.setHours(0, 0, 0, 0);
            return nextDate >= fromDate && nextDate <= toDate;
          default:
            return true;
        }
      });
    }

    // Aplicar filtros tradicionais
    if (!filters.search && 
        (!filters.bairro || filters.bairro === "all") && 
        (!filters.lote || filters.lote === "all") && 
        (!filters.status || filters.status === "all") && 
        (!filters.tipo || filters.tipo === "all")) {
      return areas;
    }

    return areas.filter(area => {
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
  }, [rocagemAreas, filters, timeRangeFilter, customFilterDateRange]);

  const hasActiveFilters = filters.search || 
    (filters.bairro && filters.bairro !== "all") || 
    (filters.lote && filters.lote !== "all") || 
    (filters.status && filters.status !== "all") || 
    (filters.tipo && filters.tipo !== "all") ||
    timeRangeFilter !== null;

  useEffect(() => {
    if (selectedArea && mapRef.current) {
      const lat = selectedArea.lat;
      const lng = selectedArea.lng;
      
      if (lat && lng) {
        // Sempre aproximar ao clicar em uma área (zoom 17 para boa visualização)
        mapRef.current.setView([lat, lng], 17, { animate: true });
      }
    }
  }, [selectedArea]);

  // Largura responsiva: 85% em mobile, 21rem em desktop
  const style = {
    "--sidebar-width": "min(85vw, 21rem)",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

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
      setShowMapCard(true); // Mostrar card flutuante no mapa
    }
  };

  const handleCloseMapCard = () => {
    setShowMapCard(false);
    setSelectedArea(null);
  };

  const handleOpenQuickRegister = () => {
    setShowMapCard(false);
    setShowQuickRegisterModal(true);
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

  const handleTimeRangeFilterChange = (filter: TimeRangeFilter, customDateRange?: { from: Date | undefined; to: Date | undefined }) => {
    setTimeRangeFilter(filter);
    // Sempre atualizar customFilterDateRange (undefined para filtros não-custom)
    setCustomFilterDateRange(customDateRange || { from: undefined, to: undefined });
  };

  // Mobile layout com BottomSheet
  if (isMobile) {
    const toggleBottomSheet = () => {
      if (bottomSheetState === "minimized") {
        setBottomSheetState("medium");
      } else {
        setBottomSheetState("minimized");
      }
    };

    return (
      <div className="flex flex-col h-screen w-full">
        <header className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border bg-background z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBottomSheet}
            className={bottomSheetState !== "minimized" ? "toggle-elevate toggle-elevated" : ""}
            aria-label={bottomSheetState === "minimized" ? "Abrir menu" : "Fechar menu"}
            data-testid="button-mobile-menu"
          >
            {bottomSheetState === "minimized" ? (
              <Menu className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </Button>
          <h1 className="text-lg font-semibold">Zeladoria Londrina</h1>
          <ThemeToggle />
        </header>
        
        <main className="flex-1 overflow-hidden relative">
          <DashboardMap
            rocagemAreas={rocagemAreas}
            jardinsAreas={jardinsAreas}
            layerFilters={{
              rocagemLote1: selectedService === 'rocagem',
              rocagemLote2: selectedService === 'rocagem',
              jardins: selectedService === 'jardins',
            }}
            onAreaClick={handleAreaClick}
            filteredAreaIds={hasActiveFilters ? new Set(filteredRocagemAreas.map(a => a.id)) : undefined}
            mapRef={mapRef}
            selectionMode={selectionMode}
            selectedAreaIds={selectedAreaIds}
          />

          {/* Card flutuante no mapa */}
          {showMapCard && selectedArea && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
              <MapInfoCard
                area={selectedArea}
                onClose={handleCloseMapCard}
                onRegisterMowing={handleOpenQuickRegister}
              />
            </div>
          )}
          
          <BottomSheet 
            state={bottomSheetState}
            onStateChange={setBottomSheetState}
          >
            <AppSidebar
              standalone
              selectedService={selectedService}
              onServiceSelect={handleServiceSelect}
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
              onTimeRangeFilterChange={handleTimeRangeFilterChange}
              showQuickRegisterModal={showQuickRegisterModal}
              showMapCard={showMapCard}
            />
          </BottomSheet>

          {/* Modal de registro rápido */}
          <QuickRegisterModal
            area={selectedArea}
            open={showQuickRegisterModal}
            onOpenChange={setShowQuickRegisterModal}
          />
        </main>
      </div>
    );
  }

  // Desktop layout com Sidebar
  return (
    <SidebarProvider 
      style={style as React.CSSProperties}
      defaultOpen={typeof window !== 'undefined' && window.innerWidth > 1024}
    >
      <div className="flex h-screen w-full">
        <AppSidebar
          selectedService={selectedService}
          onServiceSelect={handleServiceSelect}
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
          onTimeRangeFilterChange={handleTimeRangeFilterChange}
          showQuickRegisterModal={showQuickRegisterModal}
          showMapCard={showMapCard}
        />
        
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="h-[calc(100vh-3.5rem)] overflow-hidden relative">
            <DashboardMap
              rocagemAreas={rocagemAreas}
              jardinsAreas={jardinsAreas}
              layerFilters={{
                rocagemLote1: selectedService === 'rocagem',
                rocagemLote2: selectedService === 'rocagem',
                jardins: selectedService === 'jardins',
              }}
              onAreaClick={handleAreaClick}
              filteredAreaIds={hasActiveFilters ? new Set(filteredRocagemAreas.map(a => a.id)) : undefined}
              mapRef={mapRef}
              selectionMode={selectionMode}
              selectedAreaIds={selectedAreaIds}
            />

            {/* Card flutuante no mapa */}
            {showMapCard && selectedArea && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
                <MapInfoCard
                  area={selectedArea}
                  onClose={handleCloseMapCard}
                  onRegisterMowing={handleOpenQuickRegister}
                />
              </div>
            )}
          </main>
        </SidebarInset>
      </div>

      {/* Modal de registro rápido */}
      <QuickRegisterModal
        area={selectedArea}
        open={showQuickRegisterModal}
        onOpenChange={setShowQuickRegisterModal}
      />
    </SidebarProvider>
  );
}
