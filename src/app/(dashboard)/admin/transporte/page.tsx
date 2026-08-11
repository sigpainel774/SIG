'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

import { VeiculoItem } from '@/components/modals/modal-veiculo'
import { RotaItem } from '@/components/modals/modal-rota'

// Imports dinâmicos das abas com fallback skeleton
const VeiculosTab = dynamic(() => import('./tabs/VeiculosTab').then((m) => m.VeiculosTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando gestão de veículos...</div>,
})
const RotasTab = dynamic(() => import('./tabs/RotasTab').then((m) => m.RotasTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando rotas de transporte...</div>,
})
const AlunosTab = dynamic(() => import('./tabs/AlunosTab').then((m) => m.AlunosTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando alunos do transporte...</div>,
})
const CombustivelTab = dynamic(() => import('./tabs/CombustivelTab').then((m) => m.CombustivelTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando controle de combustível...</div>,
})
const ManutencoesTab = dynamic(() => import('./tabs/ManutencoesTab').then((m) => m.ManutencoesTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico de manutenções...</div>,
})

// Imports dinâmicos dos modais sob demanda
const ModalVeiculo = dynamic(() => import('@/components/modals/modal-veiculo').then((m) => m.ModalVeiculo), { ssr: false })
const ModalRota = dynamic(() => import('@/components/modals/modal-rota').then((m) => m.ModalRota), { ssr: false })
const ModalAbastecimento = dynamic(() => import('@/components/modals/modal-abastecimento').then((m) => m.ModalAbastecimento), { ssr: false })
const ModalManutencao = dynamic(() => import('@/components/modals/modal-manutencao').then((m) => m.ModalManutencao), { ssr: false })
const ModalAlocarAlunoTransporte = dynamic(() => import('@/components/modals/modal-alocar-aluno-transporte').then((m) => m.ModalAlocarAlunoTransporte), { ssr: false })

