// ─── Helpers de exibição de nível/cor ────────────────────────────────────────

export const nivelLabel = (n: number | null | undefined): string => {
  if (n === 7) return 'RH/ Servidores da rede'
  if (n === 2) return 'Nível 2 - Diretor'
  if (n === 3) return 'Nível 3 - Coord. / Secretário'
  if (n === 4) return 'Nível 4 - Professor'
  if (n === 5) return 'Nível 5 - Chefe de Equipe'
  if (n === 6) return 'Nível 6 - Operacional'
  if (n === 1) return 'Nível 1 - Administrador Global'
  return 'Pendente / Sem Permissão'
}

export const nivelColor = (nivel: string): string => {
  if (nivel.includes('RH/') || nivel.includes('Servidores da rede')) return 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  if (nivel.includes('ROOT')) return 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30'
  if (nivel.includes('Nível 2')) return 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30'
  if (nivel.includes('Nível 3')) return 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30'
  if (nivel.includes('Nível 4')) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (nivel.includes('Nível 5')) return 'text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (nivel.includes('Nível 6')) return 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30'
  return 'text-zinc-700 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
}
