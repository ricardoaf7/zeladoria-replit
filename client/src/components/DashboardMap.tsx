import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/utils";
import { MapLayerControl, type MapLayerType } from "./MapLayerControl";
import type { ServiceArea } from "@shared/schema";
import type { TimeRangeFilter } from "./MapLegend";

interface DashboardMapProps {
  rocagemAreas: ServiceArea[];
  jardinsAreas: ServiceArea[];
  layerFilters: {
    rocagemLote1: boolean;
    rocagemLote2: boolean;
    jardins: boolean;
  };
  onAreaClick: (area: ServiceArea) => void;
  mapRef?: React.MutableRefObject<L.Map | null>;
  filteredAreaIds?: Set<number>;
  searchQuery?: string;
  activeFilter?: TimeRangeFilter;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

export function DashboardMap({
  rocagemAreas,
  jardinsAreas,
  layerFilters,
  onAreaClick,
  mapRef: externalMapRef,
  filteredAreaIds,
  searchQuery = '',
  activeFilter = null,
  onBoundsChange,
}: DashboardMapProps) {
  const { toast } = useToast();
  const internalMapRef = useRef<L.Map | null>(null);
  const mapRef = externalMapRef || internalMapRef;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupsRef = useRef<{
    [key: string]: L.LayerGroup;
  }>({});
  const tileLayersRef = useRef<{
    standard: L.TileLayer | null;
    satellite: L.TileLayer | null;
    hybrid: L.TileLayer | null;
  }>({
    standard: null,
    satellite: null,
    hybrid: null,
  });
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>("standard");

  const updatePositionMutation = useMutation({
    mutationFn: async ({ areaId, lat, lng }: { areaId: number; lat: number; lng: number }) => {
      return await apiRequest("PATCH", `/api/areas/${areaId}/position`, { lat, lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/light", "rocagem"] });
      toast({
        title: "Posição Atualizada",
        description: "A posição do marcador foi atualizada com sucesso.",
      });
    },
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([-23.31, -51.16], 13);

    // Criar as 3 tile layers
    tileLayersRef.current.standard = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    tileLayersRef.current.satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
      }
    );

    // Híbrido = Satélite + Labels do OpenStreetMap
    tileLayersRef.current.hybrid = L.layerGroup([
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
        }
      ),
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
          pane: "shadowPane",
        }
      ),
    ]) as unknown as L.TileLayer;

    // Adicionar camada padrão
    tileLayersRef.current.standard.addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    layerGroupsRef.current = {
      rocagemLote1: L.layerGroup().addTo(map),
      rocagemLote2: L.layerGroup().addTo(map),
      jardins: L.layerGroup().addTo(map),
    };

    mapRef.current = map;

    // Listener para atualizar bounds quando o mapa se mover
    const handleBoundsChange = () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange(bounds);
      }
    };

    // Disparar bounds iniciais
    handleBoundsChange();

    // Escutar eventos de movimento com debounce
    let boundsTimeout: NodeJS.Timeout;
    map.on('moveend', () => {
      clearTimeout(boundsTimeout);
      boundsTimeout = setTimeout(handleBoundsChange, 300);
    });

    return () => {
      clearTimeout(boundsTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, [onBoundsChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    Object.entries(layerGroupsRef.current).forEach(([key, layer]) => {
      if (layerFilters[key as keyof typeof layerFilters]) {
        layer.addTo(mapRef.current!);
      } else {
        layer.remove();
      }
    });
  }, [layerFilters]);

  // Trocar entre as camadas do mapa
  useEffect(() => {
    if (!mapRef.current) return;

    // Remover todas as camadas
    Object.values(tileLayersRef.current).forEach((layer) => {
      if (layer && mapRef.current) {
        mapRef.current.removeLayer(layer as L.Layer);
      }
    });

    // Adicionar a camada selecionada
    const selectedLayer = tileLayersRef.current[currentLayer];
    if (selectedLayer && mapRef.current) {
      selectedLayer.addTo(mapRef.current);
    }
  }, [currentLayer]);

  useEffect(() => {
    if (!mapRef.current) return;

    layerGroupsRef.current.rocagemLote1?.clearLayers();
    layerGroupsRef.current.rocagemLote2?.clearLayers();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    rocagemAreas.forEach((area) => {
      if (!area.lote) return;

      const layerGroup = area.lote === 1
        ? layerGroupsRef.current.rocagemLote1
        : layerGroupsRef.current.rocagemLote2;

      if (!layerGroup) return;

      const isFiltered = filteredAreaIds ? filteredAreaIds.has(area.id) : true;
      
      // Se há filtro ativo e área não está filtrada, não renderizar
      if (filteredAreaIds && !isFiltered) {
        return;
      }

      const color = getAreaColor(area, today, false, activeFilter);
      const isPulsing = area.status === "Em Execução";

      // Criar um ícone div circular arrastável com efeito de gradiente (borda profunda + centro transparente)
      const icon = L.divIcon({
        className: "area-marker",
        html: `<div style="
          background: radial-gradient(circle at center, transparent 0%, transparent 30%, ${color} 60%, ${color} 100%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid ${color};
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: move;
          ${isPulsing ? 'animation: marker-blink 2s ease-in-out infinite;' : ''}
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([area.lat, area.lng], { 
        icon,
        draggable: true, // Habilita drag em PC e mobile
      });

      // Tooltip permanente discreto quando há busca ativa
      const hasActiveSearch = searchQuery.trim().length > 0;
      
      if (hasActiveSearch) {
        // Label permanente discreto: apenas endereço ou lote
        marker.bindTooltip(
          `<div class="search-label">${area.endereco || `Lote ${area.lote}`}</div>`,
          {
            permanent: true,
            direction: 'top',
            className: 'search-tooltip',
            opacity: 1,
            offset: [0, -8],
          }
        );
      } else {
        // Tooltip normal no hover
        marker.bindTooltip(
          `<div class="font-sans text-xs">
            <strong>${area.endereco}</strong><br/>
            ${area.metragem_m2 ? `Metragem: ${area.metragem_m2.toLocaleString('pt-BR')} m²<br/>` : ''}
            ${area.ultimaRocagem ? `Última Roçagem: ${formatDateBR(area.ultimaRocagem)}<br/>` : ''}
            ${area.proximaPrevisao ? `Previsão: ${formatDateBR(area.proximaPrevisao)}` : 'Sem previsão'}
          </div>`,
          {
            sticky: true,
            opacity: 0.9,
          }
        );
      }

      marker.bindPopup(
        `<div class="font-sans">
          <strong>${area.endereco}</strong><br/>
          ${area.metragem_m2 ? `Metragem: ${area.metragem_m2.toLocaleString('pt-BR')} m²<br/>` : ''}
          ${area.ultimaRocagem ? `Última Roçagem: ${formatDateBR(area.ultimaRocagem)}<br/>` : ''}
          ${area.proximaPrevisao ? `Previsão: ${formatDateBR(area.proximaPrevisao)}` : 'Sem previsão'}
        </div>`
      );

      marker.on("click", () => onAreaClick(area));

      // Evento quando o usuário termina de arrastar (PC ou mobile)
      marker.on("dragend", (e) => {
        const newPos = (e.target as L.Marker).getLatLng();
        
        // Validar coordenadas antes de salvar
        if (
          newPos && 
          typeof newPos.lat === 'number' && 
          typeof newPos.lng === 'number' &&
          !isNaN(newPos.lat) && 
          !isNaN(newPos.lng) &&
          isFinite(newPos.lat) && 
          isFinite(newPos.lng)
        ) {
          updatePositionMutation.mutate({
            areaId: area.id,
            lat: newPos.lat,
            lng: newPos.lng,
          });
        } else {
          console.warn('Coordenadas inválidas recebidas no dragend:', newPos);
        }
      });

      marker.addTo(layerGroup);
    });
  }, [rocagemAreas, onAreaClick, filteredAreaIds, searchQuery]);

  useEffect(() => {
    if (!mapRef.current) return;

    layerGroupsRef.current.jardins?.clearLayers();

    jardinsAreas.forEach((area) => {
      const icon = L.divIcon({
        className: "custom-marker-garden",
        html: `<div style="background-color: #059669; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const marker = L.marker([area.lat, area.lng], { icon });

      marker.bindPopup(
        `<div class="font-sans">
          <strong>${area.endereco}</strong><br/>
          Tipo: ${area.tipo}<br/>
          ${area.servico ? `Serviço: ${area.servico}` : ''}
        </div>`
      );

      marker.on("click", () => onAreaClick(area));
      marker.addTo(layerGroupsRef.current.jardins!);
    });
  }, [jardinsAreas, onAreaClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />
      <MapLayerControl 
        currentLayer={currentLayer}
        onLayerChange={setCurrentLayer}
      />
    </div>
  );
}

function getAreaColor(area: ServiceArea, today: Date, isSelected = false, activeFilter: TimeRangeFilter = null): string {
  if (isSelected) {
    return "#9333ea"; // Roxo para selecionado
  }

  // Executando agora - verde forte com pulsação
  if (area.status === "Em Execução") {
    return "#10b981";
  }

  // Sistema baseado em PRÓXIMA previsão (dias ATÉ roçar)
  // Nova paleta de cores personalizada
  if (area.proximaPrevisao) {
    const nextDate = new Date(area.proximaPrevisao);
    nextDate.setHours(0, 0, 0, 0);
    
    const daysUntilMowing = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Previsão próxima (0-5 dias) - Verde água
    if (daysUntilMowing >= 0 && daysUntilMowing <= 5) {
      return "#009d81";
    } 
    // Previsão (6-15 dias) - Azul
    else if (daysUntilMowing > 5 && daysUntilMowing <= 15) {
      return "#549ccc";
    } 
    // Previsão (16-25 dias) - Rosa escuro
    else if (daysUntilMowing > 15 && daysUntilMowing <= 25) {
      return "#a83e6b";
    } 
    // Previsão (26-40 dias) - Laranja
    else if (daysUntilMowing > 25 && daysUntilMowing <= 40) {
      return "#fe8963";
    } 
    // Previsão (41-45 dias) - Vermelho (últimos do ciclo)
    else if (daysUntilMowing > 40 && daysUntilMowing <= 45) {
      return "#ea3c27";
    }
    // Fora das categorias definidas
    // Quando filtro "Todas" ativo (null), usar cor laranja
    // Quando filtro específico ativo, usar cinza
    else {
      return activeFilter === null ? "#fe8963" : "#9ca3af";
    }
  }

  // Sem previsão
  // Quando filtro "Todas" ativo (null), usar cor laranja
  // Quando filtro específico ativo, usar cinza
  return activeFilter === null ? "#fe8963" : "#9ca3af";
}
