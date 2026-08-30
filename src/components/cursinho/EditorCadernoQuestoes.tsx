'use client'

import React, { useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  PlusCircle,
  Eye,
  Edit3,
  Trash2,
  HelpCircle,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface EditorCadernoQuestoesProps {
  value: string
  onChange: (val: string) => void
  qtdQuestoes?: number
}

/**
 * Converte o texto com marcadores de formatação (Markdown e tags de alinhamento)
 * para HTML seguro pronto para exibição e impressão em 2 colunas.
 */
export function formatarTextoQuestoesParaHtml(rawText: string): string {
  if (!rawText || !rawText.trim()) return ''

  let text = rawText

  // Tags de alinhamento em bloco
  text = text.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align: center; margin: 4px 0;">$1</div>')
  text = text.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align: right; margin: 4px 0;">$1</div>')
  text = text.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div style="text-align: justify; margin: 4px 0;">$1</div>')
  text = text.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align: left; margin: 4px 0;">$1</div>')

  // Negrito: **texto**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800;">$1</strong>')

  // Sublinhado: <u>texto</u> ou __texto__
  text = text.replace(/__(.*?)__/g, '<u style="text-decoration: underline;">$1</u>')

  // Itálico: *texto*
  text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>')

  // Quebras de linha para <br/> preservando os blocos
  const lines = text.split('\n')
  return lines.join('<br/>')
}

export function EditorCadernoQuestoes({
  value,
  onChange,
  qtdQuestoes
}: EditorCadernoQuestoesProps) {
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Aplica tags na seleção atual do textarea
  const wrapSelection = (prefix: string, suffix: string, placeholder = 'texto') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = textarea.value
    const selectedText = currentVal.substring(start, end)

    const textToInsert = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${placeholder}${suffix}`

    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end)
    onChange(newVal)

    // Restaura o foco e ajusta seleção
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        textarea.setSelectionRange(start, start + textToInsert.length)
      } else {
        const newCursorStart = start + prefix.length
        const newCursorEnd = newCursorStart + placeholder.length
        textarea.setSelectionRange(newCursorStart, newCursorEnd)
      }
    }, 10)
  }

  // Atalhos de teclado (Ctrl+B, Ctrl+I, Ctrl+U)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        wrapSelection('**', '**', 'negrito')
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        wrapSelection('*', '*', 'itálico')
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        wrapSelection('__', '__', 'sublinhado')
      }
    }
  }

  const inserirModeloQuestao = () => {
    const numeroQuestao = (value.match(/QUESTÃO\s+(\d+)/gi) || []).length + 1
    const padNumero = numeroQuestao < 10 ? `0${numeroQuestao}` : numeroQuestao

    const template = `\n\n**QUESTÃO ${padNumero}**\n[justify]Digite ou cole aqui o enunciado completo da questão com todos os detalhes e contexto necessário.[/justify]\n\nA) Primeira alternativa\nB) Segunda alternativa\nC) Terceira alternativa\nD) Quarta alternativa\nE) Quinta alternativa\n`

    onChange((value ? value.trimEnd() : '') + template)
  }

  return (
    <div className="space-y-2.5">
      {/* Barra de Ferramentas Superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 dark:bg-zinc-900/70 border border-border rounded-xl">
        {/* Controles de Formatação de Texto */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('**', '**', 'texto em negrito')}
            title="Negrito (Ctrl+B)"
            className="h-8 px-2.5 font-bold gap-1 text-xs hover:bg-muted"
          >
            <Bold className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Negrito</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('*', '*', 'texto em itálico')}
            title="Itálico (Ctrl+I)"
            className="h-8 px-2.5 italic gap-1 text-xs hover:bg-muted"
          >
            <Italic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Itálico</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('__', '__', 'texto sublinhado')}
            title="Sublinhado (Ctrl+U)"
            className="h-8 px-2.5 underline gap-1 text-xs hover:bg-muted"
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-5 bg-border mx-1" />

          {/* Botões de Alinhamento */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('[left]', '[/left]', 'texto alinhado à esquerda')}
            title="Alinhar à Esquerda"
            className="h-8 px-2 text-xs hover:bg-muted"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('[center]', '[/center]', 'texto centralizado')}
            title="Centralizar"
            className="h-8 px-2 text-xs hover:bg-muted"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('[right]', '[/right]', 'texto alinhado à direita')}
            title="Alinhar à Direita"
            className="h-8 px-2 text-xs hover:bg-muted"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wrapSelection('[justify]', '[/justify]', 'texto justificado')}
            title="Justificado"
            className="h-8 px-2 text-xs hover:bg-muted"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={inserirModeloQuestao}
            title="Adicionar modelo estruturado de questão"
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Questão</span>
          </Button>
        </div>

        {/* Alternador de Abas: Editor vs Pré-visualização */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tab === 'editor' ? 'secondary' : 'ghost'}
            onClick={() => setTab('editor')}
            className="h-7 px-2.5 text-xs font-bold gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Digitar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'preview' ? 'secondary' : 'ghost'}
            onClick={() => setTab('preview')}
            className="h-7 px-2.5 text-xs font-bold gap-1"
          >
            <Eye className="w-3 h-3" />
            Visualizar
          </Button>
        </div>
      </div>

      {/* Área Principal de Edição ou Visualização */}
      {tab === 'editor' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={15}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Cole aqui o texto completo da prova com as questões. Você pode usar a barra de ferramentas acima para aplicar negrito e alinhamentos:\n\n**QUESTÃO 01**\n[justify]Considere o seguinte trecho sobre a história do Brasil...[/justify]\n\nA) Alternativa A\nB) Alternativa B\nC) Alternativa C\nD) Alternativa D\nE) Alternativa E`}
            className="w-full p-3.5 text-xs font-mono bg-background text-foreground border border-border rounded-xl resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
          />
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white text-black p-5 max-h-[380px] overflow-y-auto shadow-sm">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-black uppercase tracking-wide text-gray-900">
                Pré-visualização do Caderno de Questões (2 Colunas)
              </span>
            </div>
            {qtdQuestoes && (
              <span className="text-[10px] font-mono font-bold text-gray-500">
                {qtdQuestoes} QUESTÕES PREVISTAS
              </span>
            )}
          </div>

          {value.trim() ? (
            <div
              className="text-xs leading-relaxed text-gray-900 font-sans"
              style={{
                columns: '2',
                columnGap: '24px',
                wordBreak: 'break-word'
              }}
              dangerouslySetInnerHTML={{
                __html: formatarTextoQuestoesParaHtml(value)
              }}
            />
          ) : (
            <div className="py-12 text-center text-xs text-gray-400 italic">
              Nenhum texto digitado ainda. Clique na aba &quot;Digitar&quot; e adicione os enunciados.
            </div>
          )}
        </div>
      )}

      {/* Rodapé Informativo e Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{value ? `${value.length} caracteres` : '0 caracteres'}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-muted-foreground/70" />
            Dica: Selecione o texto e clique em <strong>Negrito</strong> ou <strong>Alinhamento</strong> (ou use Ctrl+B).
          </span>
        </div>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="h-6 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 gap-1"
          >
            <Trash2 className="w-3 h-3" /> Limpar Texto
          </Button>
        )}
      </div>
    </div>
  )
}
