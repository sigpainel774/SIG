'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Save, UserPlus, Camera } from 'lucide-react'
import { ModalFuncionarioProps } from './types'
import { FuncionarioFormProvider, useFuncionarioForm } from './context/FuncionarioFormContext'

// Sub-abas
import { PessoaisTab } from './components/PessoaisTab'
import { DocumentosTab } from './components/DocumentosTab'
import { EmpregoTab } from './components/EmpregoTab'
import { SaudeTab } from './components/SaudeTab'
import { EscolaridadeTab } from './components/EscolaridadeTab'
import { AnexosTab } from './components/AnexosTab'

function ModalFuncionarioContent() {
  const [activeTab, setActiveTab] = useState<'pessoais' | 'documentos' | 'emprego' | 'saude' | 'escolaridade' | 'anexos'>('pessoais')

  const {
    isEditing,
    nome,
    loadingData,
    escolaNome,
    escolaInep,
    escolaLocalizacao,
    fotoPreview,
    handleFotoChange,
    handleSubmit,
  } = useFuncionarioForm()

  const tabClass = (tab: typeof activeTab) =>
    `px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
      activeTab === tab
        ? 'border-highlight text-highlight'
        : 'border-transparent text-zinc-400 hover:text-white'
    }`

  // Cache buster persistente por ciclo de abertura para evitar refetching agressivo a cada render
  const [cacheBuster] = useState(() => Date.now())

  // Mitigação do Cache do Storage: Injeta timestamp se for URL remota (não base64)
  const getFotoSrc = () => {
    if (!fotoPreview) return null
    if (fotoPreview.startsWith('data:')) return fotoPreview
    return `${fotoPreview}?t=${cacheBuster}`
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
      </div>
    )
  }

  return (
    <form id="funcionario-form" onSubmit={handleSubmit} className="space-y-6 py-2">
      
      {/* Foto e Escola Vinculada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#18181a] p-4 rounded-xl border border-borderCustom">
        {/* Foto 3x4 */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-20 rounded bg-[#1a1a2e] border-2 border-[#3ea6ff]/40 overflow-hidden flex items-center justify-center">
              {fotoPreview ? (
                <img src={getFotoSrc()!} alt="Foto 3x4" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-center text-zinc-500 font-bold">
                  FOTO 3x4
                </span>
              )}
            </div>
            <label
              htmlFor="foto-input"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#3ea6ff] flex items-center justify-center cursor-pointer hover:bg-[#0090ff] transition-colors"
              title="Alterar foto"
            >
              <Camera className="w-3 h-3 text-white" />
            </label>
            <input
              id="foto-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFotoChange}
            />
          </div>
          <div className="text-[11px] text-zinc-400">
            <p className="font-semibold text-zinc-300">Foto 3x4 do Servidor</p>
            <p>PNG/JPG · max 5MB</p>
          </div>
        </div>

        {/* Dados da Escola (Auto-preenchidos) */}
        <div className="md:col-span-2 space-y-1.5 text-xs border-l border-zinc-800 pl-6">
          <p className="font-semibold text-highlight text-[10px] uppercase tracking-wider">Unidade Escolar Vinculada</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-zinc-500 block">Nome da UE:</span>
              <span className="font-medium text-zinc-200">{escolaNome || 'Sem vínculo ativo'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Código INEP:</span>
              <span className="font-medium text-zinc-200">{escolaInep || '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">Localização da UE: </span>
              <span className="font-medium text-zinc-200">{escolaLocalizacao || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu de Abas */}
      <div className="flex flex-wrap gap-1 border-b border-borderCustom scrollbar-none overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('pessoais')} className={tabClass('pessoais')}>Identificação</button>
        <button type="button" onClick={() => setActiveTab('documentos')} className={tabClass('documentos')}>Docs & Endereço</button>
        <button type="button" onClick={() => setActiveTab('emprego')} className={tabClass('emprego')}>Dados Empregatícios</button>
        <button type="button" onClick={() => setActiveTab('saude')} className={tabClass('saude')}>Saúde</button>
        <button type="button" onClick={() => setActiveTab('escolaridade')} className={tabClass('escolaridade')}>Escolaridade</button>
        <button type="button" onClick={() => setActiveTab('anexos')} className={tabClass('anexos')}>Anexos & Obs</button>
      </div>

      {/* Renderização Condicional do Conteúdo da Aba Ativa */}
      <div className="min-h-[300px]">
        {activeTab === 'pessoais' && <PessoaisTab />}
        {activeTab === 'documentos' && <DocumentosTab />}
        {activeTab === 'emprego' && <EmpregoTab />}
        {activeTab === 'saude' && <SaudeTab />}
        {activeTab === 'escolaridade' && <EscolaridadeTab />}
        {activeTab === 'anexos' && <AnexosTab />}
      </div>
    </form>
  )
}

function ModalFuncionarioFooter() {
  const { loading, isEditing, handleOpenChange } = useFuncionarioForm()
  return (
    <div className="flex justify-end gap-2 w-full pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(false)}
        className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom cursor-pointer"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="funcionario-form"
        disabled={loading}
        className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 cursor-pointer border-none"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
      </Button>
    </div>
  )
}

export function ModalFuncionario(props: ModalFuncionarioProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'pessoais' | 'documentos' | 'emprego' | 'saude' | 'escolaridade' | 'anexos'>('pessoais')

  const activeOpen = props.open !== undefined ? props.open : isOpen

  const handleOpenChange = (val: boolean) => {
    if (props.onOpenChange) props.onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setActiveTab('pessoais')
    }
  }

  return (
    <>
      {props.trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {props.trigger}
        </div>
      )}
      {activeOpen && (
        <FuncionarioFormProvider
          props={props}
          isOpen={activeOpen}
          setIsOpen={handleOpenChange}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        >
          <StandardDialog
            open={activeOpen}
            onOpenChange={handleOpenChange}
            title={props.funcionario ? 'Editar Funcionário' : 'Cadastro de Funcionário / Servidor'}
            maxWidth="sm:max-w-4xl"
            footer={<ModalFuncionarioFooter />}
          >
            <ModalFuncionarioContent />
          </StandardDialog>
        </FuncionarioFormProvider>
      )}
    </>
  )
}
