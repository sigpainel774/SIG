'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { FrequenciaBar } from '@/components/FrequenciaBar'

const ModalDetalhesFrequenciaHoje = dynamic(
  () => import('@/components/modals/ModalDetalhesFrequenciaHoje').then((m) => m.ModalDetalhesFrequenciaHoje),
  { ssr: false }
)

interface HomeFrequenciaSectionProps {
  feitas: number
  total: number
  loading: boolean
  escolaId?: string
  escolaNome?: string
  escolaLogoUrl?: string | null
}

export function HomeFrequenciaSection({
  feitas,
  total,
  loading,
  escolaId,
  escolaNome,
  escolaLogoUrl,
}: HomeFrequenciaSectionProps) {
  const [isModalFrequenciaOpen, setIsModalFrequenciaOpen] = useState(false)

  return (
    <>
      <FrequenciaBar
        feitas={feitas}
        total={total}
        loading={loading}
        onClick={() => setIsModalFrequenciaOpen(true)}
      />

      {isModalFrequenciaOpen && (
        <ModalDetalhesFrequenciaHoje
          open={isModalFrequenciaOpen}
          onOpenChange={setIsModalFrequenciaOpen}
          escolaId={escolaId}
          escolaNome={escolaNome}
          escolaLogoUrl={escolaLogoUrl}
        />
      )}
    </>
  )
}
