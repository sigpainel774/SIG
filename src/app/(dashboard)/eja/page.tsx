'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Search, GraduationCap, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Escola {
  id: string
  nome: string
  codigo?: number
  tipo?: string | null
  inep?: string | null
  telefone?: string | null
  secretarias?: {
    id: string
    nome: string
  } | null
}

export default function PortalEjaPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setEscolaAtivaId, isContaEja } = useAuthStore()
  const { setSelectedEscola, setSelectedSecretaria } = useSchoolStore()

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [secretariaEducacaoNome, setSecretariaEducacaoNome] = useState('Secretaria Municipal de Educação')

  useEffect(() => {
    let active = true

    async function carregarDadosEja() {
      setLoading(true)
      try {
        // 1. Buscar a Secretaria Municipal de Educação
        const { data: secData } = await supabase
          .from('secretarias')
          .select('id, nome')
          .ilike('nome', '%educa%')
          .limit(1)

        let secId: string | null = null
        if (secData && secData.length > 0) {
          secId = secData[0].id
          if (active) {
            setSecretariaEducacaoNome(secData[0].nome)
            setSelectedSecretaria(secData[0])
          }
        }

        // 2. Buscar todas as escolas da rede (excluindo explicitamente o EMAEE)
        let query = supabase
          .from('escolas')
          .select('id, nome, codigo, tipo, inep, telefone, secretarias(id, nome)')
          .eq('ativo', true)
          .is('deleted_at', null)
          .order('nome')

        if (secId) {
          query = query.eq('secretaria_id', secId)
        }

        const { data: escolasData, error } = await query

        if (error) throw error

        if (active && escolasData) {
          // Filtro estrito: Remove EMAEE (que não possui turmas nem escolas regulares de EJA)
          const filtradasSemEmaee = escolasData.filter(
            (e) => e.tipo !== 'EMAEE' && !/emaee/i.test(e.nome)
          )
          setEscolas(filtradasSemEmaee)
        }
      } catch (err: any) {
        console.error('Erro ao carregar escolas do Portal EJA:', err)
        toast.error('Erro ao carregar catálogo de escolas da rede EJA.')
      } finally {
        if (active) setLoading(false)
      }
    }

    carregarDadosEja()

    return () => {
      active = false
    }
  }, [setSelectedSecretaria, supabase])

  const escolasFiltradas = escolas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    String(e.codigo ?? '').includes(busca) ||
    (e.inep ?? '').includes(busca)
  )

  const handleSelecionarEscola = (escola: Escola) => {
    setEscolaAtivaId(escola.id)
    setSelectedEscola({
      id: escola.id,
      nome: escola.nome,
      secretariaNome: secretariaEducacaoNome
    })
    toast.success(`Escola "${escola.nome}" selecionada para o ambiente EJA!`)
    router.push('/alunos')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Banner de Entrada EJA ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Portal de Gestão EJA (Educação de Jovens e Adultos)
              </h1>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 font-bold px-2.5 py-0.5">
                Acesso Global EJA
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Órgão pré-selecionado: <strong className="text-white">{secretariaEducacaoNome}</strong>. 
              Selecione abaixo a unidade escolar para gerenciar exclusivamente as turmas e alunos da modalidade EJA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 bg-surface-1 border border-borderCustom px-3 py-2 rounded-xl text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Isolamento Estrito Ativo</span>
        </div>
      </div>

      {/* ── Painel de Busca e Filtros ──────────────────────────────────────── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Buscar unidade por nome, código ou INEP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-input border-borderCustom text-foregroundCustom text-sm rounded-xl focus:border-amber-500"
            />
          </div>
          <div className="text-xs text-zinc-400 font-semibold shrink-0">
            Exibindo {escolasFiltradas.length} de {escolas.length} escolas
          </div>
        </div>

        {/* ── Grid de Escolas ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm animate-pulse space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p>Carregando unidades escolares da Secretaria de Educação...</p>
          </div>
        ) : escolasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm flex flex-col items-center justify-center space-y-3 bg-surface-1 rounded-xl border border-dashed border-borderCustom">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Nenhuma escola encontrada</p>
              <p className="text-xs text-zinc-400 mt-1">Ajuste o termo de busca para visualizar mais opções.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {escolasFiltradas.map((escola) => (
              <div
                key={escola.id}
                onClick={() => handleSelecionarEscola(escola)}
                className="group p-5 rounded-2xl bg-surface-1 border border-borderCustom hover:border-amber-500/50 hover:bg-amber-950/10 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:shadow-amber-950/20"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="border-borderCustom text-zinc-400 text-[10px]">
                      Cód: {escola.codigo}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {escola.nome}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      INEP: {escola.inep || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-borderCustom/60 flex items-center justify-between text-xs text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Acessar Ambiente EJA</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
