'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export interface EscolaDestinoOption {
  id: string
  nome: string
  inep?: string | null
}

export function useTransferForm() {
  const [escolas, setEscolas] = useState<EscolaDestinoOption[]>([])
  const [loadingEscolas, setLoadingEscolas] = useState(true)
  const [escolaDestinoId, setEscolaDestinoId] = useState<string>('')
  const [foraRede, setForaRede] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    async function loadEscolas() {
      if (isMounted.current) setLoadingEscolas(true)
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome, inep')
          .order('nome', { ascending: true })

        if (error) throw error

        if (isMounted.current && data) {
          // Filtra a escola de origem atual para não permitir transferência para a mesma unidade
          const filtradas = data.filter((e) => !escolaAtivaId || e.id !== escolaAtivaId)
          setEscolas(filtradas)
        }
      } catch (err: any) {
        console.error('Erro ao carregar escolas de destino:', err)
        toast.error('Erro ao buscar unidades escolares: ' + (err.message || 'Erro de conexão'))
        if (isMounted.current) setEscolas([])
      } finally {
        if (isMounted.current) setLoadingEscolas(false)
      }
    }

    loadEscolas()
  }, [escolaAtivaId])

  const validateTransferForm = () => {
    if (!foraRede && !escolaDestinoId) {
      toast.error('Selecione a escola de destino ou marque "Fora da Rede Municipal".')
      return false
    }
    if (!motivo.trim()) {
      toast.error('Informe a justificativa ou motivo da transferência.')
      return false
    }
    return true
  }

  const resetForm = () => {
    setEscolaDestinoId('')
    setForaRede(false)
    setMotivo('')
  }

  return {
    escolas,
    loadingEscolas,
    escolaDestinoId,
    setEscolaDestinoId,
    foraRede,
    setForaRede,
    motivo,
    setMotivo,
    submitting,
    setSubmitting,
    validateTransferForm,
    resetForm,
    escolaAtivaId
  }
}
