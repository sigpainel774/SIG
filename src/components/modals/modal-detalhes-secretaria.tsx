'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, RefreshCw, CheckCircle2, User, Search, School } from 'lucide-react'
import { ModalEscola } from '@/components/modals/modal-escola'
import { toast } from 'sonner'

interface ModalDetalhesSecretariaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretaria: {
    id: string
    nome: string
    logo_url?: string | null
    ativo?: boolean
  } | null
  onUpdate?: () => void
}

export function ModalDetalhesSecretaria({
  open,
  onOpenChange,
  secretaria,
  onUpdate
}: ModalDetalhesSecretariaProps) {
  const [unidades, setUnidades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalNovaEscolaOpen, setModalNovaEscolaOpen] = useState(false)
  const [escolaToEdit, setEscolaToEdit] = useState<any | null>(null)
  
  const sessionTimestamp = useRef(Date.now()).current
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadUnidades = async () => {
    if (!secretaria?.id) return
    setLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome, inep, tipo, ativo, logo_url, codigo, localizacao, latitude, longitude, diretor_id, secretaria_id, funcionarios:diretor_id(nome, cargo)')
      .eq('secretaria_id', secretaria.id)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar unidades da secretaria:', error)
      toast.error('Erro ao carregar unidades vinculadas.')
    } else {
      setUnidades(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open && secretaria?.id) {
      loadUnidades()
    }
  }, [open, secretaria?.id])

  if (!secretaria) return null

  const isEducacao = /educa/i.test(secretaria.nome)
  const termoUnidade = isEducacao ? 'Unidades Escolares' : 'Unidades Administrativas'
  const termoSingular = isEducacao ? 'Unidade Escolar' : 'Unidade Administrativa'

  const unidadesFiltradas = unidades.filter(u => 
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (u.inep || '').toLowerCase().includes(busca.toLowerCase()) ||
    (u.funcionarios?.nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  const handleNovaUnidade = () => {
    setEscolaToEdit(null)
    setModalNovaEscolaOpen(true)
  }

  const handleEditarUnidade = (u: any) => {
    setEscolaToEdit(u)
    setModalNovaEscolaOpen(true)
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={secretaria.nome}
        description={`Gestão e listagem de ${termoUnidade.toLowerCase()} mantidas por este órgão.`}
        maxWidth="sm:max-w-3xl"
        footer={
          <div className="flex items-center justify-between w-full pt-3 border-t border-[#27272a]">
            <span className="text-xs text-zinc-400">
              Total: <strong>{unidades.length}</strong> {unidades.length === 1 ? termoSingular : termoUnidade}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a]"
            >
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-2">
          {/* Header Card da Secretaria */}
          <div className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-black/40 border border-sky-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                {secretaria.logo_url ? (
                  <img 
                    src={`${secretaria.logo_url}?t=${sessionTimestamp}`} 
                    alt={secretaria.nome} 
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-sky-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  {secretaria.nome}
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Ativa
                  </Badge>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Órgão Mantenedor oficial da Rede Municipal
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleNovaUnidade}
              className="bg-[#0090ff] text-white hover:bg-[#0077d4] text-xs font-semibold rounded-xl gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Unidade</span>
            </Button>
          </div>

          {/* Barra de Busca e Atualização */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-[#121214] border border-[#27272a] px-3 py-1.5 rounded-xl flex-1">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder={`Buscar por nome ou responsável...`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-zinc-500"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadUnidades}
              disabled={loading}
              className="bg-[#121214] border-[#27272a] text-zinc-300 hover:text-white rounded-xl text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>

          {/* Lista de Unidades */}
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#0090ff]" />
              <span>Carregando unidades filhas...</span>
            </div>
          ) : unidadesFiltradas.length === 0 ? (
            <div className="py-10 text-center text-zinc-400 bg-black/20 rounded-2xl border border-dashed border-[#27272a] space-y-3">
              <Building2 className="w-8 h-8 text-zinc-500 mx-auto opacity-50" />
              <div>
                <p className="text-sm font-semibold text-white">Nenhuma unidade encontrada</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {unidades.length === 0
                    ? `Esta secretaria ainda não possui ${termoUnidade.toLowerCase()} vinculadas.`
                    : 'Tente ajustar os termos de busca.'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleNovaUnidade}
                className="bg-[#0090ff]/20 text-[#0090ff] hover:bg-[#0090ff]/30 border border-[#0090ff]/30 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeira Unidade</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {unidadesFiltradas.map((u) => {
                const gestorNome = u.funcionarios?.nome || 'Sem gestor atribuído'
                return (
                  <div
                    key={u.id}
                    className="p-3.5 bg-[#141416] border border-[#26262a] hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-black/40 border border-[#27272a] flex items-center justify-center overflow-hidden shrink-0">
                        {u.logo_url ? (
                          <img
                            src={`${u.logo_url}?t=${sessionTimestamp}`}
                            alt={u.nome}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : isEducacao ? (
                          <School className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Building2 className="w-4 h-4 text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-2">
                          {u.nome}
                          {u.inep && (
                            <span className="text-[10px] text-zinc-500 font-mono font-normal">
                              INEP: {u.inep}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{isEducacao ? 'Diretor' : 'Gestor'}: {gestorNome}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          u.ativo !== false
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {u.ativo !== false ? 'ATIVA' : 'INATIVA'}
                      </Badge>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarUnidade(u)}
                        className="h-8 px-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg cursor-pointer gap-1"
                        title="Editar Unidade"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </StandardDialog>

      {/* Modal de Criação / Edição de Unidade */}
      {modalNovaEscolaOpen && (
        <ModalEscola
          open={modalNovaEscolaOpen}
          onOpenChange={setModalNovaEscolaOpen}
          escolaToEdit={escolaToEdit}
          secretariaIdPreSelected={secretaria.id}
          onSuccess={() => {
            loadUnidades()
            if (onUpdate) onUpdate()
          }}
        />
      )}
    </>
  )
}
