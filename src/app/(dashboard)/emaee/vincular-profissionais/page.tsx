'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus, Sparkles, Users, HeartHandshake, Eye } from 'lucide-react'
import Link from 'next/link'
import { IconTile } from '@/components/ui/icon-tile'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalAssociarAlunoAEE } from '@/components/modals/modal-associar-aluno-aee'
import { ModalPacientesProfissionalAEE } from '@/components/modals/modal-pacientes-profissional-aee'
import { getAvatarUrl } from '@/lib/photoHelper'

export default function ProfissionaisAEEPage() {
  const { selectedEscola } = useSchoolStore()
  const { isEditMode } = useEditModeStore()
  const escolaEmaeeId = selectedEscola?.id
  const supabase = useMemo(() => createClient(), [])

  const [profissionaisAEE, setProfissionaisAEE] = useState<any[]>([])
  const [pacientesCountMap, setPacientesCountMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Controle de modais
  const [modalPacientesOpen, setModalPacientesOpen] = useState(false)
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState<any>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarProfissionais = async () => {
    if (!escolaEmaeeId) {
      if (isMounted.current) setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Busca profissionais AEE da unidade
      const { data: profsData, error: profsError } = await supabase
        .from('funcionarios')
        .select(`
          id, nome, cargo, registro_profissional, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, is_profissional_aee,
          vinculos_funcionarios!inner(escola_id, ativo)
        `)
        .eq('vinculos_funcionarios.escola_id', escolaEmaeeId)
        .eq('vinculos_funcionarios.ativo', true)
        .eq('is_profissional_aee', true)
        .is('deleted_at', null)
        .order('nome')

      if (profsError) throw profsError

      // 2. Busca contagem de vínculos ativos de pacientes por profissional nesta unidade EMAEE
      const { data: vinculosData, error: vincError } = await supabase
        .from('emaee_especialidades_vinculadas')
        .select(`
          profissional_id,
          matricula:emaee_matriculas!inner(escola_atendimento_id, deleted_at)
        `)
        .eq('ativo', true)
        .eq('matricula.escola_atendimento_id', escolaEmaeeId)
        .is('matricula.deleted_at', null)

      if (vincError) throw vincError

      if (isMounted.current) {
        // Mapeia contagem de pacientes por profissional
        const contagem: Record<string, number> = {}
        ;(vinculosData || []).forEach((v: any) => {
          if (v?.profissional_id) {
            contagem[v.profissional_id] = (contagem[v.profissional_id] || 0) + 1
          }
        })
        setPacientesCountMap(contagem)

        // Deduplica profissionais por ID
        const vistos = new Set<string>()
        const unicos = (profsData || []).filter((f: any) => {
          if (!f?.id || vistos.has(f.id)) return false
          vistos.add(f.id)
          return true
        })
        setProfissionaisAEE(unicos)
      }
    } catch (err) {
      console.error('Erro ao buscar profissionais AEE da unidade:', err)
      toast.error('Erro ao buscar profissionais AEE da unidade.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    carregarProfissionais()
  }, [escolaEmaeeId])

  const getColorByCargo = (cargo: string | null) => {
    const c = (cargo || '').toLowerCase()
    if (c.includes('neuro'))
      return 'border-purple-500/30 dark:border-purple-500/50 shadow-purple-500/5 dark:shadow-purple-500/10 bg-purple-500/5 dark:bg-purple-500/10 hover:border-purple-500/60'
    if (c.includes('psicólogo') || c.includes('psicologa'))
      return 'border-blue-500/30 dark:border-blue-500/50 shadow-blue-500/5 dark:shadow-blue-500/10 bg-blue-500/5 dark:bg-blue-500/10 hover:border-blue-500/60'
    if (c.includes('fono'))
      return 'border-green-500/30 dark:border-green-500/50 shadow-green-500/5 dark:shadow-green-500/10 bg-green-500/5 dark:bg-green-500/10 hover:border-green-500/60'
    if (c.includes('psicopedagogo') || c.includes('psicopedagoga'))
      return 'border-orange-500/30 dark:border-orange-500/50 shadow-orange-500/5 dark:shadow-orange-500/10 bg-orange-500/5 dark:bg-orange-500/10 hover:border-orange-500/60'
    if (c.includes('fisio'))
      return 'border-pink-500/30 dark:border-pink-500/50 shadow-pink-500/5 dark:shadow-pink-500/10 bg-pink-500/5 dark:bg-pink-500/10 hover:border-pink-500/60'
    return 'border-border bg-card hover:border-primary/50'
  }

  const handleOpenPacientesModal = (prof: any) => {
    setProfSelecionado(prof)
    setModalPacientesOpen(true)
  }

  const handleOpenVincularModal = (prof: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setProfSelecionado(prof)
    setModalVincularOpen(true)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Modal de Detalhes e Lista de Pacientes do Profissional */}
      {modalPacientesOpen && profSelecionado && (
        <ModalPacientesProfissionalAEE
          open={modalPacientesOpen}
          onOpenChange={(v) => {
            setModalPacientesOpen(v)
            if (!v) carregarProfissionais()
          }}
          profissional={profSelecionado}
          escolaEmaeeId={escolaEmaeeId || ''}
          escolaNome={selectedEscola?.nome}
          escolaLogoUrl={selectedEscola?.logo_url}
          onSuccess={carregarProfissionais}
        />
      )}

      {/* Modal Direto de Vinculação de Novo Aluno */}
      {modalVincularOpen && profSelecionado && (
        <ModalAssociarAlunoAEE
          open={modalVincularOpen}
          onOpenChange={(v) => {
            setModalVincularOpen(v)
            if (!v) carregarProfissionais()
          }}
          profissionalId={profSelecionado.id}
          profissionalNome={profSelecionado.nome}
          profissionalCargo={profSelecionado.cargo ?? 'Especialista AEE'}
          escolaEmaeeId={escolaEmaeeId || ''}
          onSuccess={carregarProfissionais}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile icon={UserPlus} variant="primary" className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profissionais AEE</h1>
            <p className="text-xs text-muted-foreground">
              Gestão clínica, relação de pacientes atendidos e escala multidisciplinar no EMAEE
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Carregando profissionais AEE...</span>
        </div>
      ) : profissionaisAEE.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card text-card-foreground border border-border rounded-2xl shadow-sm">
          <UserPlus className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum Profissional AEE Encontrado</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Esta unidade EMAEE ainda não possui profissionais AEE vinculados ativamente.
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-lg">
            Para adicionar um profissional a esta lista, acesse a aba <strong>Servidores</strong> e marque a opção &quot;Profissional AEE&quot; na ficha do servidor (Dados Empregatícios).
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between bg-card text-card-foreground border border-border p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h2 className="text-lg font-bold text-foreground">Profissionais AEE da Unidade</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  {profissionaisAEE.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                Clique no card de qualquer profissional para visualizar a lista de pacientes atendidos
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profissionaisAEE.map((p) => {
                const colors = getColorByCargo(p.cargo)
                const avatarUrl = getAvatarUrl(p)
                const totalPacientes = pacientesCountMap[p.id] || 0

                return (
                  <div
                    key={p.id}
                    onClick={() => handleOpenPacientesModal(p)}
                    className={`flex flex-col justify-between border ${colors} rounded-2xl p-5 hover:scale-[1.02] transition-all duration-200 shadow-md cursor-pointer group`}
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-14 w-14 shrink-0 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shadow-sm">
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt={p.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-muted-foreground">
                              {p.nome.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors"
                            title={p.nome}
                          >
                            {p.nome}
                          </h3>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium truncate">
                            {p.cargo || 'Especialista AEE'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                              <Users className="w-3 h-3" />
                              {totalPacientes} paciente{totalPacientes === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/80 flex items-center gap-2">
                      {isEditMode ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-card hover:bg-accent text-foreground text-xs h-9 rounded-xl border border-border transition-colors shadow-sm gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenPacientesModal(p)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Ver Lista</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 rounded-xl transition-colors shadow-sm gap-1.5"
                            onClick={(e) => handleOpenVincularModal(p, e)}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Vincular</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-card group-hover:bg-primary group-hover:text-primary-foreground text-foreground text-xs h-9 rounded-xl border border-border transition-all shadow-sm flex items-center justify-center gap-1.5 font-medium"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenPacientesModal(p)
                          }}
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Ver Pacientes Atendidos ({totalPacientes})</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
