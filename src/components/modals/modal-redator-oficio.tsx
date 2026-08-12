'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Printer, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  FileText,
  AlertTriangle,
  Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export interface DadosOficio {
  numeroOficio: string
  destinatario: string
  assunto: string
  conteudoHtml: string
}

interface ModalRedatorOficioProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (dados: DadosOficio) => void
  funcionarioNome?: string
  funcionarioCargo?: string
}

export function ModalRedatorOficio({
  isOpen,
  onClose,
  onConfirm,
  funcionarioNome,
  funcionarioCargo,
}: ModalRedatorOficioProps) {
  const [mounted, setMounted] = useState(false)
  const anoAtual = new Date().getFullYear()

  const [numeroOficio, setNumeroOficio] = useState(`001 / ${anoAtual}`)
  const [destinatario, setDestinatario] = useState('Ao(À) Senhor(a): ')
  const [assunto, setAssunto] = useState('Assunto: ')

  // Conteúdo inicial padrão formatado em parágrafos
  const [conteudoHtml, setConteudoHtml] = useState<string>(
    `<p>Cumprimentando-o(a) cordialmente, vimos por meio deste encaminhar a comunicação oficial desta Secretaria Municipal de Saúde, colocando-nos à inteira disposição para maiores esclarecimentos que se fizerem necessários.</p><p>Sem mais para o momento, renovamos nossos protestos de elevada estima e distinta consideração.</p>`
  )

  const [fontFamily, setFontFamily] = useState<string>('Arial, sans-serif')
  const [fontSize, setFontSize] = useState<string>('14px')
  const [isSegundaPagina, setIsSegundaPagina] = useState(false)
  const [alturaConteudoPx, setAlturaConteudoPx] = useState(0)

  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Sincronizar o HTML inicial no editor `contentEditable` ao abrir
  useEffect(() => {
    if (isOpen && editorRef.current) {
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML.trim() === '') {
        editorRef.current.innerHTML = conteudoHtml
      }
    }
  }, [isOpen, conteudoHtml])

  // Medição da altura do papel A4 para o indicador de 2ª página (~950px é a altura imprimível de 1 folha A4 em 96dpi)
  const ALTURA_FOLHA_A4_PX = 880

  const checarAlturaConteudo = useCallback(() => {
    if (editorRef.current) {
      const h = editorRef.current.scrollHeight
      setAlturaConteudoPx(h)
      setIsSegundaPagina(h > ALTURA_FOLHA_A4_PX)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      checarAlturaConteudo()
    }, 150)

    const observer = new ResizeObserver(() => {
      checarAlturaConteudo()
    })

    if (editorRef.current) {
      observer.observe(editorRef.current)
    }

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [isOpen, checarAlturaConteudo])

  if (!mounted || !isOpen) return null

  // Executar comandos de edição de texto rico nativos
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setConteudoHtml(editorRef.current.innerHTML)
      checarAlturaConteudo()
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      setConteudoHtml(editorRef.current.innerHTML)
      checarAlturaConteudo()
    }
  }

  const handleAplicarFonte = (font: string) => {
    setFontFamily(font)
    execCmd('fontName', font)
  }

  const handleAplicarTamanho = (size: string) => {
    setFontSize(size)
    // Usar span inline para controlar pixels exatos
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.fontSize = size
      range.surroundContents(span)
      handleInput()
    } else {
      execCmd('fontSize', '3')
    }
  }

  const handleAvancar = () => {
    const htmlFinal = editorRef.current ? editorRef.current.innerHTML : conteudoHtml
    onConfirm({
      numeroOficio,
      destinatario,
      assunto,
      conteudoHtml: htmlFinal,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden">
      <div className="bg-background border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-mutedmerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Redator de Ofício Oficial
                <span className="text-[10px] bg-mutedmerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Secretaria de Saúde
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Escreva o texto do documento com formatação de parágrafos, fontes e estilos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal: Formulário + Editor */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-background">
          {/* Header do Ofício: Campos Estruturados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-background border border-border rounded-xl">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Número do Ofício
              </label>
              <Input
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
                placeholder="Ex: 012 / 2026"
                className="h-9 bg-background border-border text-foreground text-xs font-semibold rounded-lg"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Destinatário / Órgão
              </label>
              <Input
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="Ex: Ao(À) Sr(a). Dr. João Silva - Diretor do Hospital"
                className="h-9 bg-background border-border text-foreground text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Assunto do Ofício
              </label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex: Assunto: Solicitação de medicamentos e insumos..."
                className="h-9 bg-background border-border text-foreground text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Barra de Ferramentas de Formatação (Toolbar) */}
          <div className="bg-background border border-border p-2 rounded-xl flex flex-wrap items-center gap-2 sticky top-0 z-10 shadow-md">
            {/* Seletor de Fonte */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1">
              <Type className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={fontFamily}
                onChange={(e) => handleAplicarFonte(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="Arial, sans-serif" className="bg-background">Arial</option>
                <option value="'Times New Roman', serif" className="bg-background">Times New Roman</option>
                <option value="Calibri, sans-serif" className="bg-background">Calibri</option>
                <option value="Georgia, serif" className="bg-background">Georgia</option>
                <option value="'Courier New', monospace" className="bg-background">Courier New</option>
              </select>
            </div>

            {/* Seletor de Tamanho da Fonte */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1">
              <span className="text-[11px] text-zinc-400 font-bold">Tam:</span>
              <select
                value={fontSize}
                onChange={(e) => handleAplicarTamanho(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="12px" className="bg-background">12px (Pequena)</option>
                <option value="14px" className="bg-background">14px (Padrão)</option>
                <option value="16px" className="bg-background">16px (Média)</option>
                <option value="18px" className="bg-background">18px (Grande)</option>
                <option value="20px" className="bg-background">20px (Título)</option>
              </select>
            </div>

            <div className="h-5 w-[1px] bg-[#26262a] mx-1" />

            {/* Negrito, Itálico, Sublinhado */}
            <button
              type="button"
              onClick={() => execCmd('bold')}
              title="Negrito (Ctrl+B)"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              title="Itálico (Ctrl+I)"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              title="Sublinhado (Ctrl+U)"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <Underline className="w-4 h-4" />
            </button>

            <div className="h-5 w-[1px] bg-[#26262a] mx-1" />

            {/* Alinhamentos */}
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              title="Alinhar à Esquerda"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              title="Centralizar"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              title="Alinhar à Direita"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              title="Justificar"
              className="p-1.5 rounded-lg bg-background hover:bg-[#26262a] text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            {/* Alerta Visual de Página 2 na Barra */}
            {isSegundaPagina && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg animate-pulse font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Atenção: Conteúdo ocupando 2ª Página</span>
              </div>
            )}
          </div>

          {/* Canvas A4 da Folha de Texto com Indicador de 2ª Página */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Folha A4 (Pré-visualização da Redação)</span>
              <span>Altura aproximada: {alturaConteudoPx}px</span>
            </div>

            <div className="relative bg-white text-gray-900 rounded-sm p-8 sm:p-12 shadow-xl border border-gray-300 min-h-[500px]">
              {/* Estilos para parágrafos no editor A4 */}
              <style>{`
                .oficio-editor-canvas p {
                  margin-bottom: 1rem;
                  line-height: 1.6;
                  text-align: justify;
                  text-indent: 2rem;
                }
                .oficio-editor-canvas p:last-child {
                  margin-bottom: 0;
                }
              `}</style>

              {/* Área ContentEditable */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyUp={handleInput}
                style={{ fontFamily, fontSize }}
                className="oficio-editor-canvas outline-none min-h-[350px] text-gray-900"
              />

              {/* Divisor Visual de 2ª Página (Linha demarcatória A4) */}
              {isSegundaPagina && (
                <div className="mt-8 pt-4 border-t-2 border-dashed border-amber-500 relative flex items-center justify-center">
                  <span className="bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow">
                    ⚠️ Limite Folha 1 — Início da Página 2
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Redator */}
          <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-zinc-300">Redigido por: </span>
              <span>{funcionarioNome || 'Servidor da Saúde'}</span>
            </div>
            {funcionarioCargo && (
              <div>
                <span className="font-semibold text-zinc-300">Cargo/Função: </span>
                <span>{funcionarioCargo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé e Botões do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleAvancar}
            className="bg-mutedmerald-600 hover:bg-mutedmerald-700 text-white font-bold gap-2 rounded-xl text-xs px-5 h-10 shadow-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar & Imprimir Ofício</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
