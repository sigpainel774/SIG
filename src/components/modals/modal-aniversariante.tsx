'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { PartyPopper, User, CalendarDays, Sparkles } from 'lucide-react'
import { getAvatarUrl } from '@/lib/photoHelper'

export interface AniversarianteItem {
  day?: number
  name?: string
  role?: string
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
}

interface ModalAniversarianteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  aniversariantes?: AniversarianteItem[]
  dia?: number | string
  mes?: string
  nome?: string
  orgao?: string
}

function AniversarianteAvatar({ item }: { item: AniversarianteItem }) {
  const [imgError, setImgError] = useState(false)
  const avatarUrl = getAvatarUrl(item)

  if (avatarUrl && !imgError) {
    return (
      <img
        src={`${avatarUrl.split('?')[0]}?t=session`}
        alt={item.name ?? 'Aniversariante'}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-highlight/10 text-highlight">
      <User className="w-6 h-6" />
    </div>
  )
}

export function ModalAniversariante({
  open = false,
  onOpenChange,
  aniversariantes = [],
  dia,
  mes,
  nome = 'Nome do Funcionário',
  orgao = 'Órgão: Escola'
}: ModalAniversarianteProps) {
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  // Se foram passados aniversariantes em array, usa eles; senão monta a partir de props legadas
  const lista: AniversarianteItem[] = aniversariantes.length > 0
    ? aniversariantes
    : [{ name: nome, role: orgao, day: typeof dia === 'number' ? dia : undefined }]

  const diaTexto = dia ? `Dia ${dia}${mes ? ` de ${mes}` : ''}` : 'Aniversário'
  const isMulti = lista.length > 1
  const title = isMulti ? 'Aniversariantes do Dia 🎉' : 'Aniversariante do Dia 🎉'

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={diaTexto}
      maxWidth={isMulti ? 'sm:max-w-[480px]' : 'sm:max-w-[420px]'}
    >
      <div className="py-2">
        {/* Cabeçalho Festivo do Modal */}
        <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-highlight/10 border border-highlight/20 text-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-highlight shrink-0" />
            <span className="text-sm font-semibold text-highlight">{diaTexto}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-highlight shrink-0" />
            <span>{lista.length} {lista.length === 1 ? 'comemoração' : 'comemorações'}</span>
          </div>
        </div>

        {lista.length === 1 ? (
          /* Card Único em Destaque */
          <div className="text-center py-3 px-2">
            <div className="relative w-[100px] h-[100px] rounded-full mx-auto mb-4 border-[3px] border-highlight/70 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-card overflow-hidden">
              <AniversarianteAvatar item={lista[0]} />
              <div className="absolute bottom-0 right-0 bg-highlight text-background p-1.5 rounded-full shadow-md">
                <PartyPopper className="w-4 h-4" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1 leading-snug">
              {lista[0].name ?? 'Aniversariante'}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-muted-foreground border border-borderCustom">
              {lista[0].role ?? 'Integrador(a) da Rede'}
            </div>

            <p className="mt-4 text-xs text-muted-foreground italic">
              ✨ Desejamos muita saúde, felicidade e realizações neste dia especial! ✨
            </p>
          </div>
        ) : (
          /* Lista de Múltiplos Aniversariantes */
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {lista.map((aniv, idx) => (
              <div
                key={`${aniv.name}-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-borderCustom bg-card/60 hover:bg-hoverCustom transition-colors"
              >
                <div className="relative w-12 h-12 rounded-full border-2 border-highlight/50 shrink-0 overflow-hidden bg-card">
                  <AniversarianteAvatar item={aniv} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {aniv.name ?? 'Sem nome'}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {aniv.role ?? 'Integrador(a) da Rede'}
                  </p>
                </div>
                <div className="shrink-0 text-highlight">
                  <PartyPopper className="w-4 h-4 opacity-80" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
