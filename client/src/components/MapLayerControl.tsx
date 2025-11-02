import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MapLayerType = "standard" | "satellite" | "hybrid";

interface MapLayerControlProps {
  currentLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
}

export function MapLayerControl({ currentLayer, onLayerChange }: MapLayerControlProps) {
  const getLayerLabel = (layer: MapLayerType) => {
    switch (layer) {
      case "standard":
        return "Padrão";
      case "satellite":
        return "Satélite";
      case "hybrid":
        return "Híbrido";
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="shadow-lg"
            data-testid="button-map-layers"
          >
            <Layers className="h-4 w-4 mr-2" />
            {getLayerLabel(currentLayer)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onLayerChange("standard")}
            className={currentLayer === "standard" ? "bg-accent" : ""}
            data-testid="layer-standard"
          >
            Padrão
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onLayerChange("satellite")}
            className={currentLayer === "satellite" ? "bg-accent" : ""}
            data-testid="layer-satellite"
          >
            Satélite
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onLayerChange("hybrid")}
            className={currentLayer === "hybrid" ? "bg-accent" : ""}
            data-testid="layer-hybrid"
          >
            Híbrido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
