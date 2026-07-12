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

