'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Save, Lock, Unlock, Loader2, Send, Smartphone, Camera, Trash2, AlertTriangle } from 'lucide-react'
import { AlunoFormProvider, useAlunoForm } from './context/AlunoFormContext'
import { ModalAlunoProps } from './types'
import { toast } from 'sonner'

// Sub-abas do Aluno
import { SecaoIdentificacao } from './components/SecaoIdentificacao'
import { SecaoMatricula } from './components/SecaoMatricula'
import { SecaoEndereco } from './components/SecaoEndereco'
import { SecaoSaude } from './components/SecaoSaude'
import { SecaoAssinaturas } from './components/SecaoAssinaturas'

function ModalAlunoContent({ activeOpen, handleOpenChange }: { activeOpen: boolean, handleOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'identificacao' | 'matricula' | 'endereco' | 'saude' | 'aee_assinaturas'>('identificacao')

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
    celularSigningField,
    vinculosAEE
  } = useAlunoForm()

  const isDocumentoBloqueado = alunoEditar?.dados_matricula?.documento_bloqueado === true

  const handleClose = async () => {
    // 🛡️ Regra Anti-Órfãos / Proteção em Novos Cadastros:
    // Se for cadastro novo (aluno ainda não salvo) e tiver atendimentos AEE preenchidos/ativos,
    // bloquear cancelamento acidental com aviso explicativo.
    const vinculosPendentesNovos = vinculosAEE.filter((v: any) => !v.isRemovido)
    if (!alunoEditar?.id && vinculosPendentesNovos.length > 0) {
      toast.error(
        'Existem atendimentos AEE configurados. Salve a ficha do aluno para efetivar os atendimentos ou remova os vínculos antes de cancelar.',
        { duration: 5000 }
      )
      return
    }

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
            <div className="relative shrink-0">
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
              {!isCompressingPhoto && (
                <>
                  <label
                    htmlFor="modal-foto-aluno-header-input"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-highlight flex items-center justify-center cursor-pointer hover:bg-highlight/80 transition-colors shadow-sm"
                    title="Alterar foto do aluno"
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
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isCompressingPhoto}
                onChange={handleFotoUpload}
              />
            </div>
            <div className="text-[11px] text-zinc-400">
              <p className="font-semibold text-zinc-300">Foto 3x4 do Aluno</p>
              <p>PNG/JPG/WebP · até 20MB</p>
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
