// ─── Helpers de exibição de nível/cor ────────────────────────────────────────

export const nivelLabel = (n: number | null | undefined): string => {
  if (n === 2) return 'Nível 2 - Diretor'
  if (n === 3) return 'Nível 3 - Coord. / Secretário'
  if (n === 4) return 'Nível 4 - Professor'
  if (n === 5) return 'Nível 5 - Chefe de Equipe'
  if (n === 6) return 'Nível 6 - Operacional'
  if (n === 1) return 'Nível 1 - Administrador Global'
  return 'Pendente / Sem Permissão'
}

export const nivelColor = (nivel: string): string => {
  if (nivel.includes('ROOT')) return 'text-red-400 bg-red-400/10 border-red-400/30'
  if (nivel.includes('Nível 2')) return 'text-purple-400 bg-purple-400/10 border-purple-400/30'
  if (nivel.includes('Nível 3')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  if (nivel.includes('Nível 4')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
  if (nivel.includes('Nível 5')) return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
  if (nivel.includes('Nível 6')) return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
  return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'
}
