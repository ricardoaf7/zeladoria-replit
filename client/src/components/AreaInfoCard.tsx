import { useState } from "react";
import { X, Edit3, Save, Calendar, MapPin, Ruler, Hash, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { ServiceArea } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/utils";

interface AreaInfoCardProps {
  area: ServiceArea;
  onClose: () => void;
  onUpdate?: (updatedArea: ServiceArea) => void;
}

export function AreaInfoCard({ area, onClose, onUpdate }: AreaInfoCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    endereco: area.endereco,
    bairro: area.bairro || "",
    metragem_m2: area.metragem_m2 || 0,
    lote: area.lote || 1,
  });

  const updateAreaMutation = useMutation({
    mutationFn: async (data: Partial<ServiceArea>): Promise<ServiceArea> => {
      const res = await apiRequest("PATCH", `/api/areas/${area.id}`, data);
      return await res.json() as ServiceArea;
    },
    onSuccess: (updatedArea: ServiceArea) => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas/jardins"] });
      toast({
        title: "Área Atualizada",
        description: "As informações da área foram atualizadas com sucesso.",
      });
      setIsEditing(false);
      if (onUpdate) {
        onUpdate(updatedArea);
      }
    },
  });

  const handleSave = () => {
    updateAreaMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setEditedData({
      endereco: area.endereco,
      bairro: area.bairro || "",
      metragem_m2: area.metragem_m2 || 0,
      lote: area.lote || 1,
    });
    setIsEditing(false);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold mb-2">
              Informações da Área
            </CardTitle>
            {area.status && typeof area.status === 'string' && (
              <Badge variant="outline" data-testid={`badge-status-${area.status.toLowerCase().replace(/\s/g, '-')}`}>
                {area.status}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-card"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              {isEditing ? (
                <div>
                  <Label htmlFor="endereco" className="text-xs">Localização</Label>
                  <Input
                    id="endereco"
                    value={editedData.endereco}
                    onChange={(e) =>
                      setEditedData({ ...editedData, endereco: e.target.value })
                    }
                    className="mt-1 h-8"
                    data-testid="input-endereco"
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">Localização</p>
                  <p className="text-sm font-medium" data-testid="text-endereco">
                    {area.endereco}
                  </p>
                </div>
              )}
            </div>
          </div>

          {(area.bairro || isEditing) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                {isEditing ? (
                  <div>
                    <Label htmlFor="bairro" className="text-xs">Bairro</Label>
                    <Input
                      id="bairro"
                      value={editedData.bairro}
                      onChange={(e) =>
                        setEditedData({ ...editedData, bairro: e.target.value })
                      }
                      className="mt-1 h-8"
                      data-testid="input-bairro"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Bairro</p>
                    <p className="text-sm font-medium" data-testid="text-bairro">
                      {area.bairro}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {area.tipo && (
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium" data-testid="text-tipo">{area.tipo}</p>
              </div>
            </div>
          )}

          {area.scheduledDate && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Previsão Atual</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" data-testid="text-previsao">
                    {formatDateBR(area.scheduledDate)}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className="text-xs" 
                    data-testid={area.manualSchedule ? "badge-manual" : "badge-automatico"}
                  >
                    {area.manualSchedule ? "Manual" : "Automático"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {area.proximaPrevisao && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Próxima Previsão</p>
                <p className="text-sm font-medium" data-testid="text-proxima-previsao">
                  {formatDateBR(area.proximaPrevisao)}
                </p>
              </div>
            </div>
          )}

          {area.ultimaRocagem && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-emerald-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Última Roçagem</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" data-testid="text-ultima-rocagem">
                  {formatDateBR(area.ultimaRocagem)}
                </p>
              </div>
            </div>
          )}

          {(area.metragem_m2 || isEditing) && (
            <div className="flex items-start gap-3">
              <Ruler className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                {isEditing ? (
                  <div>
                    <Label htmlFor="metragem" className="text-xs">Área (m²)</Label>
                    <Input
                      id="metragem"
                      type="number"
                      value={editedData.metragem_m2}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          metragem_m2: Number(e.target.value),
                        })
                      }
                      className="mt-1 h-8"
                      data-testid="input-metragem"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-sm font-medium font-mono" data-testid="text-metragem">
                      {area.metragem_m2?.toLocaleString('pt-BR')} m²
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(area.lote || isEditing) && (
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                {isEditing ? (
                  <div>
                    <Label htmlFor="lote" className="text-xs">Lote</Label>
                    <Input
                      id="lote"
                      type="number"
                      min="1"
                      max="2"
                      value={editedData.lote}
                      onChange={(e) =>
                        setEditedData({ ...editedData, lote: Number(e.target.value) })
                      }
                      className="mt-1 h-8"
                      data-testid="input-lote"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Lote</p>
                    <p className="text-sm font-medium" data-testid="text-lote">{area.lote}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {area.history && area.history.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold">Histórico</h4>
              </div>
              <ul className="space-y-1 text-xs">
                {area.history.slice(0, 5).reverse().map((item, index) => {
                  const isForecast = item.type === 'forecast';
                  return (
                    <li key={index} className={isForecast ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}>
                      • {formatDateBR(item.date)} - {isForecast ? 'Previsto para' : 'Concluído em'} {item.status}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        <Separator />

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateAreaMutation.isPending}
                className="flex-1"
                data-testid="button-save-edit"
              >
                {updateAreaMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="w-full"
              data-testid="button-edit"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
