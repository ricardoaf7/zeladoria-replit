/**
 * Algoritmo de cálculo automático de previsão de roçagem
 * Considera produção diária por lote e dias úteis (exclui fins de semana e feriados)
 */

import { addBusinessDays, isBusinessDay } from './holidays';
import type { ServiceArea, AppConfig } from './schema';

export interface ScheduleCalculationResult {
  areaId: number;
  proximaPrevisao: string; // formato YYYY-MM-DD
  daysToComplete: number;
}

/**
 * Calcula a próxima previsão de roçagem para todas as áreas de um lote
 * @param areas Todas as áreas do lote
 * @param lote Número do lote (1 ou 2)
 * @param productionRate Taxa de produção em m²/dia
 * @param startDate Data de início do cálculo (hoje ou data futura)
 * @returns Lista de previsões calculadas
 */
export function calculateMowingSchedule(
  areas: ServiceArea[],
  lote: number,
  productionRate: number,
  startDate: Date = new Date()
): ScheduleCalculationResult[] {
  // Filtrar apenas áreas do lote especificado que não estão em agendamento manual
  const loteAreas = areas.filter(a => 
    a.lote === lote && 
    a.servico === 'rocagem' && 
    !a.manualSchedule
  );
  
  // Ordenar por ordem (se existir) ou por ID
  const sortedAreas = loteAreas.sort((a, b) => {
    if (a.ordem !== undefined && a.ordem !== null && 
        b.ordem !== undefined && b.ordem !== null) {
      return a.ordem - b.ordem;
    }
    return a.id - b.id;
  });
  
  const results: ScheduleCalculationResult[] = [];
  
  // Normalizar data de início para início do dia
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  // Garantir que começamos em um dia útil
  let schedulingDate = new Date(currentDate);
  while (!isBusinessDay(schedulingDate)) {
    schedulingDate.setDate(schedulingDate.getDate() + 1);
  }
  
  for (const area of sortedAreas) {
    // Calcular dias necessários para completar essa área
    const areaSize = area.metragem_m2 || 1000; // default 1000m² se não especificado
    const daysNeeded = Math.ceil(areaSize / productionRate);
    
    // Registrar data de início prevista
    const startDateStr = formatDate(schedulingDate);
    
    // Adicionar dias úteis necessários
    const endDate = addBusinessDays(schedulingDate, daysNeeded - 1);
    
    results.push({
      areaId: area.id,
      proximaPrevisao: startDateStr,
      daysToComplete: daysNeeded,
    });
    
    // Próxima área começa no dia seguinte (útil) após o término
    schedulingDate = new Date(endDate);
    schedulingDate.setDate(schedulingDate.getDate() + 1);
    
    // Garantir que é dia útil
    while (!isBusinessDay(schedulingDate)) {
      schedulingDate.setDate(schedulingDate.getDate() + 1);
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
