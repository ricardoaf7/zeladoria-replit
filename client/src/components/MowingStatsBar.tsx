import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, TrendingUp, Target, Calendar, BarChart3, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface LoteStats {
  meta: number;
  totalM2: number;
  areasCount: number;
  mediaDiaria: number;
  faltaParaMeta: number;
  mediaNecessaria: number;
  percentualMeta: number;
  rocadoOntem: number;
  areasOntem: number;
}

interface MowingStats {
  periodo: { from: string; to: string };
  metaMensal: number;
  totalRocado: number;
  totalAreas: number;
  mediaDiaria: number;
  faltaParaMeta: number;
  diasDecorridos: number;
  diasRestantes: number;
  mediaNecessaria: number;
  percentualMeta: number;
  rocadoOntem: number;
  areasOntem: number;
  lote1: LoteStats;
  lote2: LoteStats;
}

function formatM2(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatM2Decimal(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProgressBar({ percent, className = '', color }: { percent: number; className?: string; color?: string }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const barColor = color || (clampedPercent >= 80 ? 'bg-emerald-500' : clampedPercent >= 50 ? 'bg-amber-500' : 'bg-red-500');
  
  return (
    <div className={`h-2 rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
}

function StatItem({ label, value, subtext, icon: Icon }: { label: string; value: string; subtext?: string; icon?: typeof TrendingUp }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-sm font-bold text-foreground">{value}</div>
      {subtext && <div className="text-[10px] text-muted-foreground">{subtext}</div>}
    </div>
  );
}

interface EditableMetaProps {
  label: string;
  value: number;
  configKey: string;
  color?: string;
}

function EditableMeta({ label, value, configKey, color }: EditableMetaProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const mutation = useMutation({
    mutationFn: async (newMeta: number) => {
      await apiRequest('PATCH', '/api/config', { [configKey]: newMeta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === '/api/stats/rocagem';
      }});
      setEditing(false);
    },
  });

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput(value.toString());
    setEditing(true);
  };

  const handleSave = () => {
    const parsed = parseInt(input.replace(/\D/g, ''));
    if (parsed > 0) mutation.mutate(parsed);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${color ? color : 'text-muted-foreground'}`}>
        <Target className="h-3 w-3" />
        {label}
        {!editing && (
          <button onClick={handleStart} className="ml-1 text-muted-foreground/60" data-testid={`button-edit-${configKey}`}>
            <Pencil className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
            className="h-7 w-[100px] text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            data-testid={`input-edit-${configKey}`}
          />
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleSave(); }} disabled={mutation.isPending} data-testid={`button-save-${configKey}`}>
            <Check className="h-3 w-3 text-emerald-500" />
          </Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(false); }} data-testid={`button-cancel-${configKey}`}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="text-sm font-bold text-foreground">{formatM2(value)} m²</div>
      )}
    </div>
  );
}

interface MowingStatsBarProps {
  visible?: boolean;
  onPeriodChange?: (from: string, to: string) => void;
  onPeriodClear?: () => void;
}

