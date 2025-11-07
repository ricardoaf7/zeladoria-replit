import { useState } from 'react';
import { Map, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type TimeRangeFilter = 
  | 'executing'  // Executando
  | '1-5'        // 1-5 dias
  | '6-15'       // 6-15 dias
  | '16-25'      // 16-25 dias
  | '26-35'      // 26-35 dias
  | '36-45'      // 36-45 dias
  | '46+'        // mais de 45 dias
  | 'no-history' // Sem registro
  | 'custom'     // Personalizado
  | null;        // Todos

interface MapLegendProps {
  activeFilter: TimeRangeFilter;
  onFilterChange: (filter: TimeRangeFilter) => void;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const timeRanges = [
  { value: 'executing' as const, label: 'Executando', sublabel: 'Roçando agora', color: '#10b981', isPulsing: true },
  { value: '1-5' as const, label: '1-5 dias', sublabel: 'Roçado recentemente', color: '#0086ff' },
  { value: '6-15' as const, label: '6-15 dias', sublabel: 'Roçado há 6-15 dias', color: '#139b89' },
  { value: '16-25' as const, label: '16-25 dias', sublabel: 'Roçado há 16-25 dias', color: '#fe8963' },
  { value: '26-35' as const, label: '26-35 dias', sublabel: 'Roçado há 26-35 dias', color: '#b79689' },
  { value: '36-45' as const, label: '36-45 dias', sublabel: 'Roçado há 36-45 dias', color: '#a08ee9' },
  { value: '46+' as const, label: 'Mais de 45 dias', sublabel: 'Requer atenção', color: '#ea3c27' },
  { value: 'no-history' as const, label: 'Sem Registro', sublabel: 'Nunca roçada', color: '#c0c0c0' },
];

export function MapLegend({ 
  activeFilter, 
  onFilterChange, 
  customDateRange, 
  onCustomDateRangeChange 
}: MapLegendProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleFilterClick = (filter: TimeRangeFilter) => {
    // Se clicar no filtro ativo, desativa (volta para null)
    if (activeFilter === filter) {
      onFilterChange(null);
    } else {
      // Para filtro custom, não ativar se não tem range completo
      if (filter === 'custom' && (!customDateRange?.from || !customDateRange?.to)) {
        // Não fazer nada - precisa selecionar datas primeiro
        return;
      }
      onFilterChange(filter);
    }
  };

  return (
    <Card className="w-full" data-testid="card-map-legend">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Map className="h-5 w-5" />
          Filtros do Mapa
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-80">ROÇADO HÁ</div>
          <div className="text-[10px] opacity-60 mb-2">Clique para filtrar as áreas</div>
          
          {/* Botão "Todos" */}
          <Button
            variant={activeFilter === null ? "default" : "outline"}
            size="sm"
            className="w-full justify-start text-xs h-auto py-2"
            onClick={() => handleFilterClick(null)}
            data-testid="filter-all"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
              <div className="flex-1 text-left">
                <div className="font-medium">Todas as áreas</div>
              </div>
            </div>
          </Button>

          {/* Filtros por faixa de tempo */}
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={activeFilter === range.value ? "default" : "outline"}
              size="sm"
              className="w-full justify-start text-xs h-auto py-2"
              onClick={() => handleFilterClick(range.value)}
              data-testid={`button-filter-${range.value}`}
            >
              <div className="flex items-center gap-2 w-full">
                <div 
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${range.isPulsing ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: range.color }}
                ></div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{range.label}</div>
                  <div className="text-[10px] opacity-70">{range.sublabel}</div>
                </div>
              </div>
            </Button>
          ))}

          <Separator className="my-2" />

          {/* Filtro personalizado com período de datas */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilter === 'custom' ? "default" : "outline"}
                size="sm"
                className="w-full justify-start text-xs h-auto py-2"
                data-testid="button-filter-custom"
              >
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="w-3 h-3" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Período Personalizado</div>
                    {customDateRange?.from && (
                      <div className="text-[10px] opacity-70">
                        {format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })}
                        {customDateRange.to && ` - ${format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  if (range && onCustomDateRangeChange) {
                    // DateRange pode ter 'to' como undefined, mas nossa interface precisa de ambos definidos
                    const normalizedRange = {
                      from: range.from,
                      to: range.to || range.from // Se 'to' não definido, usar 'from'
                    };
                    onCustomDateRangeChange(normalizedRange);
                  }
                  // Fechar apenas se um range completo foi selecionado
                  if (range?.from && range?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ptBR}
                numberOfMonths={1}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-80">Tipos de Equipe</div>
          
          <div className="flex items-center gap-2 text-xs">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm" 
              style={{backgroundColor: "hsl(var(--team-giro-zero))"}}
            >
              GZ
            </div>
            <span>Giro Zero</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm" 
              style={{backgroundColor: "hsl(var(--team-acabamento))"}}
            >
              AC
            </div>
            <span>Acabamento</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm" 
              style={{backgroundColor: "hsl(var(--team-coleta))"}}
            >
              CO
            </div>
            <span>Coleta</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white shadow-sm" 
              style={{backgroundColor: "hsl(var(--team-capina))"}}
            >
              CP
            </div>
            <span>Capina</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
