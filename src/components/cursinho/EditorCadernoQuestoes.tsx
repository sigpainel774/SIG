'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
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
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditorCadernoQuestoesProps {
  value: string
  onChange: (val: string) => void
  qtdQuestoes?: number
}

/**
 * Converte o texto (seja Markdown ou HTML rico)
 * para HTML seguro pronto para renderização na pré-visualização e impressão em 2 colunas.
 */
export function formatarTextoQuestoesParaHtml(rawText: string): string {
  if (!rawText || !rawText.trim()) return ''

  let text = rawText

  // Tags de alinhamento em formato [tag]
  text = text.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align: center; margin: 4px 0;">$1</div>')
  text = text.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align: right; margin: 4px 0;">$1</div>')
  text = text.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div style="text-align: justify; margin: 4px 0;">$1</div>')
  text = text.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align: left; margin: 4px 0;">$1</div>')

  // Negrito markdown: **texto**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800;">$1</strong>')

  // Sublinhado markdown: __texto__
  text = text.replace(/__(.*?)__/g, '<u style="text-decoration: underline;">$1</u>')

  // Itálico markdown: *texto*
  text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>')

  // Se o texto não contém tags HTML estruturadas de parágrafos/divs, converte \n em <br/>
  if (!text.includes('<p') && !text.includes('<div') && text.includes('\n')) {
    text = text.split('\n').join('<br/>')
  }

  return text
}