export function MowingStatsBar({ visible = true, onPeriodChange, onPeriodClear }: MowingStatsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const queryParams = activeFrom && activeTo ? `?from=${activeFrom}&to=${activeTo}` : '';

  const { data: stats, isLoading, isError } = useQuery<MowingStats>({
    queryKey: ['/api/stats/rocagem', activeFrom, activeTo],
    queryFn: async () => {
      const res = await fetch(`/api/stats/rocagem${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (!visible) return null;

  const handleApplyPeriod = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setActiveFrom(customFrom);
      setActiveTo(customTo);
      onPeriodChange?.(customFrom, customTo);
    }
  };

  const handleClearPeriod = () => {
    setCustomFrom('');
    setCustomTo('');
    setActiveFrom('');
    setActiveTo('');
    onPeriodClear?.();
  };

  if (isError) {
    return (
      <div className="bg-background border-b border-border px-3 py-2 flex items-center gap-2" data-testid="mowing-stats-error">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-xs text-muted-foreground">Erro ao carregar estatisticas</span>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="bg-background border-b border-border px-3 py-2" data-testid="mowing-stats-loading">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="h-2 flex-1 rounded-full bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      </div>
    );
  }

  const isCustomPeriod = activeFrom && activeTo;

  return (
    <div className="bg-background border-b border-border" data-testid="mowing-stats-bar">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex flex-col gap-1.5 transition-colors"
        data-testid="button-toggle-stats"
      >
        <div className="flex items-center gap-3 w-full">
          <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-blue-500 font-semibold whitespace-nowrap">L1</span>
            <ProgressBar percent={stats.lote1.percentualMeta} className="flex-1 min-w-[40px]" color="bg-blue-500" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid="text-lote1-progress">
              {formatM2(stats.lote1.totalM2)} / {formatM2(stats.lote1.meta)} m²
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              ({stats.lote1.percentualMeta.toFixed(1)}%)
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3 w-full pl-7">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-violet-500 font-semibold whitespace-nowrap">L2</span>
            <ProgressBar percent={stats.lote2.percentualMeta} className="flex-1 min-w-[40px]" color="bg-violet-500" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid="text-lote2-progress">
              {formatM2(stats.lote2.totalM2)} / {formatM2(stats.lote2.meta)} m²
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              ({stats.lote2.percentualMeta.toFixed(1)}%)
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-border pt-3" data-testid="stats-expanded-panel">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatItem
              icon={TrendingUp}
              label={isCustomPeriod ? "Total no periodo" : "Total no mes"}
              value={`${formatM2(stats.totalRocado)} m²`}
              subtext={`${stats.totalAreas} areas`}
            />
            <StatItem
              label="Media diaria geral"
              value={`${formatM2Decimal(stats.mediaDiaria)} m²`}
              subtext={`${stats.diasDecorridos} dias uteis`}
            />
            <StatItem
              icon={Calendar}
              label="Rocado ontem"
              value={`${formatM2(stats.rocadoOntem)} m²`}
              subtext={`${stats.areasOntem} areas`}
            />
          </div>

          <div className="border-t border-border pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-500">Lote 1</span>
                <ProgressBar percent={stats.lote1.percentualMeta} className="flex-1" color="bg-blue-500" />
                <span className="text-[10px] text-muted-foreground font-semibold">{stats.lote1.percentualMeta.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableMeta label="Meta L1" value={stats.lote1.meta} configKey="metaLote1" color="text-blue-500" />
                <StatItem label="Rocado" value={`${formatM2(stats.lote1.totalM2)} m²`} subtext={`${stats.lote1.areasCount} areas`} />
                <StatItem label="Media diaria" value={`${formatM2Decimal(stats.lote1.mediaDiaria)} m²`} />
                {!isCustomPeriod && (
                  <StatItem label="Falta p/ meta" value={`${formatM2(stats.lote1.faltaParaMeta)} m²`} subtext={`${stats.diasRestantes} dias uteis`} />
                )}
                {!isCustomPeriod && (
                  <StatItem label="Media necessaria" value={`${formatM2Decimal(stats.lote1.mediaNecessaria)} m²/dia`} />
                )}
                <StatItem label="Ontem" value={`${formatM2(stats.lote1.rocadoOntem)} m²`} subtext={`${stats.lote1.areasOntem} areas`} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-500">Lote 2</span>
                <ProgressBar percent={stats.lote2.percentualMeta} className="flex-1" color="bg-violet-500" />
                <span className="text-[10px] text-muted-foreground font-semibold">{stats.lote2.percentualMeta.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableMeta label="Meta L2" value={stats.lote2.meta} configKey="metaLote2" color="text-violet-500" />
                <StatItem label="Rocado" value={`${formatM2(stats.lote2.totalM2)} m²`} subtext={`${stats.lote2.areasCount} areas`} />
                <StatItem label="Media diaria" value={`${formatM2Decimal(stats.lote2.mediaDiaria)} m²`} />
                {!isCustomPeriod && (
                  <StatItem label="Falta p/ meta" value={`${formatM2(stats.lote2.faltaParaMeta)} m²`} subtext={`${stats.diasRestantes} dias uteis`} />
                )}
                {!isCustomPeriod && (
                  <StatItem label="Media necessaria" value={`${formatM2Decimal(stats.lote2.mediaNecessaria)} m²/dia`} />
                )}
                <StatItem label="Ontem" value={`${formatM2(stats.lote2.rocadoOntem)} m²`} subtext={`${stats.lote2.areasOntem} areas`} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Busca por periodo</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">De:</label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                  data-testid="input-stats-from"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Ate:</label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                  data-testid="input-stats-to"
                />
              </div>
              <Button
                size="sm"
                onClick={handleApplyPeriod}
                disabled={!customFrom || !customTo || customFrom > customTo}
                data-testid="button-apply-period"
              >
                Aplicar
              </Button>
              {isCustomPeriod && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearPeriod}
                  data-testid="button-clear-period"
                >
                  Limpar
                </Button>
              )}
            </div>
            {customFrom && customTo && customFrom > customTo && (
              <div className="mt-1 text-xs text-destructive">
                A data inicial deve ser anterior a data final
              </div>
            )}
            {isCustomPeriod && (
              <div className="mt-2 text-xs text-muted-foreground">
                Periodo: {new Date(stats.periodo.from + 'T12:00:00').toLocaleDateString('pt-BR')} a{' '}
                {new Date(stats.periodo.to + 'T12:00:00').toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
