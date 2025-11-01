/**
 * Sistema de feriados nacionais e municipais de Londrina
 * para cálculo de dias úteis no agendamento de roçagem
 */

export interface Holiday {
  date: string; // formato YYYY-MM-DD
  name: string;
  type: 'nacional' | 'municipal';
}

/**
 * Feriados fixos nacionais do Brasil
 */
const nationalHolidays: Omit<Holiday, 'date'>[] = [
  { name: 'Ano Novo', type: 'nacional' },
  { name: 'Tiradentes', type: 'nacional' },
  { name: 'Dia do Trabalhador', type: 'nacional' },
  { name: 'Independência do Brasil', type: 'nacional' },
  { name: 'Nossa Senhora Aparecida', type: 'nacional' },
  { name: 'Finados', type: 'nacional' },
  { name: 'Proclamação da República', type: 'nacional' },
  { name: 'Consciência Negra', type: 'nacional' },
  { name: 'Natal', type: 'nacional' },
];

/**
 * Feriados fixos municipais de Londrina, PR
 */
const municipalHolidays: Omit<Holiday, 'date'>[] = [
  { name: 'Aniversário de Londrina', type: 'municipal' },
];

/**
 * Retorna a data da Páscoa para um ano específico (algoritmo de Meeus)
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Gera lista de feriados para um ano específico
 */
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  
  // Feriados fixos nacionais
  holidays.push({ date: `${year}-01-01`, name: 'Ano Novo', type: 'nacional' });
  holidays.push({ date: `${year}-04-21`, name: 'Tiradentes', type: 'nacional' });
  holidays.push({ date: `${year}-05-01`, name: 'Dia do Trabalhador', type: 'nacional' });
  holidays.push({ date: `${year}-09-07`, name: 'Independência do Brasil', type: 'nacional' });
  holidays.push({ date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'nacional' });
  holidays.push({ date: `${year}-11-02`, name: 'Finados', type: 'nacional' });
  holidays.push({ date: `${year}-11-15`, name: 'Proclamação da República', type: 'nacional' });
  holidays.push({ date: `${year}-11-20`, name: 'Consciência Negra', type: 'nacional' });
  holidays.push({ date: `${year}-12-25`, name: 'Natal', type: 'nacional' });
  
  // Feriado municipal de Londrina
  holidays.push({ date: `${year}-12-10`, name: 'Aniversário de Londrina', type: 'municipal' });
  
  // Feriados móveis (baseados na Páscoa)
  const easter = getEasterDate(year);
  
  // Carnaval (47 dias antes da Páscoa)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.push({
    date: formatDate(carnival),
    name: 'Carnaval',
    type: 'nacional'
  });
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: formatDate(goodFriday),
    name: 'Sexta-feira Santa',
    type: 'nacional'
  });
  
  // Corpus Christi (60 dias depois da Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    date: formatDate(corpusChristi),
    name: 'Corpus Christi',
    type: 'nacional'
  });
  
  return holidays;
}

/**
 * Formata uma data no formato YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cache de feriados por ano para evitar recalcular
 */
const holidaysCache = new Map<number, Set<string>>();

/**
 * Verifica se uma data é feriado
 */
export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  
  // Busca no cache
  if (!holidaysCache.has(year)) {
    const holidays = getHolidaysForYear(year);
    const holidayDates = new Set(holidays.map(h => h.date));
    holidaysCache.set(year, holidayDates);
  }
  
  const dateStr = formatDate(date);
  return holidaysCache.get(year)!.has(dateStr);
}

/**
 * Verifica se uma data é final de semana (sábado ou domingo)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = domingo, 6 = sábado
}

/**
 * Verifica se uma data é dia útil (não é fim de semana nem feriado)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * Adiciona dias úteis a uma data
 * @param startDate Data inicial
 * @param businessDays Número de dias úteis a adicionar
 * @returns Nova data após adicionar os dias úteis
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    
    if (isBusinessDay(result)) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Calcula a diferença em dias úteis entre duas datas
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns Número de dias úteis entre as datas
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalizar para início do dia
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  let businessDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isBusinessDay(current)) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
}

/**
 * Retorna a próxima data útil a partir de uma data
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}
