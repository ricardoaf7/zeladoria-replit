import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data string (YYYY-MM-DD ou ISO) para exibição em pt-BR
 * Evita problemas de timezone tratando datas como locais
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  // Se é uma data no formato YYYY-MM-DD (sem horário)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  }
  
  // Se é ISO completo com horário
  return new Date(dateString).toLocaleDateString('pt-BR');
}
