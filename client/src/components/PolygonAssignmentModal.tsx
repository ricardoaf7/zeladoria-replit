import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ServiceArea } from "@shared/schema";

interface PolygonAssignmentModalProps {
  areas: ServiceArea[];
  polygon: Array<{ lat: number; lng: number }>;
  onConfirm: (areaId: number) => void;
  onCancel: () => void;
}

export function PolygonAssignmentModal({
  areas,
  polygon,
  onConfirm,
  onCancel,
}: PolygonAssignmentModalProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  const selectedArea = areas.find(a => a.id === Number(selectedAreaId));
  const hasExistingPolygon = selectedArea?.polygon;

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent data-testid="modal-polygon-assignment">
        <DialogHeader>
          <DialogTitle>Atribuir Polígono à Área</DialogTitle>
          <DialogDescription>
            Selecione a área de serviço para associar a este polígono desenhado.
            {hasExistingPolygon && (
              <span className="flex items-center gap-2 mt-3 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" />
                Esta área já possui um polígono que será substituído.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
            <SelectTrigger data-testid="select-polygon-area">
              <SelectValue placeholder="Selecione uma área" />
            </SelectTrigger>
            <SelectContent>
              {areas.length === 0 ? (
                <SelectItem value="none" disabled data-testid="option-no-areas">
                  Nenhuma área disponível
                </SelectItem>
              ) : (
                areas.map((area) => (
                  <SelectItem 
                    key={area.id} 
                    value={area.id.toString()}
                    data-testid={`option-area-${area.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {area.polygon && <RefreshCw className="h-3 w-3" />}
                      <span>{area.endereco} ({area.bairro}) - Lote {area.lote}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-polygon"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(Number(selectedAreaId))}
            disabled={!selectedAreaId}
            data-testid="button-confirm-polygon"
          >
            {hasExistingPolygon ? "Substituir Polígono" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
