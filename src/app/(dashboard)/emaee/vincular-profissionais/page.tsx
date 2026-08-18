'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { IconTile } from '@/components/ui/icon-tile'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalAssociarAlunoAEE } from '@/components/modals/modal-associar-aluno-aee'
import { getAvatarUrl } from '@/lib/photoHelper'

export default function ProfissionaisAEEPage() {
  const { selectedEscola } = useSchoolStore()
  const escolaEmaeeId = selectedEscola?.id
  const supabase = useMemo(() => createClient(), [])

  const [profissionaisAEE, setProfissionaisAEE] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Controle de modal
  const [modalOpen, setModalOpen] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState<any>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const carregarProfissionais = async () => {
    if (!escolaEmaeeId) {
      if (isMounted.current) setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select(`
          id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at, is_profissional_aee,
          vinculos_funcionarios!inner(escola_id, ativo)
        `)
        .eq('vinculos_funcionarios.escola_id', escolaEmaeeId)
        .eq('vinculos_funcionarios.ativo', true)
        .eq('is_profissional_aee', true)
        .is('deleted_at', null)
        .order('nome')

      if (error) throw error

      if (isMounted.current) {
        const vistos = new Set<string>()
        const unicos = (data || []).filter((f: any) => {
          if (!f?.id || vistos.has(f.id)) return false
          vistos.add(f.id)
          return true
        })
        setProfissionaisAEE(unicos)
      }
    } catch (err) {
      console.error(err)
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
    if (c.includes('psicólogo') || c.includes('psicologa')) return 'border-blue-500/30 dark:border-blue-500/50 shadow-blue-500/5 dark:shadow-blue-500/10 bg-blue-500/5 dark:bg-blue-500/10'
    if (c.includes('fono')) return 'border-green-500/30 dark:border-green-500/50 shadow-green-500/5 dark:shadow-green-500/10 bg-green-500/5 dark:bg-green-500/10'
    if (c.includes('psicopedagogo') || c.includes('psicopedagoga')) return 'border-orange-500/30 dark:border-orange-500/50 shadow-orange-500/5 dark:shadow-orange-500/10 bg-orange-500/5 dark:bg-orange-500/10'
    if (c.includes('neuro')) return 'border-purple-500/30 dark:border-purple-500/50 shadow-purple-500/5 dark:shadow-purple-500/10 bg-purple-500/5 dark:bg-purple-500/10'
    if (c.includes('fisio')) return 'border-pink-500/30 dark:border-pink-500/50 shadow-pink-500/5 dark:shadow-pink-500/10 bg-pink-500/5 dark:bg-pink-500/10'
    return 'border-border bg-card' // Outros
  }

  const handleOpenModal = (prof: any) => {
    setProfSelecionado(prof)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Modal */}
      {modalOpen && profSelecionado && (
        <ModalAssociarAlunoAEE
          open={modalOpen}
          onOpenChange={setModalOpen}
          profissionalId={profSelecionado.id}
          profissionalNome={profSelecionado.nome}
          profissionalCargo={profSelecionado.cargo}
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
            <p className="text-xs text-muted-foreground">Gestão e vinculação de alunos com Profissionais AEE lotados na unidade EMAEE</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Carregando profissionais AEE...
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
                <h2 className="text-lg font-bold text-foreground">Profissionais AEE</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  {profissionaisAEE.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                Servidores com a opção &quot;Profissional AEE&quot; marcada em sua ficha cadastral (Dados Empregatícios)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profissionaisAEE.map(p => {
                const colors = getColorByCargo(p.cargo)
                const avatarUrl = getAvatarUrl(p)

                return (
                  <div 
                    key={p.id} 
                    className={`flex flex-col border ${colors} rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200 shadow-md`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 shrink-0 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-muted-foreground">{p.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate" title={p.nome}>{p.nome}</h3>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium truncate">{p.cargo || 'Especialista AEE'}</p>
                        <span className="inline-block mt-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-semibold border border-amber-500/20">Profissional AEE</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        className="w-full bg-card hover:bg-accent text-foreground text-xs h-9 rounded-xl border border-border transition-colors shadow-sm"
                        onClick={() => handleOpenModal(p)}
                      >
                        Vincular Aluno
                      </Button>
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