export default function AdminTransportePage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'veiculos' | 'rotas' | 'alunos' | 'combustivel' | 'manutencoes'>('veiculos')

  // Listas auxiliares compartilhadas para modais
  const [motoristas, setMotoristas] = useState<Array<{ id: string; nome: string }>>([])
  const [escolas, setEscolas] = useState<Array<{ id: string; nome: string }>>([])
  const [veiculosLista, setVeiculosLista] = useState<Array<{ id: string; modelo: string; placa: string; capacidade: number }>>([])
  const [rotasLista, setRotasLista] = useState<Array<{ id: string; nome: string; turno: string; escola_id?: string | null }>>([])

  // Estados dos modais
  const [modalVeiculoOpen, setModalVeiculoOpen] = useState(false)
  const [modalRotaOpen, setModalRotaOpen] = useState(false)
  const [modalAbastecimentoOpen, setModalAbastecimentoOpen] = useState(false)
  const [modalManutencaoOpen, setModalManutencaoOpen] = useState(false)
  const [modalAlocarAlunoOpen, setModalAlocarAlunoOpen] = useState(false)

  const [editandoVeiculo, setEditandoVeiculo] = useState<VeiculoItem | null>(null)
  const [editandoRota, setEditandoRota] = useState<RotaItem | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadAuxiliares = useCallback(async () => {
    try {
      const [funcsRes, escRes, veicsRes, rotasRes] = await Promise.all([
        supabase.from('funcionarios').select('id, nome').eq('status', 'ativo').is('deleted_at', null).order('nome'),
        supabase.from('escolas').select('id, nome').is('deleted_at', null).order('nome'),
        (supabase as any).from('veiculos').select('id, modelo, placa, capacidade').order('modelo'),
        (supabase as any).from('rotas_transporte').select('id, nome, turno, escola_id').order('nome'),
      ])
      if (isMounted.current) {
        if (funcsRes.data) setMotoristas(funcsRes.data)
        if (escRes.data) setEscolas(escRes.data)
        if (veicsRes.data) setVeiculosLista(veicsRes.data)
        if (rotasRes.data) setRotasLista(rotasRes.data)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados auxiliares do transporte:', err)
      if (isMounted.current) toast.error('Erro ao carregar dados de transporte.')
    }
  }, [supabase])

  useEffect(() => {
    loadAuxiliares()
  }, [loadAuxiliares])

  const handleOpenNovoVeiculo = () => {
    setEditandoVeiculo(null)
    setModalVeiculoOpen(true)
  }

  const handleOpenEditarVeiculo = (v: VeiculoItem) => {
    setEditandoVeiculo(v)
    setModalVeiculoOpen(true)
  }

  const handleOpenNovaRota = () => {
    setEditandoRota(null)
    setModalRotaOpen(true)
  }

  const handleOpenEditarRota = (r: RotaItem) => {
    setEditandoRota(r)
    setModalRotaOpen(true)
  }

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-sky-500" /> Transporte Escolar
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de frota, rotas, alunos transportados, combustível e manutenções.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#121212] p-1 rounded-lg border border-[#3f3f46] flex flex-wrap gap-1">
            {(
              [
                { id: 'veiculos', label: 'Veículos' },
                { id: 'rotas', label: 'Rotas' },
                { id: 'alunos', label: 'Alunos' },
                { id: 'combustivel', label: 'Combustível' },
                { id: 'manutencoes', label: 'Manutenções' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === tab.id ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Renderização Lazy da Aba Ativa */}
      {activeTab === 'veiculos' && (
        <VeiculosTab onOpenNovo={handleOpenNovoVeiculo} onOpenEditar={handleOpenEditarVeiculo} />
      )}
      {activeTab === 'rotas' && (
        <RotasTab onOpenNovo={handleOpenNovaRota} onOpenEditar={handleOpenEditarRota} />
      )}
      {activeTab === 'alunos' && (
        <AlunosTab onOpenAlocar={() => setModalAlocarAlunoOpen(true)} />
      )}
      {activeTab === 'combustivel' && (
        <CombustivelTab onOpenAbastecimento={() => setModalAbastecimentoOpen(true)} />
      )}
      {activeTab === 'manutencoes' && (
        <ManutencoesTab onOpenManutencao={() => setModalManutencaoOpen(true)} />
      )}

      {/* Modais Carregados Estritamente sob Demanda */}
      {modalVeiculoOpen && (
        <ModalVeiculo
          open={modalVeiculoOpen}
          onOpenChange={setModalVeiculoOpen}
          motoristas={motoristas}
          editando={editandoVeiculo}
          onSaved={() => {
            loadAuxiliares()
          }}
        />
      )}

      {modalRotaOpen && (
        <ModalRota
          open={modalRotaOpen}
          onOpenChange={setModalRotaOpen}
          veiculos={veiculosLista}
          escolas={escolas}
          motoristas={motoristas}
          editando={editandoRota}
          onSaved={() => {
            loadAuxiliares()
          }}
        />
      )}

      {modalAbastecimentoOpen && (
        <ModalAbastecimento
          open={modalAbastecimentoOpen}
          onOpenChange={setModalAbastecimentoOpen}
          veiculos={veiculosLista}
          onSuccess={() => {
            loadAuxiliares()
          }}
        />
      )}

      {modalManutencaoOpen && (
        <ModalManutencao
          open={modalManutencaoOpen}
          onOpenChange={setModalManutencaoOpen}
          veiculos={veiculosLista}
          onSuccess={() => {
            loadAuxiliares()
          }}
        />
      )}

      {modalAlocarAlunoOpen && (
        <ModalAlocarAlunoTransporte
          open={modalAlocarAlunoOpen}
          onOpenChange={setModalAlocarAlunoOpen}
          rotas={rotasLista}
          onSuccess={() => {
            loadAuxiliares()
          }}
        />
      )}
    </div>
  )
}
