import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const urlToBase64 = async (url: string): Promise<string> => {
  const corsBustedUrl = `${url}${url.includes('?') ? '&' : '?'}cors=1&t=${Date.now()}`
  const response = await fetch(corsBustedUrl)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Formata uma data no padrão pt-BR (DD/MM/AAAA) tratando o fuso horário de forma segura.
 * 
 * @param date Data a ser formatada (Date, string ISO, timestamp).
 * @param fallback Valor de retorno caso a data seja inválida ou nula.
 * @returns Data formatada ou o fallback.
 */
export function formatDate(date: any, fallback: string = '-'): string {
  if (!date) return fallback
  try {
    let d = new Date(date)
    
    // Mitigação de bug de fuso horário do JS em strings YYYY-MM-DD simples (UTC vs Local)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      d = new Date(date + 'T00:00:00')
    }
    
    if (isNaN(d.getTime())) return fallback
    return d.toLocaleDateString('pt-BR')
  } catch {
    return fallback
  }
}

