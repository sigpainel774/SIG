'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { IconTile } from '@/components/ui/icon-tile'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalAssociarAlunoAEE } from '@/components/modals/modal-associar-aluno-aee'

export default function ProfissionaisAEEPage() {
  const { selectedEscola } = useSchoolStore()
  const escolaEmaeeId = selectedEscola?.id
  const supabase = useMemo(() => createClient(), [])

  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Controle de modal
  const [modalOpen, setModalOpen] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState<any>(null)
  
  // Cache busting
  const sessionTimestamp = useMemo(() => Date.now(), [])
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
          id, nome, cargo, foto_url, foto_avatar_path,
          vinculos_funcionarios!inner(escola_id, ativo)
        `)
        .eq('vinculos_funcionarios.escola_id', escolaEmaeeId)
        .eq('vinculos_funcionarios.ativo', true)
        .is('deleted_at', null)
        .order('nome')

      if (error) throw error

      if (isMounted.current) {
        setProfissionais(data || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar profissionais da unidade.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    carregarProfissionais()
  }, [escolaEmaeeId])

  const getColorByCargo = (cargo: string | null) => {
    const c = (cargo || '').toLowerCase()
    if (c.includes('psicólogo') || c.includes('psicologa')) return 'border-blue-500/50 shadow-blue-500/10 bg-blue-500/5'
    if (c.includes('fono')) return 'border-green-500/50 shadow-green-500/10 bg-green-500/5'
    if (c.includes('psicopedagogo') || c.includes('psicopedagoga')) return 'border-orange-500/50 shadow-orange-500/10 bg-orange-500/5'
    if (c.includes('neuro')) return 'border-purple-500/50 shadow-purple-500/10 bg-purple-500/5'
    if (c.includes('fisio')) return 'border-pink-500/50 shadow-pink-500/10 bg-pink-500/5'
    return 'border-[#2a2a2a] bg-[#1a1a1a]' // Outros
  }

  const handleOpenModal = (prof: any) => {
    setProfSelecionado(prof)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile icon={UserPlus} variant="primary" className="h-10 w-10 shrink-0" />
          <h1 className="text-2xl font-bold text-foreground">Profissionais AEE</h1>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Carregando profissionais...
        </div>
      ) : profissionais.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-[#141416] border border-[#26262a] rounded-2xl shadow-sm">
          <UserPlus className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum Profissional Encontrado</h2>
          <p className="text-muted-foreground max-w-md">
            Esta unidade EMAEE ainda não possui profissionais especializados vinculados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profissionais.map(p => {
            const colors = getColorByCargo(p.cargo)
            // Lógica de cache-busting do avatar
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
            let avatarUrl = p.foto_url
            if (p.foto_avatar_path) avatarUrl = `${supabaseUrl}/storage/v1/object/public/fotos-avatars/${p.foto_avatar_path}`
            if (avatarUrl) avatarUrl = `${avatarUrl.split('?')[0]}?t=${sessionTimestamp}`

            return (
              <div 
                key={p.id} 
                className={`flex flex-col border ${colors} rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 shrink-0 rounded-full border-2 border-white/10 overflow-hidden bg-[#121212] flex items-center justify-center">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-500">{p.nome.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate" title={p.nome}>{p.nome}</h3>
                    <p className="text-xs text-gray-400 truncate">{p.cargo || 'Especialista'}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[#2a2a2a]/50">
                  <Button 
                    variant="ghost" 
                    className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white text-xs h-9 rounded-xl border border-[#333]"
                    onClick={() => handleOpenModal(p)}
                  >
                    Vincular Aluno
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
