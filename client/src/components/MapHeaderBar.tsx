import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TimeRangeFilter } from './MapLegend';

interface MapHeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: TimeRangeFilter;
  onFilterChange: (filter: TimeRangeFilter) => void;
  filteredCount?: number;
  totalCount?: number;
}

const categoryFilters = [
  { value: null, label: 'Todas', color: '#94a3b8', shortLabel: 'Todas' },
  { value: 'executing' as const, label: 'Executando', color: '#10b981', shortLabel: 'Exec', isPulsing: true },
  { value: '0-5' as const, label: '0-5 dias', color: '#10b981', shortLabel: '0-5d' },
  { value: '6-15' as const, label: '6-15 dias', color: '#34d399', shortLabel: '6-15d' },
  { value: '16-25' as const, label: '16-25 dias', color: '#6ee7b7', shortLabel: '16-25d' },
  { value: '26-40' as const, label: '26-40 dias', color: '#a7f3d0', shortLabel: '26-40d' },
  { value: '41-45' as const, label: '41-45 dias', color: '#ef4444', shortLabel: '41-45d' },
];

export function MapHeaderBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filteredCount,
  totalCount,
}: MapHeaderBarProps) {
  const handleFilterClick = (filter: TimeRangeFilter) => {
    // Toggle: se clicar no ativo, desativa
    onFilterChange(activeFilter === filter ? null : filter);
  };

  return (
    <div className="bg-background border-b border-border px-3 py-2 space-y-2">
      {/* Linha 1: Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por endereço ou bairro..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm"
            data-testid="input-search-areas"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Contador de resultados */}
        {filteredCount !== undefined && totalCount !== undefined && (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {filteredCount} / {totalCount}
          </Badge>
        )}
      </div>

      {/* Linha 2: Filtros de categoria (chips horizontais com scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {categoryFilters.map((filter) => {
          const isActive = activeFilter === filter.value;
          
          return (
            <button
              key={filter.value || 'all'}
              onClick={() => handleFilterClick(filter.value)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                transition-all border
                ${isActive 
                  ? 'bg-accent text-accent-foreground border-accent-foreground/20 shadow-sm' 
                  : 'bg-background hover:bg-accent/50 border-border'
                }
              `}
              data-testid={`filter-chip-${filter.value || 'all'}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${filter.isPulsing ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: filter.color }}
              />
              <span className="hidden sm:inline">{filter.label}</span>
              <span className="sm:hidden">{filter.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Estilo CSS para esconder scrollbar mas manter scroll */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
