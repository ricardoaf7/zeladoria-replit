import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
import { DashboardMap } from "@/components/DashboardMap";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapInfoCard } from "@/components/MapInfoCard";
import { QuickRegisterModal } from "@/components/QuickRegisterModal";
import { JardinsRegisterModal } from "@/components/JardinsRegisterModal";
import { ManualForecastModal } from "@/components/ManualForecastModal";
import { NewAreaModal } from "@/components/NewAreaModal";
import { EditAreaModal } from "@/components/EditAreaModal";
import { MapHeaderBar } from "@/components/MapHeaderBar";
import { ExportDialog } from "@/components/ExportDialog";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { BottomSheet, type BottomSheetState } from "@/components/BottomSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ServiceArea, AppConfig } from "@shared/schema";
import type { FilterCriteria } from "@/components/FilterPanel";
import type { TimeRangeFilter } from "@/components/MapLegend";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Menu, X, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showMapCard, setShowMapCard] = useState(false);
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [showJardinsRegisterModal, setShowJardinsRegisterModal] = useState(false);
  const [showManualForecastModal, setShowManualForecastModal] = useState(false);
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAreaCoords, setNewAreaCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [savedMapZoom, setSavedMapZoom] = useState<number | null>(null);
  const [savedMapCenter, setSavedMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [relocatingAreaId, setRelocatingAreaId] = useState<number | null>(null);
  const [pendingRelocation, setPendingRelocation] = useState<{ areaId: number; lat: number; lng: number } | null>(null);
  const [showRelocationConfirm, setShowRelocationConfirm] = useState(false);
  const [pendingNewAreaCoords, setPendingNewAreaCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showNewAreaConfirm, setShowNewAreaConfirm] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const ignoreSearchClearRef = useRef(false); // Flag para ignorar limpeza após seleção

  // Limpar selectedArea quando busca é limpa MANUALMENTE (não após seleção)
  useEffect(() => {
    if (filters.search === '') {
      // Ignorar se foi uma limpeza após seleção de área
      if (ignoreSearchClearRef.current) {
        ignoreSearchClearRef.current = false;
        return;
      }
      setSelectedArea(null);
      setShowMapCard(false);
    }
  }, [filters.search]);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
    // No mobile, não abrir automaticamente o BottomSheet
    // Deixar o usuário controlar via botão Menu
  };

  const handleMapZoomSaved = (zoom: number, center: { lat: number; lng: number }) => {
    setSavedMapZoom(zoom);
    setSavedMapCenter(center);
  };

  // Mutation para atualizar posição da área
  const updatePositionMutation = useMutation({
    mutationFn: async ({ areaId, lat, lng }: { areaId: number; lat: number; lng: number }) => {
      return await apiRequest("PATCH", `/api/areas/${areaId}/position`, { lat, lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/light", "rocagem"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas/light", "jardins"] });
      toast({
        title: "Localização Atualizada",
        description: "A localização da área foi alterada com sucesso.",
      });
      setRelocatingAreaId(null);
      setPendingRelocation(null);
      setShowRelocationConfirm(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar a localização.",
      });
    },
  });

  // Handler para iniciar modo de relocação
  const handleStartRelocation = () => {
    if (selectedArea) {
      setRelocatingAreaId(selectedArea.id);
      toast({
        title: "Modo de Relocação Ativo",
        description: "Arraste o marcador azul para a nova localização.",
      });
    }
  };

  // Handler quando o marcador é arrastado
  const handlePositionChange = (areaId: number, lat: number, lng: number) => {
    setPendingRelocation({ areaId, lat, lng });
    setShowRelocationConfirm(true);
  };

  // Handler para confirmar relocação
  const handleConfirmRelocation = () => {
    if (pendingRelocation) {
      updatePositionMutation.mutate(pendingRelocation);
    }
  };

  // Handler para cancelar relocação
  const handleCancelRelocation = () => {
    setShowRelocationConfirm(false);
    setPendingRelocation(null);
    setRelocatingAreaId(null);
    // Invalidar para resetar posição do marcador
    queryClient.invalidateQueries({ queryKey: ["/api/areas/light", "rocagem"] });
  };

  const handleBackupDownload = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) throw new Error('Falha ao gerar backup');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zeladoria_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Backup Gerado!",
        description: "Arquivo de backup baixado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Backup",
        description: "Não foi possível gerar o backup. Tente novamente.",
      });
    }
  };

  // Usar endpoint otimizado com dados leves (todas as áreas, sem filtro de viewport)
  const { data: rocagemAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/light", "rocagem"],
    queryFn: async () => {
      const res = await fetch(`/api/areas/light?servico=rocagem`);
      if (!res.ok) throw new Error("Failed to fetch areas");
      return res.json();
    },
    staleTime: 30000, // Cache por 30 segundos
  });

  const { data: jardinsAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/light", "jardins"],
    queryFn: async () => {
      const res = await fetch(`/api/areas/light?servico=jardins`);
      if (!res.ok) throw new Error("Failed to fetch areas");
      return res.json();
    },
    staleTime: 30000, // Cache por 30 segundos
  });

  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  // OTIMIZAÇÃO CRÍTICA: Usar useDeferredValue para separar atualização urgente (input)
  // de computação pesada (filtros). Evita lag de 3-4 segundos na digitação.
  // React prioriza atualização do input e processa filtros depois
  const deferredFilters = useDeferredValue(filters);
  const deferredTimeRangeFilter = useDeferredValue(timeRangeFilter);
  const deferredCustomFilterDateRange = useDeferredValue(customFilterDateRange);

  // Função auxiliar para calcular dias DESDE última roçagem
  const getDaysSinceLastMowing = (area: ServiceArea): number => {
    if (!area.ultimaRocagem) return -1; // Sem histórico
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = new Date(area.ultimaRocagem);
    lastDate.setHours(0, 0, 0, 0);
    
    return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Filtrar áreas baseado nos critérios (incluindo filtro de tempo)
  // IMPORTANTE: Usa valores deferidos para não bloquear UI durante digitação
  const filteredRocagemAreas = useMemo(() => {
    let areas = rocagemAreas;

    // Aplicar filtro de tempo primeiro (usando valores deferidos)
    if (deferredTimeRangeFilter) {
      areas = areas.filter(area => {
        // Filtro "Executando" - apenas áreas com status "Em Execução"
        if (deferredTimeRangeFilter === 'executing') {
          return area.status === 'Em Execução';
        }

        // Filtro "Sem Registro" - áreas sem histórico de roçagem
        if (deferredTimeRangeFilter === 'no-history') {
          return !area.ultimaRocagem;
        }

        // Para outros filtros, calcular dias desde última roçagem
        const days = getDaysSinceLastMowing(area);
        
        // Se não tem histórico, não mostra em nenhum filtro de tempo
        if (days === -1) return false;

        switch (deferredTimeRangeFilter) {
          case '1-5':
            return days >= 1 && days <= 5;
          case '6-15':
            return days >= 6 && days <= 15;
          case '16-30':
            return days >= 16 && days <= 30;
          case '31-45':
            return days >= 31 && days <= 45;
          case '46-60':
            return days >= 46 && days <= 60;
          case '61+':
            return days > 60;
          case 'custom':
            // Filtro por range de datas - baseado em ÚLTIMA roçagem
            if (!deferredCustomFilterDateRange.from || !deferredCustomFilterDateRange.to || !area.ultimaRocagem) return false;
            const fromDate = new Date(deferredCustomFilterDateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(deferredCustomFilterDateRange.to);
            toDate.setHours(0, 0, 0, 0);
            const lastMowDate = new Date(area.ultimaRocagem);
            lastMowDate.setHours(0, 0, 0, 0);
            return lastMowDate >= fromDate && lastMowDate <= toDate;
          default:
            return true;
        }
      });
    }

    // Aplicar filtros tradicionais (usando valores deferidos)
    if (!deferredFilters.search && 
        (!deferredFilters.bairro || deferredFilters.bairro === "all") && 
        (!deferredFilters.lote || deferredFilters.lote === "all") && 
        (!deferredFilters.status || deferredFilters.status === "all") && 
        (!deferredFilters.tipo || deferredFilters.tipo === "all")) {
      return areas;
    }

    return areas.filter(area => {
      if (deferredFilters.search) {
        const searchLower = deferredFilters.search.toLowerCase();
        const endereco = area.endereco?.toLowerCase() || "";
        const bairro = area.bairro?.toLowerCase() || "";
        if (!endereco.includes(searchLower) && !bairro.includes(searchLower)) {
          return false;
        }
      }

      if (deferredFilters.bairro && deferredFilters.bairro !== "all" && area.bairro !== deferredFilters.bairro) return false;
      if (deferredFilters.lote && deferredFilters.lote !== "all" && area.lote?.toString() !== deferredFilters.lote) return false;
      if (deferredFilters.status && deferredFilters.status !== "all" && area.status !== deferredFilters.status) return false;
      if (deferredFilters.tipo && deferredFilters.tipo !== "all" && area.tipo !== deferredFilters.tipo) return false;

      return true;
    });
  }, [rocagemAreas, deferredFilters, deferredTimeRangeFilter, deferredCustomFilterDateRange]);

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
      
      // Validar coordenadas antes de fazer zoom
      if (
        lat && 
        lng && 
        typeof lat === 'number' && 
        typeof lng === 'number' &&
        !isNaN(lat) && 
        !isNaN(lng) &&
        isFinite(lat) && 
        isFinite(lng)
      ) {
        // Sempre aproximar ao clicar em uma área (zoom 17 para boa visualização)
        mapRef.current.setView([lat, lng], 17, { animate: true });
      } else {
        console.warn('Coordenadas inválidas para área:', selectedArea.id, { lat, lng });
      }
    }
  }, [selectedArea]);

  // Largura responsiva: 85% em mobile, 21rem em desktop
  const style = {
    "--sidebar-width": "min(85vw, 21rem)",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  const handleAreaClick = (area: ServiceArea) => {
    setSelectedArea(area);
    setShowMapCard(true); // Mostrar card flutuante no mapa
  };

  const handleCloseMapCard = () => {
    setShowMapCard(false);
    setSelectedArea(null);
  };

  const handleOpenQuickRegister = () => {
    setShowMapCard(false);
    setShowQuickRegisterModal(true);
  };

  const handleOpenJardinsRegister = () => {
    setShowMapCard(false);
    setShowJardinsRegisterModal(true);
  };

  const handleOpenManualForecast = () => {
    setShowMapCard(false);
    setShowManualForecastModal(true);
  };

  const handleOpenEdit = () => {
    setShowMapCard(false);
    setShowEditModal(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Clique direito no mapa: mostrar confirmação primeiro
    setPendingNewAreaCoords({ lat, lng });
    setShowNewAreaConfirm(true);
  };

  const handleConfirmNewArea = () => {
    if (pendingNewAreaCoords) {
      setNewAreaCoords(pendingNewAreaCoords);
      setShowNewAreaModal(true);
    }
    setShowNewAreaConfirm(false);
    setPendingNewAreaCoords(null);
  };

  const handleCancelNewArea = () => {
    setShowNewAreaConfirm(false);
    setPendingNewAreaCoords(null);
  };

  const handleAreaUpdate = (updatedArea: ServiceArea) => {
    setSelectedArea(updatedArea);
  };

  const handleTimeRangeFilterChange = (filter: TimeRangeFilter, customDateRange?: { from: Date | undefined; to: Date | undefined }) => {
    setTimeRangeFilter(filter);
    // Sempre atualizar customFilterDateRange (undefined para filtros não-custom)
    setCustomFilterDateRange(customDateRange || { from: undefined, to: undefined });
  };

  const handleAreaSelectFromSearch = (area: ServiceArea) => {
    // Centralizar mapa na área
    if (mapRef.current && area.lat && area.lng) {
      mapRef.current.setView([area.lat, area.lng], 17, { animate: true });
    }
    
    // Selecionar área e abrir MapInfoCard
    setSelectedArea(area);
    setShowMapCard(true);
    
    // Setar flag para ignorar próxima limpeza de search
    ignoreSearchClearRef.current = true;
    
    // No mobile, minimizar o BottomSheet para ver melhor
    if (isMobile) {
      setBottomSheetState("minimized");
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackupDownload}
              aria-label="Exportar backup JSON"
              data-testid="button-backup"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExportDialog(true)}
              aria-label="Exportar CSV para Supabase"
              data-testid="button-export-csv"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* Barra de busca e filtros - aparece só quando serviço selecionado */}
        {selectedService === 'rocagem' && (
          <MapHeaderBar
            searchQuery={filters.search}
            onSearchChange={(query) => setFilters({ ...filters, search: query })}
            activeFilter={timeRangeFilter}
            onFilterChange={handleTimeRangeFilterChange}
            filteredCount={filteredRocagemAreas.length}
            totalCount={rocagemAreas.length}
            areas={filteredRocagemAreas}
            onAreaSelect={handleAreaSelectFromSearch}
            selectedAreaId={selectedArea?.id ?? null}
            onClearSelection={() => {
              setSelectedArea(null);
              setShowMapCard(false);
            }}
          />
        )}
        
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
            onMapClick={handleMapClick}
            filteredAreaIds={hasActiveFilters ? new Set(filteredRocagemAreas.map(a => a.id)) : undefined}
            mapRef={mapRef}
            searchQuery={filters.search}
            activeFilter={timeRangeFilter}
            selectedAreaId={selectedArea?.id || null}
            relocatingAreaId={relocatingAreaId}
            onPositionChange={handlePositionChange}
          />

          {/* Card flutuante no mapa */}
          {showMapCard && selectedArea && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
              <MapInfoCard
                area={selectedArea}
                onClose={handleCloseMapCard}
                onRegisterMowing={handleOpenQuickRegister}
                onRegisterJardins={handleOpenJardinsRegister}
                onSetManualForecast={handleOpenManualForecast}
                onEdit={handleOpenEdit}
                onChangeLocation={handleStartRelocation}
                isRelocating={relocatingAreaId === selectedArea.id}
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
              showQuickRegisterModal={showQuickRegisterModal}
              showMapCard={showMapCard}
            />
          </BottomSheet>

          {/* Modal de registro rápido */}
          <QuickRegisterModal
            area={selectedArea}
            open={showQuickRegisterModal}
            onOpenChange={setShowQuickRegisterModal}
            mapRef={mapRef}
            savedMapZoom={savedMapZoom}
            savedMapCenter={savedMapCenter}
          />

          {/* Modal de registro - Jardins */}
          <JardinsRegisterModal
            area={selectedArea}
            open={showJardinsRegisterModal}
            onOpenChange={setShowJardinsRegisterModal}
          />

          {/* Modal de cadastro de nova área */}
          {newAreaCoords && (
            <NewAreaModal
              open={showNewAreaModal}
              onOpenChange={setShowNewAreaModal}
              lat={newAreaCoords.lat}
              lng={newAreaCoords.lng}
            />
          )}

          {/* Modal de edição de área */}
          <EditAreaModal
            area={selectedArea}
            open={showEditModal}
            onOpenChange={setShowEditModal}
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
          showQuickRegisterModal={showQuickRegisterModal}
          showMapCard={showMapCard}
        />
        
        <SidebarInset className="flex-1 overflow-hidden flex flex-col">
          <header className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackupDownload}
                aria-label="Exportar backup JSON"
                data-testid="button-backup"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowExportDialog(true)}
                aria-label="Exportar CSV para Supabase"
                data-testid="button-export-csv"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          {/* Barra de busca e filtros - aparece só quando serviço selecionado */}
          {selectedService === 'rocagem' && (
            <MapHeaderBar
              searchQuery={filters.search}
              onSearchChange={(query) => setFilters({ ...filters, search: query })}
              activeFilter={timeRangeFilter}
              onFilterChange={handleTimeRangeFilterChange}
              filteredCount={filteredRocagemAreas.length}
              totalCount={rocagemAreas.length}
              areas={filteredRocagemAreas}
              onAreaSelect={handleAreaSelectFromSearch}
              selectedAreaId={selectedArea?.id ?? null}
              onClearSelection={() => {
                setSelectedArea(null);
                setShowMapCard(false);
              }}
            />
          )}

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
              onMapClick={handleMapClick}
              filteredAreaIds={hasActiveFilters ? new Set(filteredRocagemAreas.map(a => a.id)) : undefined}
              searchQuery={filters.search}
              activeFilter={timeRangeFilter}
              mapRef={mapRef}
              selectedAreaId={selectedArea?.id || null}
              onMapZoomSaved={handleMapZoomSaved}
              relocatingAreaId={relocatingAreaId}
              onPositionChange={handlePositionChange}
            />

            {/* Card flutuante no mapa */}
            {showMapCard && selectedArea && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
                <MapInfoCard
                  area={selectedArea}
                  onClose={handleCloseMapCard}
                  onRegisterMowing={handleOpenQuickRegister}
                  onRegisterJardins={handleOpenJardinsRegister}
                  onSetManualForecast={handleOpenManualForecast}
                  onEdit={handleOpenEdit}
                  onChangeLocation={handleStartRelocation}
                  isRelocating={relocatingAreaId === selectedArea.id}
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
        mapRef={mapRef}
        savedMapZoom={savedMapZoom}
        savedMapCenter={savedMapCenter}
      />

      {/* Modal de registro - Jardins */}
      <JardinsRegisterModal
        area={selectedArea}
        open={showJardinsRegisterModal}
        onOpenChange={setShowJardinsRegisterModal}
      />

      {/* Modal de previsão manual */}
      <ManualForecastModal
        area={selectedArea}
        open={showManualForecastModal}
        onOpenChange={setShowManualForecastModal}
      />

      {/* Modal de exportação CSV */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />

      {/* Diálogo de confirmação de relocação */}
      <AlertDialog open={showRelocationConfirm} onOpenChange={setShowRelocationConfirm}>
        <AlertDialogContent data-testid="dialog-relocation-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Localização?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar a localização desta área para as novas coordenadas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={handleCancelRelocation} data-testid="button-cancel-relocation">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRelocation}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={updatePositionMutation.isPending}
              data-testid="button-confirm-relocation"
            >
              {updatePositionMutation.isPending ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação para adicionar nova área */}
      <AlertDialog open={showNewAreaConfirm} onOpenChange={setShowNewAreaConfirm}>
        <AlertDialogContent data-testid="dialog-new-area-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Nova Área?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja cadastrar uma nova área nesta localização?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={handleCancelNewArea} data-testid="button-cancel-new-area">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmNewArea}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-new-area"
            >
              Sim, Adicionar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de cadastro de nova área */}
      {newAreaCoords && (
        <NewAreaModal
          open={showNewAreaModal}
          onOpenChange={setShowNewAreaModal}
          lat={newAreaCoords.lat}
          lng={newAreaCoords.lng}
        />
      )}

      {/* Modal de edição de área */}
      <EditAreaModal
        area={selectedArea}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </SidebarProvider>
  );
}
