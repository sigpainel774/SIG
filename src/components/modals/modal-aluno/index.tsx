'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Save, Lock, Unlock, Loader2, Send, Smartphone } from 'lucide-react'
import { AlunoFormProvider, useAlunoForm } from './context/AlunoFormContext'
import { ModalAlunoProps } from './types'

// Componentes das Seções
import { SecaoIdentificacao } from './components/SecaoIdentificacao'
import { SecaoMatricula } from './components/SecaoMatricula'
import { SecaoEndereco } from './components/SecaoEndereco'
import { SecaoSaude } from './components/SecaoSaude'
import { SecaoAssinaturas } from './components/SecaoAssinaturas'

function ModalAlunoContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
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
    escolas,
    escolaId,
    setEscolaId,
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

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={(val) => { if (!val) handleClose(); else handleOpenChange(true); }}
      title={alunoEditar ? 'Editar Ficha do Aluno' : 'Cadastro Completo de Aluno'}
      maxWidth="sm:max-w-[1200px]"
      className="w-[95vw]"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="aluno-form"
            disabled={loading || isFichaBloqueada}
            className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (
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
      <form id="aluno-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Banner de Bloqueio por Assinatura */}
        {isDocumentoBloqueado && (
          <div className="bg-[#1e1b4b]/80 border border-[#3730a3] p-4 rounded-xl space-y-3 print:hidden">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#818cf8] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Matrícula Assinada e Bloqueada</h4>
                <p className="text-xs text-zinc-300 leading-normal">
                  Este documento possui assinatura eletrônica registrada. Para garantir a integridade das assinaturas e do PDF assinado oficial, modificações só são permitidas com liberação do Diretor.
                </p>
              </div>
            </div>

            {!isEdicaoLiberada && (
              <div className="pt-2 border-t border-[#3730a3]/50 flex flex-col gap-2">
                {solicitacaoPendente ? (
                  <div className="text-[11px] text-zinc-400 bg-black/30 p-2.5 rounded-lg border border-[#2a2a2a] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#3ea6ff] animate-spin shrink-0" />
                    <span>Solicitação de liberação pendente de aprovação do Diretor. Justificativa: <em>"{justificativaPendente}"</em></span>
                  </div>
                ) : (
                  <>
                    {!solicitandoLibere ? (
                      <Button
                        type="button"
                        onClick={() => setSolicitandoLibere(true)}
                        className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer w-fit"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Solicitar Liberação para Edição
                      </Button>
                    ) : (
                      <div className="space-y-2 bg-black/30 p-3 rounded-lg border border-[#3730a3]/30">
                        <Label className="text-[10px] text-zinc-400 font-bold uppercase">Justificativa para Alteração</Label>
                        <textarea
                          value={justificativaSolicitacao}
                          onChange={(e) => setJustificativaSolicitacao(e.target.value)}
                          placeholder="Descreva detalhadamente o motivo pelo qual precisa alterar a ficha do aluno..."
                          className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-[#3ea6ff] focus:outline-none min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setSolicitandoLibere(false)
                              setJustificativaSolicitacao('')
                            }}
                            className="h-8 text-xs px-3 hover:bg-zinc-800 text-zinc-400"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={handleEnviarSolicitacaoEdicao}
                            disabled={loading || !justificativaSolicitacao.trim()}
                            className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold h-8 text-xs px-3 rounded-lg flex items-center gap-1"
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
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3.5 rounded-xl text-yellow-400 text-xs flex items-center gap-2 print:hidden">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Ficha temporariamente bloqueada para escrita. Solicite liberação acima para editar os campos.</span>
          </div>
        )}

        {/* Módulos do Formulário de Aluno */}
        <SecaoIdentificacao />
        <SecaoMatricula />
        <SecaoEndereco />
        <SecaoSaude />

        {/* Módulo de Assinaturas (Somente se for edição) */}
        <fieldset disabled={isFichaBloqueada} className="space-y-6">
          <SecaoAssinaturas />

          {/* QRCode de Assinatura Mobile */}
          {celularSigningCode && (
            <div className="border border-[#2a2a2a] bg-[#121212] p-4 rounded-xl max-w-sm mx-auto flex flex-col items-center text-center space-y-4 shadow-lg print:hidden">
              <div className="flex items-center gap-2 text-xs text-sky-400 font-bold">
                <Smartphone className="w-4 h-4" />
                <span>Assinatura via Celular Ativa</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Aponte a câmera do celular para o QRCode ou acesse no navegador móvel. Digite o código abaixo para autenticar a assinatura.
              </p>

              <div className="p-2 bg-white rounded-lg border border-zinc-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `${window.location.origin}/assinar?code=${celularSigningCode}`
                  )}`}
                  alt="QR Code Assinatura"
                  className="w-28 h-28"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Código de Assinatura</span>
                <div className="text-2xl font-mono font-black text-white bg-[#18181b] py-2 rounded-xl tracking-widest border border-[#27272a]">
                  {celularSigningCode}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-[#3ea6ff]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold">Aguardando desenho...</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={cancelarAssinaturaCelular}
                className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-9 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar Operação
              </Button>
            </div>
          )}

        </fieldset>
      </form>
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
    <AlunoFormProvider props={props} isOpen={activeOpen} setIsOpen={handleOpenChange}>
      {props.trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {props.trigger}
        </div>
      )}
      <ModalAlunoContent activeOpen={activeOpen} handleOpenChange={handleOpenChange} />
    </AlunoFormProvider>
  )
}
