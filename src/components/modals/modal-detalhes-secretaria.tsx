'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, RefreshCw, CheckCircle2, User, Search, School, Stethoscope, Calendar } from 'lucide-react'
import { ModalEscola } from '@/components/modals/modal-escola'
import { ModalCalendarioAcademico } from '@/components/modals/modal-calendario-academico'
import { ImportDataActions } from '@/components/admin/ImportDataActions'
import { useSchoolStore } from '@/store/useSchoolStore'
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
  const [modalCalendarioOpen, setModalCalendarioOpen] = useState(false)
  
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
      // Atualiza o contexto ativo da secretaria no sistema
      useSchoolStore.getState().setSelectedSecretaria({ id: secretaria.id, nome: secretaria.nome })
    }
  }, [open, secretaria?.id])

  if (!secretaria) return null

  const isEducacao = /educa/i.test(secretaria.nome)
  const isSaude = /sa[uú]de/i.test(secretaria.nome)

  const termoUnidade = isEducacao
    ? 'Unidades Escolares'
    : isSaude
    ? 'Unidades de Saúde da Rede'
    : 'Unidades Administrativas'

  const termoSingular = isEducacao
    ? 'Unidade Escolar'
    : isSaude
    ? 'Unidade de Saúde'
    : 'Unidade Administrativa'

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
        maxWidth="sm:max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Total: <strong>{unidades.length}</strong> {unidades.length === 1 ? termoSingular : termoUnidade}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-muted"
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
              <div className="w-12 h-12 rounded-xl bg-white border border-sky-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                {secretaria.logo_url ? (
                  <img 
                    src={`${secretaria.logo_url}?t=${sessionTimestamp}`} 
                    alt={secretaria.nome} 
                    className="w-full h-full object-contain p-1"
                  />
                ) : isSaude ? (
                  <Stethoscope className="w-6 h-6 text-rose-400" />
                ) : (
                  <Building2 className="w-6 h-6 text-sky-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  {secretaria.nome}
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px]">
                    Ativa
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Órgão Mantenedor oficial da Rede Municipal
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
              {/* Botão de Calendário Acadêmico Oficial (Exclusivo Educação) */}
              {isEducacao && (
                <Button
                  type="button"
                  onClick={() => setModalCalendarioOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl gap-1.5 shrink-0 cursor-pointer h-9 shadow-sm"
                  title="Gerenciar Calendário Acadêmico e Trimestres da Rede"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Calendário Acadêmico</span>
                </Button>
              )}

              {/* Opções Reutilizáveis de Importação de Dados */}
              <ImportDataActions 
                secretariaIdFilter={secretaria.id} 
                onSuccess={loadUnidades} 
              />

              <Button
                type="button"
                onClick={handleNovaUnidade}
                className="bg-[#0090ff] text-white hover:bg-[#0077d4] text-xs font-semibold rounded-xl gap-1.5 shrink-0 cursor-pointer h-9"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nova Unidade</span>
              </Button>
            </div>
          </div>

          {/* Barra de Busca e Atualização */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl flex-1">
              <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              <input
                type="text"
                placeholder={`Buscar por nome ou responsável...`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="bg-transparent border-none text-foreground text-xs outline-none w-full placeholder:text-muted-foreground/50"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadUnidades}
              disabled={loading}
              className="border-border text-foreground hover:bg-muted rounded-xl text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>

          {/* Lista de Unidades */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Carregando unidades filhas...</span>
            </div>
          ) : unidadesFiltradas.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border space-y-3 animate-fadeIn">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Nenhuma unidade encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
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
                    className="p-3.5 bg-card border border-border hover:border-borderCustom/80 dark:hover:border-border rounded-xl flex items-center justify-between gap-3 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {u.logo_url ? (
                          <img
                            src={`${u.logo_url}?t=${sessionTimestamp}`}
                            alt={u.nome}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : isEducacao ? (
                          <School className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        ) : (
                          <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                          {u.nome}
                          {u.inep && isEducacao && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono font-normal">
                              INEP: {u.inep}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          <span>{isEducacao ? 'Diretor' : 'Gestor'}: {gestorNome}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          u.ativo !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
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

      {/* Modal de Calendário Acadêmico da Secretaria */}
      {modalCalendarioOpen && (
        <ModalCalendarioAcademico
          open={modalCalendarioOpen}
          onOpenChange={setModalCalendarioOpen}
          secretariaId={secretaria.id}
          secretariaNome={secretaria.nome}
        />
      )}
    </>
  )
}
