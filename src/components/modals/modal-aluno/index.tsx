'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Save, Lock, Unlock, Loader2, Send, Smartphone, Camera, Trash2, AlertTriangle, ScanFace } from 'lucide-react'
import dynamic from 'next/dynamic'
import { AlunoFormProvider, useAlunoForm } from './context/AlunoFormContext'
import { ModalAlunoProps } from './types'
import { toast } from 'sonner'

const ModalScannerFoto3x4 = dynamic(
  () => import('@/components/modals/scanner-foto-3x4/ModalScannerFoto3x4').then((mod) => mod.ModalScannerFoto3x4),
  { ssr: false }
)

// Sub-abas do Aluno
import { SecaoIdentificacao } from './components/SecaoIdentificacao'
import { SecaoMatricula } from './components/SecaoMatricula'
import { SecaoEndereco } from './components/SecaoEndereco'
import { SecaoSaude } from './components/SecaoSaude'
import { SecaoAssinaturas } from './components/SecaoAssinaturas'

function ModalAlunoContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'identificacao' | 'matricula' | 'endereco' | 'saude' | 'aee_assinaturas'>('identificacao')
  const [scannerOpen, setScannerOpen] = useState(false)

  const {
    alunoEditar,
    isFichaBloqueada,
    isEdicaoLiberada,
    solicitacaoPendente,
    justificativaPendente,
    solicitandoLibere,
    setSolicitandoLibere,
    justificativaSolicitacao,
    setJustificativaSolicitacao,
    handleEnviarSolicitacaoEdicao,
    loading,
    isCompressingPhoto,
    fotoUrl,
    handleFotoUpload,
    handleFotoCapturada,
    handleRemoverFoto,
    escolas,
    escolaId,
    setEscolaId,
    turmas,
    turmaId,
    celularSigningCode,
    cancelarAssinaturaCelular,
    handleSubmit,
    clearDatabaseCodes,
    celularSigningField
  } = useAlunoForm()

  const isDocumentoBloqueado = alunoEditar?.dados_matricula?.documento_bloqueado === true

  const handleClose = async () => {
    // Limpar códigos temporários no banco ao fechar o modal
    if (celularSigningField) {
      await clearDatabaseCodes(celularSigningField)
    }
    handleOpenChange(false)
  }

  const tabClass = (tab: typeof activeTab) =>
    `px-3.5 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
      activeTab === tab
        ? 'border-highlight text-highlight'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  // Informações da escola selecionada
  const escolaSelecionadaObj = escolas.find((e) => e.id === escolaId)
  const turmaSelecionadaObj = turmas.find((t) => t.id === turmaId)

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={(val) => { if (!val) handleClose(); else handleOpenChange(true); }}
      title={alunoEditar ? 'Editar Ficha do Estudante' : 'Cadastro Completo de Estudante'}
      maxWidth="sm:max-w-[1100px]"
      className="w-[95vw] student-edit-modal"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom cursor-pointer text-xs h-9 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="aluno-form"
            disabled={loading || isCompressingPhoto}
            className="bg-highlight text-background hover:bg-highlight/90 font-bold px-6 h-9 rounded-xl text-xs transition-all disabled:opacity-50 shadow-sm gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </span>
            ) : isCompressingPhoto ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Otimizando foto...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {alunoEditar ? 'Atualizar Ficha' : 'Salvar Ficha do Aluno'}
              </span>
            )}
          </Button>
        </div>
      }
    >
      {/* Formulário com id correspondente ao botão do footer */}
      <form id="aluno-form" onSubmit={handleSubmit} className="space-y-5 student-edit-modal__content py-1">
        
        {/* Banner de Bloqueio por Assinatura */}
        {isDocumentoBloqueado && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 p-3.5 rounded-xl space-y-2.5 print:hidden">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-tight">Matrícula Assinada e Bloqueada</h4>
                <p className="text-[11px] text-zinc-300 leading-normal">
                  Este documento possui assinatura eletrônica registrada. Modificações só são permitidas com liberação formal do Diretor.
                </p>
              </div>
            </div>

            {!isEdicaoLiberada && (
              <div className="pt-2 border-t border-indigo-500/20 flex flex-col gap-2">
                {solicitacaoPendente ? (
                  <div className="text-[11px] text-zinc-300 bg-[#141416] p-2.5 rounded-lg border border-borderCustom flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-highlight animate-spin shrink-0" />
                    <span>Solicitação de liberação pendente de aprovação do Diretor. Justificativa: <em>"{justificativaPendente}"</em></span>
                  </div>
                ) : (
                  <>
                    {!solicitandoLibere ? (
                      <Button
                        type="button"
                        onClick={() => setSolicitandoLibere(true)}
                        className="bg-highlight text-background hover:bg-highlight/90 font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer w-fit border-none"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Solicitar Liberação para Edição
                      </Button>
                    ) : (
                      <div className="space-y-2 bg-[#141416] p-3 rounded-lg border border-borderCustom">
                        <Label className="text-[10px] text-zinc-400 font-bold uppercase">Justificativa para Alteração</Label>
                        <textarea
                          value={justificativaSolicitacao}
                          onChange={(e) => setJustificativaSolicitacao(e.target.value)}
                          placeholder="Descreva detalhadamente o motivo pelo qual precisa alterar a ficha do aluno..."
                          className="w-full bg-[#181818] border border-borderCustom rounded-lg p-2 text-xs text-foreground focus:border-highlight focus:outline-none min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setSolicitandoLibere(false)
                              setJustificativaSolicitacao('')
                            }}
                            className="h-7 text-xs px-3 hover:bg-muted text-muted-foreground cursor-pointer"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={handleEnviarSolicitacaoEdicao}
                            disabled={loading || !justificativaSolicitacao.trim()}
                            className="bg-highlight text-background hover:bg-highlight/90 font-bold h-7 text-xs px-3 rounded-lg flex items-center gap-1 cursor-pointer border-none"
                          >
                            <Send className="w-3 h-3" />
                            Enviar
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ficha Bloqueada overlay explicativo */}
        {isFichaBloqueada && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-400 text-xs flex items-center gap-2 print:hidden">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Ficha temporariamente bloqueada para escrita. Solicite liberação acima para editar os campos.</span>
          </div>
        )}

        {/* Card Superior de Identificação Rápida e Foto 3x4 (Padrão Funcionários) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-background p-4 rounded-xl border border-borderCustom">
          {/* Foto 3x4 do Aluno */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative">
                <div className="w-16 h-20 rounded bg-[#1a1a2e] border-2 border-highlight/40 overflow-hidden flex items-center justify-center relative">
                  {isCompressingPhoto ? (
                    <div className="flex flex-col items-center justify-center p-1 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-highlight" />
                      <span className="text-[9px] text-highlight mt-1 font-semibold">Otimizando</span>
                    </div>
                  ) : fotoUrl ? (
                    <img src={fotoUrl} alt="Foto Aluno" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-center text-zinc-500 font-bold">
                      FOTO 3x4
                    </span>
                  )}
                </div>
                {!isCompressingPhoto && !isFichaBloqueada && (
                  <>
                    <label
                      htmlFor="modal-foto-aluno-header-input"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-highlight flex items-center justify-center cursor-pointer hover:bg-highlight/80 transition-colors shadow-sm"
                      title="Alterar foto do aluno (upload tradicional)"
                    >
                      <Camera className="w-3 h-3 text-background" />
                    </label>
                    {fotoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoverFoto}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center cursor-pointer text-white shadow-sm transition-colors"
                        title="Remover foto"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </>
                )}
                <input
                  id="modal-foto-aluno-header-input"
                  type="file"
                  accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  disabled={isCompressingPhoto || isFichaBloqueada}
                  onChange={handleFotoUpload}
                />
              </div>

              {/* Botão Escanear Foto 3x4 */}
              <button
                type="button"
                disabled={isCompressingPhoto || isFichaBloqueada}
                onClick={() => setScannerOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-md bg-[#1f1f23] hover:bg-highlight hover:text-background text-zinc-300 text-[10px] font-bold border border-borderCustom hover:border-highlight transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed w-full"
                title="Escanear foto 3x4 com a câmera do dispositivo"
              >
                <ScanFace className="w-3 h-3" />
                <span>Escanear</span>
              </button>
            </div>

            <div className="text-[11px] text-zinc-400">
              <p className="font-semibold text-zinc-300">Foto 3x4 do Aluno</p>
              <p>PNG/JPG/WebP/HEIC · até 20MB</p>
            </div>
          </div>

          {/* Dados da Unidade e Turma Vinculada */}
          <div className="md:col-span-2 space-y-1.5 text-xs border-l border-borderCustom pl-6">
            <p className="font-semibold text-highlight text-[10px] uppercase tracking-wider">Unidade & Turma Ativa</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="text-zinc-500 block">Unidade Escolar:</span>
                <span className="font-medium text-zinc-200 truncate block">
                  {escolaSelecionadaObj?.nome || 'Selecione na aba Matrícula'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Turma Atual:</span>
                <span className="font-medium text-zinc-200">
                  {turmaSelecionadaObj ? `${turmaSelecionadaObj.nome} (${turmaSelecionadaObj.ano_letivo})` : 'Não enturmado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu de Abas Horizontais */}
        <div className="flex flex-wrap gap-1 border-b border-borderCustom scrollbar-none overflow-x-auto">
          <button type="button" onClick={() => setActiveTab('identificacao')} className={tabClass('identificacao')}>
            Identificação
          </button>
          <button type="button" onClick={() => setActiveTab('matricula')} className={tabClass('matricula')}>
            Matrícula & Turma
          </button>
          <button type="button" onClick={() => setActiveTab('endereco')} className={tabClass('endereco')}>
            Endereço & Contato
          </button>
          <button type="button" onClick={() => setActiveTab('saude')} className={tabClass('saude')}>
            Saúde & Cuidados
          </button>
          <button type="button" onClick={() => setActiveTab('aee_assinaturas')} className={tabClass('aee_assinaturas')}>
            Atendimento AEE & Assinaturas
          </button>
        </div>

        {/* Conteúdo Dinâmico da Aba Ativa */}
        <fieldset disabled={isFichaBloqueada} className="min-h-[360px]">
          {activeTab === 'identificacao' && <SecaoIdentificacao />}
          {activeTab === 'matricula' && <SecaoMatricula />}
          {activeTab === 'endereco' && <SecaoEndereco />}
          {activeTab === 'saude' && <SecaoSaude />}
          {activeTab === 'aee_assinaturas' && <SecaoAssinaturas />}

          {/* QRCode de Assinatura Mobile */}
          {celularSigningCode && (
            <div className="border border-borderCustom bg-[#141416] p-4 rounded-xl max-w-sm mx-auto flex flex-col items-center text-center space-y-4 shadow-lg print:hidden mt-6">
              <div className="flex items-center gap-2 text-xs text-highlight font-bold">
                <Smartphone className="w-4 h-4" />
                <span>Assinatura via Celular Ativa</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Aponte a câmera do celular para o QRCode ou acesse no navegador móvel. Digite o código abaixo para autenticar a assinatura.
              </p>

              <div className="p-2 bg-white rounded-lg border border-border">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `${window.location.origin}/assinar?code=${celularSigningCode}`
                  )}`}
                  alt="QR Code Assinatura"
                  className="w-28 h-28"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Código de Assinatura</span>
                <div className="text-2xl font-mono font-black text-foreground bg-muted py-2 rounded-xl tracking-widest border border-border">
                  {celularSigningCode}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-highlight">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold">Aguardando desenho...</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={cancelarAssinaturaCelular}
                className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar Operação
              </Button>
            </div>
          )}
        </fieldset>
      </form>

      {/* Modal Scanner Foto 3x4 (Carregado Sob Demanda) */}
      {scannerOpen && (
        <ModalScannerFoto3x4
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onFotoCapturada={handleFotoCapturada}
          titulo="Escanear Foto 3x4 do Aluno"
          subtitulo="Enquadre a foto 3x4 da ficha física do aluno para recortar e aplicar"
        />
      )}
    </StandardDialog>
  )
}

export function ModalAluno(props: ModalAlunoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeOpen = props.open !== undefined ? props.open : isOpen

  const handleOpenChange = (val: boolean) => {
    if (props.onOpenChange) props.onOpenChange(val)
    setIsOpen(val)
  }

  return (
    <>
      {props.trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {props.trigger}
        </div>
      )}
      {activeOpen && (
        <AlunoFormProvider props={props} isOpen={activeOpen} setIsOpen={handleOpenChange}>
          <ModalAlunoContent activeOpen={activeOpen} handleOpenChange={handleOpenChange} />
        </AlunoFormProvider>
      )}
    </>
  )
}
