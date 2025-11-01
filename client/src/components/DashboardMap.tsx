import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PolygonAssignmentModal } from "./PolygonAssignmentModal";
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
  const rocagemAreasRef = useRef<ServiceArea[]>(rocagemAreas);
  const [pendingPolygon, setPendingPolygon] = useState<Array<{ lat: number; lng: number }> | null>(null);
  
  useEffect(() => {
    rocagemAreasRef.current = rocagemAreas;
  }, [rocagemAreas]);
  
  const savePolygonMutation = useMutation({
    mutationFn: async ({ areaId, polygon }: { areaId: number; polygon: Array<{ lat: number; lng: number }> }) => {
      return await apiRequest("PATCH", `/api/areas/${areaId}/polygon`, { polygon });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
      toast({
        title: "Polígono Salvo",
        description: "O polígono foi salvo com sucesso.",
      });
      setPendingPolygon(null);
    },
  });

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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);
      
      const latlngs = layer.getLatLngs()[0];
      const polygon = latlngs.map((ll: L.LatLng) => ({ lat: ll.lat, lng: ll.lng }));
      
      if (rocagemAreasRef.current.length > 0) {
        setPendingPolygon(polygon);
      } else {
        toast({
          title: "Nenhuma Área Disponível",
          description: "Nenhuma área de roçagem foi encontrada. Adicione áreas antes de desenhar polígonos.",
          variant: "destructive",
        });
      }
    });

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
      const opacity = isFiltered ? 1 : 0.2;
      const color = getAreaColor(area, today, isSelected);
      const isPulsing = area.status === "Em Execução";

      if (area.polygon && area.polygon.length > 0) {
        const polygon = L.polygon(
          area.polygon.map((p) => [p.lat, p.lng]),
          {
            color: color,
            fillColor: color,
            fillOpacity: isFiltered ? 0.4 : 0.08,
            weight: 2,
            opacity: opacity,
            className: isPulsing ? "animate-pulse" : "",
          }
        );

        polygon.bindTooltip(
          `<div class="font-sans text-xs">
            <strong>${area.endereco}</strong><br/>
            Roçagem de Áreas Públicas<br/>
            ${area.scheduledDate ? `Previsão: ${new Date(area.scheduledDate).toLocaleDateString('pt-BR')}` : 'Sem previsão'}
          </div>`,
          {
            sticky: true,
            opacity: 0.9,
          }
        );

        polygon.bindPopup(
          `<div class="font-sans">
            <strong>${area.endereco}</strong><br/>
            Status: ${area.status}<br/>
            ${area.metragem_m2 ? `Metragem: ${area.metragem_m2.toLocaleString('pt-BR')} m²<br/>` : ''}
            ${area.scheduledDate ? `Agendado: ${new Date(area.scheduledDate).toLocaleDateString('pt-BR')}` : ''}
          </div>`
        );

        polygon.on("click", () => onAreaClick(area));
        polygon.addTo(layerGroup);
      } else {
        const icon = L.divIcon({
          className: `custom-marker ${isPulsing ? "animate-pulse" : ""}`,
          html: `<div data-testid="area-marker-${area.id}" data-area-id="${area.id}" style="
            background: ${isSelected ? 'rgba(147, 51, 234, 0.3)' : 'rgba(52, 211, 153, 0.25)'};
            width: 16px; 
            height: 16px; 
            border-radius: 50%; 
            border: 3px solid ${isSelected ? '#9333ea' : '#047857'};
            box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5);
            cursor: ${selectionMode ? 'pointer' : 'move'}; 
            opacity: ${opacity};
            transition: all 0.2s ease;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([area.lat, area.lng], { 
          icon,
          draggable: true,
        });

        marker.bindTooltip(
          `<div class="font-sans text-xs">
            <strong>${area.endereco}</strong><br/>
            Roçagem de Áreas Públicas<br/>
            ${area.scheduledDate ? `Previsão: ${new Date(area.scheduledDate).toLocaleDateString('pt-BR')}` : 'Sem previsão'}
          </div>`,
          {
            offset: [0, -5],
            opacity: 0.9,
          }
        );

        marker.bindPopup(
          `<div class="font-sans">
            <strong>${area.endereco}</strong><br/>
            Status: ${area.status}<br/>
            ${area.metragem_m2 ? `Metragem: ${area.metragem_m2.toLocaleString('pt-BR')} m²<br/>` : ''}
            ${area.scheduledDate ? `Agendado: ${new Date(area.scheduledDate).toLocaleDateString('pt-BR')}` : ''}
          </div>`
        );

        marker.on("click", () => onAreaClick(area));
        
        marker.on("dragend", (e: any) => {
          const newLatLng = e.target.getLatLng();
          updatePositionMutation.mutate({
            areaId: area.id,
            lat: newLatLng.lat,
            lng: newLatLng.lng,
          });
        });

        marker.addTo(layerGroup);
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

      if (team.type === "Giro Zero") {
        layerGroup = layerGroupsRef.current.teamsGiroZero;
        teamColor = "hsl(var(--team-giro-zero))";
        teamLabel = "GZ";
      } else if (team.type === "Acabamento") {
        layerGroup = layerGroupsRef.current.teamsAcabamento;
        teamColor = "hsl(var(--team-acabamento))";
        teamLabel = "AC";
      } else if (team.type === "Coleta") {
        layerGroup = layerGroupsRef.current.teamsColeta;
        teamColor = "hsl(var(--team-coleta))";
        teamLabel = "CO";
      } else if (team.type === "Capina") {
        layerGroup = layerGroupsRef.current.teamsCapina;
        teamColor = "hsl(var(--team-capina))";
        teamLabel = team.type === "Capina" ? "CP" : "TC";
      } else {
        return;
      }

      if (!layerGroup) return;

      const opacity = team.status === "Idle" ? 0.5 : 1;
      const icon = L.divIcon({
        className: `team-marker-${team.type.toLowerCase().replace(/\s/g, "-")}`,
        html: `<div style="
          background-color: ${teamColor};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.5);
          opacity: ${opacity};
        ">${teamLabel}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
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

      {pendingPolygon && (
        <PolygonAssignmentModal
          areas={rocagemAreas}
          polygon={pendingPolygon}
          onConfirm={(areaId) => savePolygonMutation.mutate({ areaId, polygon: pendingPolygon })}
          onCancel={() => setPendingPolygon(null)}
        />
      )}
    </div>
  );
}

function getAreaColor(area: ServiceArea, today: Date, isSelected = false): string {
  if (isSelected) {
    return "#9333ea";
  }

  if (area.status === "Em Execução") {
    return "#10b981";
  }

  if (area.scheduledDate) {
    const scheduled = new Date(area.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);

    if (scheduled.getTime() === today.getTime()) {
      return "#fbbf24";
    }

    const diffDays = Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 3) {
      return "#fde68a";
    }

    if (diffDays > 3 && diffDays <= 7) {
      return "#93c5fd";
    }
  }

  if (area.status === "Concluído" && area.history.length > 0) {
    const lastHistory = area.history[area.history.length - 1];
    const lastDate = new Date(lastHistory.date);
    const diffDays = Math.ceil((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return "#059669";
    }
  }

  return "#9ca3af";
}
