import { useState } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MapLayerType = "standard" | "satellite" | "hybrid";

interface MapLayerControlProps {
  currentLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
}

export function MapLayerControl({ currentLayer, onLayerChange }: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleLayerSelect = (layer: MapLayerType) => {
    onLayerChange(layer);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          className="shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-map-layers"
        >
          <Layers className="h-4 w-4 mr-2" />
          {getLayerLabel(currentLayer)}
        </Button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-popover border border-border rounded-md shadow-lg overflow-hidden min-w-[140px]">
            <button
              onClick={() => handleLayerSelect("standard")}
              className={`w-full px-4 py-2 text-sm text-left hover-elevate active-elevate-2 ${
                currentLayer === "standard" ? "bg-accent text-accent-foreground" : ""
              }`}
              data-testid="layer-standard"
            >
              Padrão
            </button>
            <button
              onClick={() => handleLayerSelect("satellite")}
              className={`w-full px-4 py-2 text-sm text-left hover-elevate active-elevate-2 ${
                currentLayer === "satellite" ? "bg-accent text-accent-foreground" : ""
              }`}
              data-testid="layer-satellite"
            >
              Satélite
            </button>
            <button
              onClick={() => handleLayerSelect("hybrid")}
              className={`w-full px-4 py-2 text-sm text-left hover-elevate active-elevate-2 ${
                currentLayer === "hybrid" ? "bg-accent text-accent-foreground" : ""
              }`}
              data-testid="layer-hybrid"
            >
              Híbrido
            </button>
          </div>
        )}
      </div>

      {/* Overlay para fechar o menu ao clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
