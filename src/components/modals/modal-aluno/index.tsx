'use client'

import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
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
    <Dialog open={activeOpen} onOpenChange={(val) => { if (!val) handleClose(); else handleOpenChange(true); }}>
      <DialogContent className="sm:max-w-[1200px] w-[95vw] max-h-[90vh] bg-[#181818] border border-[#2a2a2a] text-[#f1f1f1] p-0 overflow-hidden flex flex-col rounded-xl shadow-2xl">
        
        {/* Cabeçalho Fixo (Sticky) */}
        <DialogHeader className="sticky top-0 z-10 bg-[#181818] border-b border-[#2a2a2a] px-6 py-4 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-[#3ea6ff]" />
            {alunoEditar ? 'Editar Ficha do Aluno' : 'Cadastro Completo de Aluno'}
          </DialogTitle>
        </DialogHeader>

        {/* Formulário com Scroll discreto */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-[#181818]">
          
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
                              className="h-8 px-3 text-[10px] rounded-md text-zinc-400 hover:text-white"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              onClick={handleEnviarSolicitacaoEdicao}
                              disabled={loading || !justificativaSolicitacao.trim()}
                              className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold text-[10px] h-8 px-3 rounded-md flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              Enviar Solicitação
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {isEdicaoLiberada && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-800/30 flex items-center gap-1.5 font-semibold">
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                  <span>Edição temporária liberada pelo Diretor! Qualquer alteração exigirá nova assinatura e recompilação do PDF.</span>
                </div>
              )}
            </div>
          )}

          <fieldset disabled={isFichaBloqueada} className="space-y-6 flex flex-col">

            {/* 0. Seletor de Escola */}
            {!alunoEditar && escolas.length > 0 && (
              <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                <Label className="text-xs text-gray-400 font-bold uppercase">Escola / Unidade Escolar</Label>
                <Select value={escolaId} onValueChange={(val) => setEscolaId(val || '')}>
                  <SelectTrigger className="bg-[#181818] border-[#2a2a2a] text-white mt-1">
                    <SelectValue placeholder="Selecione a Escola">
                      {escolaId 
                        ? (escolas.find((esc) => esc.id === escolaId)?.nome || (escolas.length === 0 ? 'Carregando...' : escolaId))
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    {escolas.map((esc) => (
                      <SelectItem key={esc.id} value={esc.id}>{esc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seções de Formulário Modularizadas */}
            <SecaoIdentificacao />
            <SecaoMatricula />
            <SecaoEndereco />
            <SecaoSaude />
            <SecaoAssinaturas />

            {/* Modal / Overlay para Polling de Assinatura via Celular */}
            {celularSigningCode && (
              <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                <div className="bg-[#121214] border border-[#26262a] rounded-2xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#3ea6ff]/40 to-transparent" />
                  
                  <div className="space-y-1.5">
                    <Smartphone className="w-9 h-9 text-[#3ea6ff] mx-auto animate-pulse" />
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">Assinar pelo Celular</h3>
                    <p className="text-[11px] text-zinc-400 max-w-[280px] mx-auto leading-normal">
                      Aponte a câmera para o QR Code ou acesse a URL da Secretaria de Educação.
                    </p>
                  </div>

                  <div className="bg-white p-2 rounded-xl inline-block mx-auto border border-zinc-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        `${window.location.origin}/assinar`
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
              </div>
            )}

          </fieldset>

          {/* Botão Salvar Fixo/Inferior */}
          <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-end gap-3">
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

        </form>
      </DialogContent>
    </Dialog>
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
      {props.trigger && <DialogTrigger render={props.trigger as any} />}
      <ModalAlunoContent activeOpen={activeOpen} handleOpenChange={handleOpenChange} />
    </AlunoFormProvider>
  )
}
