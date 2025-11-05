import { useState } from "react";
import { X, Calendar, MapPin, Ruler, CheckCircle2, Info, ChevronDown, ChevronUp, Hash, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceArea } from "@shared/schema";
import { formatDateBR } from "@/lib/utils";

interface MapInfoCardProps {
  area: ServiceArea;
  onClose: () => void;
  onRegisterMowing: () => void;
  onSetManualForecast: () => void;
}

export function MapInfoCard({ area, onClose, onRegisterMowing, onSetManualForecast }: MapInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getDaysUntilMowing = (): number | null => {
    if (!area.proximaPrevisao) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const previsao = new Date(area.proximaPrevisao);
    previsao.setHours(0, 0, 0, 0);
    const diffTime = previsao.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilMowing();
  const isExecuting = area.status === "Em Execução";

  return (
    <Card className="w-80 shadow-lg border-2 max-h-[calc(100vh-120px)] overflow-y-auto" data-testid="map-info-card">
      <CardContent className="p-4">
        {/* Header com botão fechar */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm leading-tight mb-1" data-testid="text-area-endereco">
              {area.endereco}
            </h3>
            {area.bairro && (
              <p className="text-xs text-muted-foreground">{area.bairro}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 -mt-1 -mr-1"
            data-testid="button-close-map-card"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Badge */}
        {isExecuting && (
          <Badge variant="default" className="mb-3 bg-green-600" data-testid="badge-em-execucao">
            Em Execução
          </Badge>
        )}

        {/* Informações principais */}
        <div className="space-y-2 mb-4">
          {area.metragem_m2 && (
            <div className="flex items-center gap-2 text-xs">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Metragem:</span>
              <span className="font-medium" data-testid="text-metragem">
                {area.metragem_m2.toLocaleString('pt-BR')} m²
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Última Roçagem:</span>
            <span className="font-medium" data-testid="text-ultima-rocagem">
              {area.ultimaRocagem ? formatDateBR(area.ultimaRocagem) : "Nunca roçada"}
            </span>
          </div>

          {area.proximaPrevisao && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Previsão:</span>
              <span className="font-medium" data-testid="text-previsao">
                {formatDateBR(area.proximaPrevisao)}
                {daysUntil !== null && (
                  <span className="ml-1 text-muted-foreground">
                    ({daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `${daysUntil} dias`})
                  </span>
                )}
              </span>
              {area.manualSchedule && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid="badge-manual-forecast">
                  <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                  Manual
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Seção expandível com mais detalhes */}
        {isExpanded && (
          <>
            <Separator className="mb-4" />
            
            <div className="space-y-3 mb-4">
              <h4 className="font-semibold text-xs uppercase text-muted-foreground">
                Detalhes Adicionais
              </h4>
              
              {area.lote && (
                <div className="flex items-center gap-2 text-xs">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Lote:</span>
                  <span className="font-medium" data-testid="text-lote">
                    {area.lote}
                  </span>
                </div>
              )}
              
              {area.tipo && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium capitalize" data-testid="text-tipo">
                    {area.tipo}
                  </span>
                </div>
              )}

              {area.history && area.history.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-semibold text-xs text-muted-foreground">Histórico Recente</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {area.history.slice(-5).reverse().map((entry, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{formatDateBR(entry.date)}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {entry.status}
                          </Badge>
                        </div>
                        {entry.observation && (
                          <p className="text-muted-foreground mt-1 text-[11px]">
                            {entry.observation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRegisterMowing}
            className="w-full h-9 bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-register-mowing"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Registrar Roçagem
          </Button>
          
          <Button
            onClick={onSetManualForecast}
            variant="outline"
            className="w-full h-9 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
            data-testid="button-set-manual-forecast"
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            Definir Previsão Manual
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-8"
            data-testid="button-view-details"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-2" />
                Ocultar Detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-2" />
                Ver Detalhes Completos
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
