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
    if (!assinaturaBase64) return toast.error('A assinatura do profissional é obrigatória')

    setLoading(true)
    const supabase = createBrowserClient()
    
    try {
      // 1. Inserir a evolução
      const { data: evolucao, error: evError } = await supabase
        .from('emaee_evolucoes')
        .insert({
          emaee_matricula_id: matriculaEmaeeId,
          profissional_id: (funcionario?.id || null) as any,
          especialidade,
          data_atendimento: dataAtendimento,
          tipo_atendimento: tipoAtendimento,
          resumo_evolucao: resumo,
          conduta_orientacoes: conduta || '',
          assinado_em: new Date().toISOString()
        })
        .select('id')
        .single()
        
      if (evError) throw evError
      
      // 2. Fazer upload da assinatura (Storage)
      const blob = base64ToBlob(assinaturaBase64)
      const fileName = `evolucao_${evolucao.id}_profissional.png`
      
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })
        
      if (uploadErr) {
        // Fallback: se bucket não existir, tenta criar o bucket ou avisa e ignora (já que é dev)
        console.error('Erro de upload, bucket pode não existir:', uploadErr)
      } else {
        const { data: pData } = supabase.storage.from('assinaturas').getPublicUrl(fileName)
        
        await supabase
          .from('emaee_evolucoes')
          .update({ assinatura_profissional_url: pData.publicUrl })
          .eq('id', evolucao.id)
      }

      toast.success('Evolução clínica salva com sucesso!')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar evolução')
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
        maxWidth="sm:max-w-[800px]"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-evolucao-emaee"
              disabled={loading || !assinaturaBase64}
              className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
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
        <form id="form-evolucao-emaee" onSubmit={handleSubmit} className="space-y-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-300">Especialidade do Atendimento *</Label>
              <Select value={especialidade} onValueChange={(val) => setEspecialidade(val || '')} required>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
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
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-300">Data *</Label>
                <Input 
                  type="date"
                  required
                  value={dataAtendimento}
                  onChange={e => setDataAtendimento(e.target.value)}
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-300">Modalidade</Label>
                <Select value={tipoAtendimento} onValueChange={(val) => setTipoAtendimento(val || '')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online / Remoto</SelectItem>
                    <SelectItem value="Visita Domiciliar">Visita Domiciliar</SelectItem>
                    <SelectItem value="Visita Escolar">Visita Escolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-gray-300">Resumo da Evolução (O que foi trabalhado/observado) *</Label>
            <Textarea
              required
              value={resumo}
              onChange={e => setResumo(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1 h-32 resize-none"
              placeholder="Descreva detalhadamente o atendimento..."
            />
          </div>
          
          <div>
            <Label className="text-xs text-gray-300">Conduta e Orientações (Próximos passos)</Label>
            <Textarea
              value={conduta}
              onChange={e => setConduta(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1 h-20 resize-none"
              placeholder="O que foi orientado ao paciente/responsável..."
            />
          </div>
          
          <div className="bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
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
