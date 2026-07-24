'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { PrintRelacaoAlunosFotos, AlunoRelacaoItem } from '@/components/print/print-relacao-alunos-fotos'
import { toast } from 'sonner'

interface ModalImprimirRelacaoTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma: any
}

export function ModalImprimirRelacaoTurma({
  open,
  onOpenChange,
  turma
}: ModalImprimirRelacaoTurmaProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alunos, setAlunos] = useState<AlunoRelacaoItem[]>([])
  const [escola, setEscola] = useState<{ nome?: string; logo_url?: string }>({})

  const supabase = createClient() as any

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open || !turma?.id) return

    let active = true

    const fetchDados = async () => {
      setLoading(true)
      try {
        // 1. Busca os alunos vinculados a esta turma
        const { data: vinculosData, error: vinculosErr } = await supabase
          .from('vinculos_turmas')
          .select(`
            aluno_id,
            alunos (
              id,
              nome,
              foto_url,
              data_nascimento,
              matricula,
              nome_mae,
              nome_responsavel
            )
          `)
          .eq('turma_id', turma.id)
          .not('aluno_id', 'is', null)

        if (vinculosErr) {
          console.error('Erro ao buscar alunos da turma:', vinculosErr)
          toast.error('Erro ao carregar lista de estudantes para impressão.')
        } else if (active && vinculosData) {
          const listaFormatada: AlunoRelacaoItem[] = vinculosData
            .map((v: any) => v.alunos)
            .filter(Boolean)
            .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

          setAlunos(listaFormatada)
        }

        // 2. Busca dados da Escola (se disponível)
        const escolaId = turma.escola_id
        if (escolaId) {
          const { data: escolaData } = await supabase
            .from('escolas')
            .select('nome, logo_url')
            .eq('id', escolaId)
            .single()

          if (active && escolaData) {
            setEscola(escolaData)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados de impressão:', err)
        toast.error('Falha ao preparar relatório de impressão.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchDados()

    return () => {
      active = false
    }
  }, [open, turma?.id, turma?.escola_id])

  if (!open || !turma || !mounted) return null

  const handlePrint = () => {
    window.print()
  }

  const modalContent = (
    <div className="print-portal-container fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Botões de Ação na Tela (Ocultos na Impressão Física) */}
      <div className="fixed top-4 right-4 z-10 flex items-center gap-3 print:hidden">
        <Button
          type="button"
          onClick={handlePrint}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg gap-2 rounded-xl h-10 px-5"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relação (Foto 3x4)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="bg-background border-border text-foreground hover:bg-muted font-semibold shadow-md rounded-xl h-10 px-4"
        >
          <X className="w-4 h-4 mr-1" />
          Fechar
        </Button>
      </div>

      {/* Conteúdo Imprimível / Pré-visualização */}
      <div className="bg-white text-black w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto p-6 sm:p-10 print:p-0 print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-600">
              Carregando relação de estudantes da turma...
            </p>
          </div>
        ) : (
          <PrintRelacaoAlunosFotos
            turma={turma}
            escolaNome={escola.nome}
            escolaLogoUrl={escola.logo_url}
            alunos={alunos}
          />
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
