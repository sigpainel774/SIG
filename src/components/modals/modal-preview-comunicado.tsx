'use client'

import { StandardDialog } from '@/components/ui/standard-dialog'
import {
  Bell,
  Clock,
  Sparkles,
  Paperclip,
  Globe,
  School,
  Building,
  CheckCircle2,
  Users,
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Megaphone,
} from 'lucide-react'

interface ModalPreviewComunicadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  mensagem: string
  categoria: string
  alvo: string
  isPopup: boolean
  isAgendado: boolean
  dataAgendamento: string
  horaAgendamento: string
  todaARede: boolean
  unidadesSelecionadas: string[]
  mapaEscolas: Map<string, string>
  nomeAutor?: string
  arquivoNome?: string | null
  leituraObrigatoria?: boolean
}

export function ModalPreviewComunicado({
  open,
  onOpenChange,
  titulo,
  mensagem,
  categoria,
  alvo,
  isPopup,
  isAgendado,
  dataAgendamento,
  horaAgendamento,
  todaARede,
  unidadesSelecionadas,
  mapaEscolas,
  nomeAutor,
  arquivoNome,
  leituraObrigatoria,
}: ModalPreviewComunicadoProps) {
  const getCategoriaBadge = (cat: string) => {
    switch (cat) {
      case 'urgente':
        return {
          icon: <AlertCircle className="w-3 h-3 text-red-400" />,
          label: 'Urgente',
          className: 'text-red-400 bg-red-500/10 border-red-500/30',
        }
      case 'reuniao':
        return {
          icon: <Users className="w-3 h-3 text-blue-400" />,
          label: 'Reunião',
          className: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        }
      case 'calendario':
        return {
          icon: <CalendarDays className="w-3 h-3 text-purple-400" />,
          label: 'Calendário',
          className: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        }
      case 'administrativo':
        return {
          icon: <ClipboardList className="w-3 h-3 text-amber-400" />,
          label: 'Administrativo',
          className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        }
      default:
        return {
          icon: <Megaphone className="w-3 h-3 text-highlight" />,
          label: 'Geral',
          className: 'text-highlight bg-highlight/10 border-highlight/20',
        }
    }
  }

  const catBadge = getCategoriaBadge(categoria || 'geral')

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pré-visualização do Comunicado"
      description="Veja exatamente como o comunicado será exibido no feed e nos dispositivos dos usuários."
      maxWidth="sm:max-w-2xl"
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl border border-borderCustom bg-card p-5 shadow-lg transition-all">
          <div className="flex items-start gap-3.5">
            <div
              className={`rounded-xl p-2.5 shrink-0 ${
                isAgendado
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-highlight/10 text-highlight'
              }`}
            >
              {isAgendado ? <Clock className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-lg">
                    {titulo.trim() || 'Título do Comunicado'}
                  </h3>
                  {isAgendado ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Agendado para {dataAgendamento || 'Data'} às {horaAgendamento || 'Hora'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Disparo Imediato
                    </span>
                  )}
                </div>

                <span className="rounded-full border border-borderCustom bg-input px-2.5 py-0.5 text-xs text-muted-foreground">
                  Hoje
                </span>
              </div>

              {/* Badges de Categoria e Metadados */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${catBadge.className}`}
                >
                  {catBadge.icon}
                  {catBadge.label}
                </span>

                {isPopup && (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Pop-up no Login
                  </span>
                )}

                {leituraObrigatoria && (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                    <AlertCircle className="w-3 h-3" />
                    Leitura Obrigatória
                  </span>
                )}

                {todaARede ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                    <Globe className="w-3 h-3 text-sky-400" />
                    Toda a Rede
                  </span>
                ) : unidadesSelecionadas.length === 1 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <School className="w-3 h-3 text-emerald-400" />
                    {mapaEscolas.get(unidadesSelecionadas[0]) || '1 Unidade'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <Building className="w-3 h-3 text-amber-300" />
                    {unidadesSelecionadas.length} Unidades
                  </span>
                )}

                {alvo && alvo !== 'Selecione o Público Alvo' && (
                  <span className="text-xs font-semibold text-highlight bg-highlight/10 px-2.5 py-0.5 rounded-full border border-highlight/20">
                    {alvo}
                  </span>
                )}
              </div>

              {/* Corpo da Mensagem */}
              <div className="text-sm leading-6 text-muted-foreground whitespace-pre-line bg-input/20 p-3.5 rounded-xl border border-borderCustom/50">
                {mensagem.trim() || 'O conteúdo do comunicado será exibido aqui.'}
              </div>

              {/* Anexo se houver */}
              {arquivoNome && (
                <div className="flex items-center gap-2 text-xs font-medium text-highlight bg-highlight/5 border border-highlight/15 px-3 py-1.5 rounded-lg w-fit">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Anexo: {arquivoNome}</span>
                </div>
              )}

              {/* Rodapé autor */}
              <div className="pt-2 text-xs text-muted-foreground flex items-center justify-between border-t border-borderCustom/40">
                <span>Publicado por: {nomeAutor || 'Você'}</span>
                <span className="text-[11px] text-muted-foreground/80">Simulação de visualização</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  )
}
