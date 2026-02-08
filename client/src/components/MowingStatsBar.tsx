import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, TrendingUp, Target, Calendar, BarChart3, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface LoteStats {
  totalM2: number;
  areasCount: number;
  mediaDiaria: number;
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

function LoteSection({ title, stats }: { title: string; stats: LoteStats }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatItem label="Rocado" value={`${formatM2(stats.totalM2)} m²`} subtext={`${stats.areasCount} areas`} />
        <StatItem label="Media diaria" value={`${formatM2(stats.mediaDiaria)} m²`} />
        <StatItem label="Ontem" value={`${formatM2(stats.rocadoOntem)} m²`} subtext={`${stats.areasOntem} areas`} />
      </div>
    </div>
  );
}

interface MowingStatsBarProps {
  visible?: boolean;
}

export function MowingStatsBar({ visible = true }: MowingStatsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');

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

  const updateMetaMutation = useMutation({
    mutationFn: async (newMeta: number) => {
      await apiRequest('PATCH', '/api/config', { metaMensal: newMeta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === '/api/stats/rocagem';
      }});
      setEditingMeta(false);
    },
  });

  const handleStartEditMeta = useCallback(() => {
    if (stats) {
      setMetaInput(stats.metaMensal.toString());
      setEditingMeta(true);
    }
  }, [stats]);

  const handleSaveMeta = useCallback(() => {
    const parsed = parseInt(metaInput.replace(/\D/g, ''));
    if (parsed > 0) {
      updateMetaMutation.mutate(parsed);
    }
  }, [metaInput, updateMetaMutation]);

  const handleCancelEditMeta = useCallback(() => {
    setEditingMeta(false);
  }, []);

  if (!visible) return null;

  const handleApplyPeriod = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setActiveFrom(customFrom);
      setActiveTo(customTo);
    }
  };

  const handleClearPeriod = () => {
    setCustomFrom('');
    setCustomTo('');
    setActiveFrom('');
    setActiveTo('');
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
  const lote1Percent = stats.metaMensal > 0 ? (stats.lote1.totalM2 / stats.metaMensal) * 100 : 0;
  const lote2Percent = stats.metaMensal > 0 ? (stats.lote2.totalM2 / stats.metaMensal) * 100 : 0;

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
            <ProgressBar percent={stats.percentualMeta} className="flex-1 min-w-[60px]" />
            <span className="text-xs font-bold text-foreground whitespace-nowrap" data-testid="text-stats-progress">
              {formatM2(stats.totalRocado)} / {formatM2(stats.metaMensal)} m²
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              ({stats.percentualMeta.toFixed(1)}%)
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
            <span className="text-[10px] text-blue-500 font-semibold whitespace-nowrap w-10 text-left">L1</span>
            <ProgressBar percent={lote1Percent} className="flex-1 min-w-[40px]" color="bg-blue-500" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid="text-lote1-progress">
              {formatM2(stats.lote1.totalM2)} m²
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-violet-500 font-semibold whitespace-nowrap w-10 text-left">L2</span>
            <ProgressBar percent={lote2Percent} className="flex-1 min-w-[40px]" color="bg-violet-500" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid="text-lote2-progress">
              {formatM2(stats.lote2.totalM2)} m²
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-border pt-3" data-testid="stats-expanded-panel">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <Target className="h-3 w-3" />
                Meta mensal
                {!editingMeta && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEditMeta(); }}
                    className="ml-1 text-muted-foreground/60 transition-colors"
                    data-testid="button-edit-meta"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              {editingMeta ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="text"
                    value={metaInput}
                    onChange={(e) => setMetaInput(e.target.value.replace(/\D/g, ''))}
                    className="h-7 w-[100px] text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveMeta();
                      if (e.key === 'Escape') handleCancelEditMeta();
                    }}
                    data-testid="input-edit-meta"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleSaveMeta(); }}
                    disabled={updateMetaMutation.isPending}
                    data-testid="button-save-meta"
                  >
                    <Check className="h-3 w-3 text-emerald-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleCancelEditMeta(); }}
                    data-testid="button-cancel-meta"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm font-bold text-foreground">{formatM2(stats.metaMensal)} m²</div>
              )}
            </div>
            <StatItem
              icon={TrendingUp}
              label={isCustomPeriod ? "Rocado no periodo" : "Rocado no mes"}
              value={`${formatM2(stats.totalRocado)} m²`}
              subtext={`${stats.totalAreas} areas (${stats.percentualMeta.toFixed(1)}%)`}
            />
            <StatItem
              label="Media diaria"
              value={`${formatM2Decimal(stats.mediaDiaria)} m²`}
              subtext={`${stats.diasDecorridos} dias uteis`}
            />
            {!isCustomPeriod && (
              <StatItem
                label="Falta p/ meta"
                value={`${formatM2(stats.faltaParaMeta)} m²`}
                subtext={`${stats.diasRestantes} dias uteis restantes`}
              />
            )}
            {!isCustomPeriod && (
              <StatItem
                label="Media necessaria"
                value={`${formatM2Decimal(stats.mediaNecessaria)} m²/dia`}
                subtext="para atingir meta"
              />
            )}
            <StatItem
              icon={Calendar}
              label="Rocado ontem"
              value={`${formatM2(stats.rocadoOntem)} m²`}
              subtext={`${stats.areasOntem} areas`}
            />
          </div>

          <div className="border-t border-border pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-500">Lote 1</span>
                <ProgressBar percent={lote1Percent} className="flex-1" color="bg-blue-500" />
                <span className="text-[10px] text-muted-foreground">{lote1Percent.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatItem label="Rocado" value={`${formatM2(stats.lote1.totalM2)} m²`} subtext={`${stats.lote1.areasCount} areas`} />
                <StatItem label="Media diaria" value={`${formatM2(stats.lote1.mediaDiaria)} m²`} />
                <StatItem label="Ontem" value={`${formatM2(stats.lote1.rocadoOntem)} m²`} subtext={`${stats.lote1.areasOntem} areas`} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-violet-500">Lote 2</span>
                <ProgressBar percent={lote2Percent} className="flex-1" color="bg-violet-500" />
                <span className="text-[10px] text-muted-foreground">{lote2Percent.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatItem label="Rocado" value={`${formatM2(stats.lote2.totalM2)} m²`} subtext={`${stats.lote2.areasCount} areas`} />
                <StatItem label="Media diaria" value={`${formatM2(stats.lote2.mediaDiaria)} m²`} />
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