export function EditorCadernoQuestoes({
  value,
  onChange,
  qtdQuestoes
}: EditorCadernoQuestoesProps) {
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const editorRef = useRef<HTMLDivElement>(null)
  const isUpdatingFromProps = useRef(false)

  // Inicializa e sincroniza o conteúdo do contentEditable com a prop value
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML
      // Formata se for texto legado com markdown
      const targetHtml = formatarTextoQuestoesParaHtml(value || '')
      
      // Só atualiza se o conteúdo for realmente diferente para não perder a posição do cursor
      if (currentHtml !== targetHtml && currentHtml.replace(/\s+/g, '') !== targetHtml.replace(/\s+/g, '')) {
        isUpdatingFromProps.current = true
        editorRef.current.innerHTML = targetHtml
        isUpdatingFromProps.current = false
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (isUpdatingFromProps.current) return
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }, [onChange])

  // Executa comandos de formatação no editor preservando o foco
  const executeCommand = (command: string, commandValue: string | undefined = undefined) => {
    if (!editorRef.current) return

    editorRef.current.focus()
    // Executa comando no documento / seleção ativa
    document.execCommand(command, false, commandValue)
    handleInput()
  }

  // Atalhos de teclado no contentEditable
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        executeCommand('bold')
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        executeCommand('italic')
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        executeCommand('underline')
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        executeCommand('justifyFull')
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        executeCommand('justifyCenter')
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        executeCommand('justifyLeft')
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        executeCommand('justifyRight')
      }
    }
  }

  // Inserção rápida de modelo de questão formatado
  const inserirModeloQuestao = () => {
    if (!editorRef.current) return
    editorRef.current.focus()

    const rawText = editorRef.current.innerText || ''
    const matchQuestoes = rawText.match(/QUESTÃO\s+(\d+)/gi) || []
    const numeroQuestao = matchQuestoes.length + 1
    const padNumero = numeroQuestao < 10 ? `0${numeroQuestao}` : numeroQuestao

    const questionHtml = `
      <div style="margin: 14px 0;">
        <p style="margin: 4px 0;"><strong style="font-weight: 800; font-size: 13px;">QUESTÃO ${padNumero}</strong></p>
        <p style="text-align: justify; margin: 6px 0; line-height: 1.5;">Digite ou cole aqui o enunciado completo da questão com todos os detalhes e contexto necessário...</p>
        <p style="margin: 6px 0; line-height: 1.6;">
          A) Primeira alternativa<br/>
          B) Segunda alternativa<br/>
          C) Terceira alternativa<br/>
          D) Quarta alternativa<br/>
          E) Quinta alternativa
        </p>
      </div>
      <p><br/></p>
    `

    document.execCommand('insertHTML', false, questionHtml)
    handleInput()
  }

  const limparTexto = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
      onChange('')
      editorRef.current.focus()
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Barra de Ferramentas WYSIWYG */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/50 dark:bg-zinc-900 border border-border rounded-xl">
        {/* Controles de Formatação Visual de Texto */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Negrito */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('bold')}
            title="Negrito (Ctrl+B)"
            className="h-8 px-2.5 font-extrabold gap-1 text-xs hover:bg-muted active:scale-95"
          >
            <Bold className="w-4 h-4" />
            <span className="hidden sm:inline">Negrito</span>
          </Button>

          {/* Itálico */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('italic')}
            title="Itálico (Ctrl+I)"
            className="h-8 px-2.5 italic gap-1 text-xs hover:bg-muted active:scale-95"
          >
            <Italic className="w-4 h-4" />
            <span className="hidden sm:inline">Itálico</span>
          </Button>

          {/* Sublinhado */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('underline')}
            title="Sublinhado (Ctrl+U)"
            className="h-8 px-2.5 underline gap-1 text-xs hover:bg-muted active:scale-95"
          >
            <Underline className="w-4 h-4" />
          </Button>

          <div className="w-[1px] h-5 bg-border mx-1" />

          {/* Alinhar à Esquerda */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyLeft')}
            title="Alinhar à Esquerda (Ctrl+L)"
            className="h-8 px-2 text-xs hover:bg-muted active:scale-95"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>

          {/* Centralizar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyCenter')}
            title="Centralizar (Ctrl+E)"
            className="h-8 px-2 text-xs hover:bg-muted active:scale-95"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>

          {/* Alinhar à Direita */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyRight')}
            title="Alinhar à Direita (Ctrl+R)"
            className="h-8 px-2 text-xs hover:bg-muted active:scale-95"
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          {/* Justificado */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyFull')}
            title="Justificar Texto (Ctrl+J)"
            className="h-8 px-2.5 font-bold gap-1 text-xs hover:bg-muted active:scale-95"
          >
            <AlignJustify className="w-4 h-4" />
            <span className="hidden sm:inline">Justificar</span>
          </Button>

          <div className="w-[1px] h-5 bg-border mx-1" />

          {/* Inserir Modelo de Questão */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={inserirModeloQuestao}
            title="Adicionar modelo estruturado de questão"
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Questão</span>
          </Button>
        </div>

        {/* Alternador de Abas: Editor Visual vs Pré-visualização de Impressão */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tab === 'editor' ? 'secondary' : 'ghost'}
            onClick={() => setTab('editor')}
            className="h-7 px-2.5 text-xs font-bold gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Editor Visual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'preview' ? 'secondary' : 'ghost'}
            onClick={() => setTab('preview')}
            className="h-7 px-2.5 text-xs font-bold gap-1"
          >
            <Eye className="w-3 h-3" />
            Prévia (2 Colunas)
          </Button>
        </div>
      </div>

      {/* Área Principal de Edição WYSIWYG ou Pré-visualização */}
      {tab === 'editor' ? (
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Digite ou cole aqui os textos das questões da prova. Selecione o texto e clique nos botões da barra acima para aplicar Negrito ou Justificar em tempo real..."
            className="w-full min-h-[280px] max-h-[420px] overflow-y-auto p-4 text-xs font-sans bg-background text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 empty:before:pointer-events-none"
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          />
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white text-black p-5 max-h-[420px] overflow-y-auto shadow-sm">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-black uppercase tracking-wide text-gray-900">
                Visualização da Folha de Questões (2 Colunas A4)
              </span>
            </div>
            {qtdQuestoes && (
              <span className="text-[10px] font-mono font-bold text-gray-500">
                {qtdQuestoes} QUESTÕES PREVISTAS
              </span>
            )}
          </div>

          {value && value.trim() ? (
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
              Nenhum texto digitado ainda. Clique na aba &quot;Editor Visual&quot; para adicionar questões.
            </div>
          )}
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              <strong>Dica:</strong> Selecione o texto e clique em <strong>Negrito</strong> (Ctrl+B) ou <strong>Justificar</strong> (Ctrl+J). O texto formata visualmente na hora.
            </span>
          </span>
        </div>

        {value && value.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limparTexto}
            className="h-6 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 gap-1"
          >
            <Trash2 className="w-3 h-3" /> Limpar Tudo
          </Button>
        )}
      </div>
    </div>
  )
}
