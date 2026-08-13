'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissionSimulationStore } from '@/store/usePermissionSimulationStore'
import { createClient } from '@/lib/supabaseClient'
import { UserCheck, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export function SimulationBanner() {
  const router = useRouter()
  const supabase = createClient()
  const {
    isSimulating,
    simulatedFuncionario,
    simulatedVinculos,
    encerrarSimulacao,
    restaurarSimulacaoSeExistir,
  } = usePermissionSimulationStore()

  useEffect(() => {
    restaurarSimulacaoSeExistir(supabase)
  }, [supabase, restaurarSimulacaoSeExistir])

  if (!isSimulating || !simulatedFuncionario) {
    return null
  }

  const escolaNome =
    simulatedVinculos.length > 0 && simulatedVinculos[0].escolaNome
      ? simulatedVinculos[0].escolaNome
      : 'Sem escola específica'

  const cargoNome = simulatedFuncionario.cargo || 'Cargo não especificado'

  const handleEncerrar = () => {
    encerrarSimulacao()
    toast.success('Simulação encerrada. Privilégios ROOT restaurados!')
    window.location.href = '/admin'
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-700 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/40 z-20 relative select-none animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/40 px-2.5 py-1 rounded-full text-amber-200 text-[11px] font-black uppercase tracking-wider shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-block rounded-full h-2 w-2 bg-amber-300" />
          </span>
          <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
          <span>Simulação Ativa</span>
        </div>

        <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
          <span>Navegando como:</span>
          <strong className="bg-black/30 px-2 py-0.5 rounded text-amber-100 font-bold border border-white/10 truncate">
            {simulatedFuncionario.nome}
          </strong>
          <span className="hidden md:inline-block text-amber-200 text-xs font-normal">
            ({cargoNome} — {escolaNome})
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleEncerrar}
        className="bg-rose-600 hover:bg-rose-700 active:scale-95 border border-rose-400/50 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ml-auto sm:ml-0 shrink-0"
      >
        <XCircle className="w-4 h-4" />
        <span>Encerrar Simulação</span>
      </button>
    </div>
  )
}
