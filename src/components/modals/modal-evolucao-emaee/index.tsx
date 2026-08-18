'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { createBrowserClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface ModalEvolucaoEmaeeProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  matriculaEmaeeId: string
  onSuccess?: () => void
}

export function ModalEvolucaoEmaee({ open, onOpenChange, trigger, matriculaEmaeeId, onSuccess }: ModalEvolucaoEmaeeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeOpen = open !== undefined ? open : isOpen
  
  const { funcionario } = useAuthStore()
  const [loading, setLoading] = useState(false)
  
  const [especialidade, setEspecialidade] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(new Date().toISOString().split('T')[0])
  const [tipoAtendimento, setTipoAtendimento] = useState('Presencial')
  const [resumo, setResumo] = useState('')
  const [conduta, setConduta] = useState('')
  const [assinaturaBase64, setAssinaturaBase64] = useState<string | null>(null)

  const [profissionalNome, setProfissionalNome] = useState(funcionario?.nome || '')
  const [profissionalRegistro, setProfissionalRegistro] = useState((funcionario as any)?.registro_profissional || '')

  React.useEffect(() => {
    if (funcionario) {
      setProfissionalNome((prev: string) => prev || funcionario.nome || '')
      setProfissionalRegistro((prev: string) => prev || (funcionario as any)?.registro_profissional || '')
    }
  }, [funcionario])

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      // reset
      setEspecialidade('')
      setResumo('')
      setConduta('')
      setAssinaturaBase64(null)
      setDataAtendimento(new Date().toISOString().split('T')[0])
      setProfissionalNome(funcionario?.nome ?? '')
      setProfissionalRegistro((funcionario as any)?.registro_profissional ?? '')
    }
  }

  const base64ToBlob = (base64: string) => {
    const parts = base64.split(';base64,')
    const contentType = parts[0].split(':')[1]
    const raw = window.atob(parts[1])
    const rawLength = raw.length
    const uInt8Array = new Uint8Array(rawLength)
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i)
    }
    return new Blob([uInt8Array], { type: contentType })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!especialidade) return toast.error('Selecione a especialidade')
    if (!resumo) return toast.error('Preencha o resumo da evolução')
    if (!assinaturaBase64 || assinaturaBase64.length < 200) {
      return toast.error('A assinatura digital do profissional é obrigatória.')
    }
    if (!funcionario?.id) {
      return toast.error('Profissional não autenticado ou perfil não encontrado.')
    }

    setLoading(true)
    const supabase = createBrowserClient()
    
    try {
      // 1. Fazer upload da assinatura digital primeiro no Storage
      const blob = base64ToBlob(assinaturaBase64)
      const fileName = `evolucao_${matriculaEmaeeId}_${Date.now()}_prof.png`
      
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })
        
      if (uploadErr) {
        console.error('Erro de upload da assinatura:', uploadErr)
        throw new Error('Falha ao processar e salvar a assinatura digital. Tente novamente.')
      }

      const { data: pData } = supabase.storage.from('assinaturas').getPublicUrl(fileName)
      const assinaturaUrl = pData?.publicUrl || null

      if (!assinaturaUrl) {
        throw new Error('Não foi possível gerar o link da assinatura digital.')
      }

      // 2. Inserir a evolução clínica assinada atomicamente
      const { error: evError } = await supabase
        .from('emaee_evolucoes')
        .insert({
          emaee_matricula_id: matriculaEmaeeId,
          profissional_id: funcionario.id,
          especialidade,
          data_atendimento: dataAtendimento,
          tipo_atendimento: tipoAtendimento,
          resumo_evolucao: resumo,
          conduta_orientacoes: conduta || '',
          assinatura_profissional_url: assinaturaUrl,
          assinado_em: new Date().toISOString(),
          profissional_nome: funcionario.nome || profissionalNome || 'Profissional AEE',
          profissional_registro: profissionalRegistro ?? null
        } as any)
        
      if (evError) throw evError

      toast.success('Evolução clínica assinada e salva com sucesso!')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar evolução clínica:', err)
      toast.error(err.message || 'Erro ao salvar evolução clínica')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}
      
      <StandardDialog
        open={activeOpen}
        onOpenChange={handleOpenChange}
        title="Nova Evolução Clínica"
        description="Registre o atendimento, as orientações e a assinatura do profissional responsável."
        maxWidth="sm:max-w-[800px]"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-evolucao-emaee"
              disabled={loading || !assinaturaBase64}
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Evolução
                </span>
              )}
            </Button>
          </div>
        }
      >
        <form id="form-evolucao-emaee" onSubmit={handleSubmit} className="space-y-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Nome do Profissional (Sua Conta)</Label>
              <Input
                readOnly
                value={funcionario?.nome || profissionalNome || ''}
                className="cursor-not-allowed border-border bg-muted/60 text-muted-foreground"
                placeholder="Nome do profissional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Registro Profissional *</Label>
              <Input
                required
                value={profissionalRegistro}
                onChange={e => setProfissionalRegistro(e.target.value)}
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                placeholder="Ex: CRP 03/12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Especialidade do Atendimento *</Label>
              <Select value={especialidade} onValueChange={(val) => setEspecialidade(val || '')} required>
                <SelectTrigger className="border-border bg-input text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="Psicologia">Psicologia</SelectItem>
                  <SelectItem value="Psicopedagogia">Psicopedagogia</SelectItem>
                  <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                  <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="Neuropediatria">Neuropediatria</SelectItem>
                  <SelectItem value="AEE">Atendimento Educacional Especializado (AEE)</SelectItem>
                  <SelectItem value="Serviço Social">Serviço Social</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Data *</Label>
                <Input 
                  type="date"
                  required
                  value={dataAtendimento}
                  onChange={e => setDataAtendimento(e.target.value)}
                  className="border-border bg-input text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Modalidade</Label>
                <Select value={tipoAtendimento} onValueChange={(val) => setTipoAtendimento(val || '')}>
                  <SelectTrigger className="border-border bg-input text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online / Remoto</SelectItem>
                    <SelectItem value="Visita Domiciliar">Visita Domiciliar</SelectItem>
                    <SelectItem value="Visita Escolar">Visita Escolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Resumo da Evolução (O que foi trabalhado/observado) *</Label>
            <Textarea
              required
              value={resumo}
              onChange={e => setResumo(e.target.value)}
              className="h-32 resize-none border-border bg-input text-foreground placeholder:text-muted-foreground"
              placeholder="Descreva detalhadamente o atendimento..."
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Conduta e Orientações (Próximos passos)</Label>
            <Textarea
              value={conduta}
              onChange={e => setConduta(e.target.value)}
              className="h-20 resize-none border-border bg-input text-foreground placeholder:text-muted-foreground"
              placeholder="O que foi orientado ao paciente/responsável..."
            />
          </div>
          
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <SignaturePad
              label="Assinatura do Profissional Responsável"
              value={assinaturaBase64}
              onChange={setAssinaturaBase64}
              isEditMode={true}
              globalSignatureUrl={funcionario?.assinatura_url}
            />
          </div>
        </form>
      </StandardDialog>
    </>
  )
}
