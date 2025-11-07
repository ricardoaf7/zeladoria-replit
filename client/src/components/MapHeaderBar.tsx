import { useState, useRef, useEffect, useDeferredValue, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import type { TimeRangeFilter } from './MapLegend';
import type { ServiceArea } from '@shared/schema';

interface MapHeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: TimeRangeFilter;
  onFilterChange: (filter: TimeRangeFilter) => void;
  filteredCount?: number;
  totalCount?: number;
  areas?: ServiceArea[];
  onAreaSelect?: (area: ServiceArea) => void;
}

const categoryFilters = [
  { value: null, label: 'Todas', color: '#94a3b8', shortLabel: 'Todas' },
  { value: 'executing' as const, label: 'Executando', color: '#10b981', shortLabel: 'Exec', isPulsing: true },
  { value: '1-5' as const, label: '1-5 dias', color: '#0086ff', shortLabel: '1-5d' },
  { value: '6-15' as const, label: '6-15 dias', color: '#139b89', shortLabel: '6-15d' },
  { value: '16-25' as const, label: '16-25 dias', color: '#fe8963', shortLabel: '16-25d' },
  { value: '26-35' as const, label: '26-35 dias', color: '#b79689', shortLabel: '26-35d' },
  { value: '36-45' as const, label: '36-45 dias', color: '#a08ee9', shortLabel: '36-45d' },
  { value: '46+' as const, label: '+45 dias', color: '#ea3c27', shortLabel: '+45d' },
  { value: 'no-history' as const, label: 'Sem Registro', color: '#c0c0c0', shortLabel: 'S/Reg' },
];

// Função auxiliar para escapar caracteres especiais de regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Função auxiliar para destacar o texto da busca
function highlightMatch(text: string, query: string): JSX.Element {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return <>{text}</>;
  
  const escapedQuery = escapeRegExp(trimmedQuery);
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === trimmedQuery.toLowerCase() ? (
          <span key={i} className="font-semibold text-foreground bg-accent/50 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function MapHeaderBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filteredCount,
  totalCount,
  areas = [],
  onAreaSelect,
}: MapHeaderBarProps) {
  // OTIMIZAÇÃO CRÍTICA: Estado local para input instantâneo
  // Separar estado visual (localValue) da propagação ao dashboard (onSearchChange)
  // Elimina lag de 3-4 segundos na digitação causado por re-render do dashboard
  const [localValue, setLocalValue] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number; left: number; width: number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar localValue quando searchQuery mudar externamente (ex: limpar busca)
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  // OTIMIZAÇÃO: Debounce automático com useDeferredValue (200ms típico)
  // Evita lag na digitação, separando input visual da busca server-side
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Busca server-side usando query debounced
  const { data: searchResults = [] } = useQuery<ServiceArea[]>({
    queryKey: ['/api/areas/search', deferredSearchQuery],
    queryFn: async () => {
      if (!deferredSearchQuery.trim()) return [];
      const res = await fetch(`/api/areas/search?q=${encodeURIComponent(deferredSearchQuery)}&servico=rocagem`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: deferredSearchQuery.trim().length > 0,
    staleTime: 30000, // Cache por 30 segundos
  });

  const suggestions = searchResults.slice(0, 8); // Mostrar no máximo 8 sugestões

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler de mudança com debounce e transição de baixa prioridade
  const handleInputChange = (value: string) => {
    // 1. Atualizar input IMEDIATAMENTE (sem esperar nada)
    setLocalValue(value);
    
    // 2. Cancelar debounce anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 3. Propagar ao dashboard após 300ms, em transição de baixa prioridade
    debounceTimerRef.current = setTimeout(() => {
      startTransition(() => {
        onSearchChange(value);
      });
    }, 300);
  };

  // Cleanup do timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Mostrar sugestões quando há busca e resultados
  useEffect(() => {
    setShowSuggestions(localValue.trim().length > 0 && suggestions.length > 0);
    setSelectedIndex(-1);
  }, [localValue, suggestions.length]);

  // Calcular posição do dropdown
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px de margem
        left: rect.left,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showSuggestions]);

  const handleFilterClick = (filter: TimeRangeFilter) => {
    onFilterChange(activeFilter === filter ? null : filter);
  };

  const handleSuggestionClick = (area: ServiceArea) => {
    onAreaSelect?.(area);
    setLocalValue('');
    
    // Limpar debounce pendente e propagar limpeza imediatamente
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChange('');
    
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setLocalValue('');
    
    // Limpar debounce pendente e propagar limpeza imediatamente
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChange('');
    
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="bg-background border-b border-border px-3 py-2 space-y-2">
      {/* Linha 1: Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Buscar por endereço ou bairro..."
            value={localValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9 h-9 text-sm"
            data-testid="input-search-areas"
            autoComplete="off"
          />
          {localValue && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dropdown de sugestões - Renderizado via Portal */}
          {showSuggestions && dropdownPosition && typeof document !== 'undefined' && createPortal(
            <div 
              ref={dropdownRef}
              className="fixed bg-popover border border-border rounded-md shadow-2xl z-[1200] max-h-96 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
              data-testid="autocomplete-dropdown"
            >
              {suggestions.map((area, index) => (
                <button
                  key={area.id}
                  onClick={() => handleSuggestionClick(area)}
                  className={`
                    w-full text-left px-3 py-2 text-sm border-b border-border last:border-b-0
                    transition-colors
                    ${index === selectedIndex 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                    }
                  `}
                  data-testid={`suggestion-${area.id}`}
                >
                  <div className="font-medium">
                    {highlightMatch(area.endereco || 'Sem endereço', localValue)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {area.bairro && (
                      <span>{highlightMatch(area.bairro, localValue)}</span>
                    )}
                    {area.lote && (
                      <span className="ml-2">
                        Lote: {highlightMatch(area.lote.toString(), localValue)}
                      </span>
                    )}
                    {area.metragem_m2 && (
                      <span className="ml-2">{area.metragem_m2}m²</span>
                    )}
                  </div>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
        
        {/* Contador de resultados */}
        {filteredCount !== undefined && totalCount !== undefined && (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {filteredCount} / {totalCount}
          </Badge>
        )}
      </div>

      {/* Linha 2: Título e Filtros de categoria (chips horizontais com scroll) */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
          ROÇADO HÁ
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1">
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
