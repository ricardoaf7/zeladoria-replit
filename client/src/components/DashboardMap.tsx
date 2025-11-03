import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/utils";
import { MapLayerControl, type MapLayerType } from "./MapLayerControl";
import type { ServiceArea, Team } from "@shared/schema";

interface DashboardMapProps {
  rocagemAreas: ServiceArea[];
  jardinsAreas: ServiceArea[];
  teams: Team[];
  layerFilters: {
    rocagemLote1: boolean;
    rocagemLote2: boolean;
    jardins: boolean;
    teamsGiroZero: boolean;
    teamsAcabamento: boolean;
    teamsColeta: boolean;
    teamsCapina: boolean;
  };
  onAreaClick: (area: ServiceArea) => void;
  mapRef?: React.MutableRefObject<L.Map | null>;
  selectionMode?: boolean;
  selectedAreaIds?: Set<number>;
  filteredAreaIds?: Set<number>;
}

export function DashboardMap({
  rocagemAreas,
  jardinsAreas,
  teams,
  layerFilters,
  onAreaClick,
  mapRef: externalMapRef,
  selectionMode = false,
  selectedAreaIds = new Set(),
  filteredAreaIds,
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
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
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
      teamsGiroZero: L.layerGroup().addTo(map),
      teamsAcabamento: L.layerGroup().addTo(map),
      teamsColeta: L.layerGroup().addTo(map),
      teamsCapina: L.layerGroup().addTo(map),
    };

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

      const isSelected = selectedAreaIds.has(area.id);
      const isFiltered = filteredAreaIds ? filteredAreaIds.has(area.id) : true;
      
      // Se há filtro ativo e área não está filtrada, não renderizar
      if (filteredAreaIds && !isFiltered) {
        return;
      }

      const color = getAreaColor(area, today, isSelected);
      const isPulsing = area.status === "Em Execução";

      // Usar círculo para todas as áreas
      {
        const circle = L.circleMarker([area.lat, area.lng], {
          radius: 8,
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          weight: 2,
          opacity: 1,
          className: isPulsing ? "pulsing-marker" : "",
        });

        circle.bindTooltip(
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

        circle.bindPopup(
          `<div class="font-sans">
            <strong>${area.endereco}</strong><br/>
            Status: ${area.status}<br/>
            ${area.metragem_m2 ? `Metragem: ${area.metragem_m2.toLocaleString('pt-BR')} m²<br/>` : ''}
            ${area.scheduledDate ? `Agendado: ${formatDateBR(area.scheduledDate)}` : ''}
          </div>`
        );

        circle.on("click", () => onAreaClick(area));
        circle.addTo(layerGroup);
      }
    });
  }, [rocagemAreas, onAreaClick, selectedAreaIds, filteredAreaIds]);

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

  useEffect(() => {
    if (!mapRef.current) return;

    Object.values(layerGroupsRef.current).forEach((layer) => {
      if (layer && typeof layer.eachLayer === "function") {
        layer.eachLayer((l) => {
          if (l instanceof L.Marker && l.options.icon?.options.className?.includes("team-marker")) {
            layer.removeLayer(l);
          }
        });
      }
    });

    teams.forEach((team) => {
      let layerGroup: L.LayerGroup | undefined;
      let teamColor: string;
      let teamLabel: string;
      let borderColor: string;
      let borderWidth: number;

      if (team.type === "Giro Zero") {
        layerGroup = layerGroupsRef.current.teamsGiroZero;
        teamColor = "#3b82f6"; // Azul
        teamLabel = "GZ";
        borderColor = "#1e40af";
        borderWidth = team.status === "Working" ? 3 : 2;
      } else if (team.type === "Acabamento") {
        layerGroup = layerGroupsRef.current.teamsAcabamento;
        teamColor = "#8b5cf6"; // Roxo
        teamLabel = "AC";
        borderColor = "#6d28d9";
        borderWidth = team.status === "Working" ? 3 : 2;
      } else if (team.type === "Coleta") {
        layerGroup = layerGroupsRef.current.teamsColeta;
        teamColor = "#f59e0b"; // Laranja
        teamLabel = "CO";
        borderColor = "#d97706";
        borderWidth = team.status === "Working" ? 3 : 2;
      } else if (team.type === "Capina") {
        layerGroup = layerGroupsRef.current.teamsCapina;
        teamColor = "#10b981"; // Verde
        teamLabel = "CP";
        borderColor = "#059669";
        borderWidth = team.status === "Working" ? 3 : 2;
      } else {
        return;
      }

      if (!layerGroup) return;

      const opacity = team.status === "Idle" ? 0.6 : 1;
      const pulseAnimation = team.status === "Working" 
        ? "animation: pulse 2s infinite;" 
        : "";
      
      const icon = L.divIcon({
        className: `team-marker-${team.type.toLowerCase().replace(/\s/g, "-")}`,
        html: `<div style="
          background-color: ${teamColor};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: ${borderWidth}px solid ${borderColor};
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
          opacity: ${opacity};
          ${pulseAnimation}
        ">${teamLabel}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([team.location.lat, team.location.lng], { icon });

      marker.bindTooltip(
        `<div class="font-sans">
          <strong>Equipe ${team.id}: ${team.type}</strong><br/>
          Status: ${team.status}<br/>
          ${team.lote ? `Lote: ${team.lote}` : ''}
        </div>`,
        { permanent: false, direction: 'top', offset: [0, -10] }
      );

      marker.addTo(layerGroup);
    });

  }, [teams]);

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

function getAreaColor(area: ServiceArea, today: Date, isSelected = false): string {
  if (isSelected) {
    return "#9333ea"; // Roxo para selecionado
  }

  // Executando agora - verde forte com pulsação
  if (area.status === "Em Execução") {
    return "#10b981";
  }

  // Sistema baseado em PRÓXIMA previsão (dias ATÉ roçar)
  // Quanto mais distante, mais claro o verde
  if (area.proximaPrevisao) {
    const nextDate = new Date(area.proximaPrevisao);
    nextDate.setHours(0, 0, 0, 0);
    
    const daysUntilMowing = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Previsão próxima (0-5 dias) - Verde
    if (daysUntilMowing >= 0 && daysUntilMowing <= 5) {
      return "#10b981";
    } 
    // Previsão (6-15 dias) - Verde médio
    else if (daysUntilMowing > 5 && daysUntilMowing <= 15) {
      return "#34d399";
    } 
    // Previsão (16-25 dias) - Verde mais claro
    else if (daysUntilMowing > 15 && daysUntilMowing <= 25) {
      return "#6ee7b7";
    } 
    // Previsão (26-40 dias) - Verde claro
    else if (daysUntilMowing > 25 && daysUntilMowing <= 40) {
      return "#a7f3d0";
    } 
    // Previsão (41-45 dias) - Vermelho (últimos do ciclo)
    else if (daysUntilMowing > 40 && daysUntilMowing <= 45) {
      return "#ef4444";
    }
    // Fora das categorias definidas - cinza
    else {
      return "#9ca3af";
    }
  }

  // Sem previsão - cinza
  return "#9ca3af";
}
