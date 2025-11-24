/**
 * Algoritmo de cálculo automático de previsão de roçagem
 * Ciclo fixo de 60 dias entre roçagens
 * Próxima roçagem = Última roçagem + 60 dias
 */

import type { ServiceArea, AppConfig } from './schema';

const MOWING_CYCLE_DAYS = 60;

export interface ScheduleCalculationResult {
  areaId: number;
  proximaPrevisao: string; // formato YYYY-MM-DD
  daysToComplete: number;
}

/**
 * Calcula a próxima previsão de roçagem para uma área
 * Ciclo fixo: próxima roçagem = última roçagem + 60 dias
 * Se nunca foi roçada, retorna null (área aparece sem previsão)
 * @param area Área para calcular
 * @returns Resultado do cálculo ou null
 */
export function calculateNextMowing(area: ServiceArea): ScheduleCalculationResult | null {
  // Se tem agendamento manual, não calcula automaticamente
  if (area.manualSchedule) {
    return null;
  }
  
  // Se nunca foi roçada, não tem como calcular previsão
  // Área deve aparecer sem previsão até primeira roçagem
  if (!area.ultimaRocagem) {
    return null;
  }
  
  // Calcular próxima roçagem = última + 60 dias
  const lastMowing = new Date(area.ultimaRocagem);
  lastMowing.setHours(0, 0, 0, 0);
  
  const nextMowingDate = new Date(lastMowing);
  nextMowingDate.setDate(lastMowing.getDate() + MOWING_CYCLE_DAYS);
  
  return {
    areaId: area.id,
    proximaPrevisao: formatDate(nextMowingDate),
    daysToComplete: 1,
  };
}

/**
 * Calcula a próxima previsão de roçagem para todas as áreas de um lote
 * @param areas Todas as áreas do lote
 * @param lote Número do lote (1 ou 2)
 * @param productionRate Taxa de produção em m²/dia (não usado no novo algoritmo)
 * @param startDate Data de início do cálculo (não usado no novo algoritmo)
 * @returns Lista de previsões calculadas
 */
export function calculateMowingSchedule(
  areas: ServiceArea[],
  lote: number,
  productionRate: number,
  startDate: Date = new Date()
): ScheduleCalculationResult[] {
  // Filtrar apenas áreas do lote especificado
  const loteAreas = areas.filter(a => 
    a.lote === lote && 
    a.servico === 'rocagem'
  );
  
  const results: ScheduleCalculationResult[] = [];
  
  for (const area of loteAreas) {
    const result = calculateNextMowing(area);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Recalcula previsões para um lote específico após registro de roçagem
 * @param allAreas Todas as áreas do sistema
 * @param completedAreaIds IDs das áreas que acabaram de ser concluídas
 * @param config Configuração do sistema com taxas de produção
 * @returns Atualizações de previsão para aplicar
 */
export function recalculateAfterCompletion(
  allAreas: ServiceArea[],
  completedAreaIds: number[],
  config: AppConfig
): ScheduleCalculationResult[] {
  // Identificar lotes afetados
  const affectedLotes = new Set<number>();
  
  for (const areaId of completedAreaIds) {
    const area = allAreas.find(a => a.id === areaId);
    if (area && area.lote) {
      affectedLotes.add(area.lote);
    }
  }
  
  // Recalcular cada lote afetado
  const allResults: ScheduleCalculationResult[] = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  // Converter Set para Array para iteração
  const lotesArray = Array.from(affectedLotes);
  
  for (const lote of lotesArray) {
    const productionRate = lote === 1 
      ? config.mowingProductionRate.lote1 
      : config.mowingProductionRate.lote2;
    
    const loteResults = calculateMowingSchedule(
      allAreas,
      lote,
      productionRate,
      tomorrow
    );
    
    allResults.push(...loteResults);
  }
  
  return allResults;
}

/**
 * Formata data no formato YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula estatísticas de agendamento para um lote
 */
export interface ScheduleStats {
  totalAreas: number;
  totalDaysEstimated: number;
  completionDate: string;
  areasPerDay: number;
}

export function calculateScheduleStats(
  areas: ServiceArea[],
  lote: number,
  productionRate: number
): ScheduleStats {
  const loteAreas = areas.filter(a => 
    a.lote === lote && 
    a.servico === 'rocagem' &&
    !a.manualSchedule
  );
  
  const schedule = calculateMowingSchedule(loteAreas, lote, productionRate);
  
  if (schedule.length === 0) {
    return {
      totalAreas: 0,
      totalDaysEstimated: 0,
      completionDate: '',
      areasPerDay: 0,
    };
  }
  
  const lastSchedule = schedule[schedule.length - 1];
  const totalDays = schedule.reduce((sum, s) => sum + s.daysToComplete, 0);
  
  return {
    totalAreas: loteAreas.length,
    totalDaysEstimated: totalDays,
    completionDate: lastSchedule.proximaPrevisao,
    areasPerDay: productionRate,
  };
}
