'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Building2, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface SecretariaToEdit {
  id?: string
  nome: string
  logo_url?: string | null
  ativo?: boolean
}

interface ModalSecretariaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretariaToEdit?: SecretariaToEdit | null
  onSuccess?: () => void
}

export function ModalSecretaria({ open, onOpenChange, secretariaToEdit, onSuccess }: ModalSecretariaProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    if (secretariaToEdit) {
      setNome(secretariaToEdit.nome || '')
      setLogoUrl(secretariaToEdit.logo_url || null)
      setAtivo(secretariaToEdit.ativo !== false)
      setLogoFile(null)
    } else {
      setNome('')
      setLogoUrl(null)
      setAtivo(true)
      setLogoFile(null)
    }
  }, [secretariaToEdit, open])

  const uploadLogo = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const sanitizedFileName = file.name.replace(/[^\w.-]/g, '_')
    // Tentaremos usar o bucket 'arquivos'. Se falhar, tentaremos outro comum.
    const filePath = `logos/sec_${Date.now()}_${sanitizedFileName}`

    const { error: uploadError } = await supabase.storage
      .from('arquivos') // Tenta bucket arquivos
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.warn('Erro ao subir para arquivos, tentando alunos-anexos...', uploadError)
      const { error: fallbackError } = await supabase.storage
        .from('alunos-anexos')
        .upload(filePath, file, { upsert: true })
      
      if (fallbackError) {
        throw new Error('Falha no upload do logo. Verifique os buckets do Storage.')
      }

      const { data } = supabase.storage.from('alunos-anexos').getPublicUrl(filePath)
      return data.publicUrl
    }

    const { data } = supabase.storage.from('arquivos').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Preencha o Nome da Secretaria.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      let finalLogoUrl = logoUrl

      if (logoFile) {
        setUploadingLogo(true)
        finalLogoUrl = await uploadLogo(logoFile)
        setUploadingLogo(false)
      }

      const payload = {
        nome: nome.trim(),
        logo_url: finalLogoUrl,
        ativo
      }

      if (secretariaToEdit?.id) {
        const { error } = await supabase
          .from('secretarias')
          .update(payload)
          .eq('id', secretariaToEdit.id)

        if (error) throw error
        toast.success('Secretaria atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('secretarias')
          .insert(payload)

        if (error) throw error
        toast.success('Secretaria criada com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar secretaria: ${err.message}`)
    } finally {
      setLoading(false)
      setUploadingLogo(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('O arquivo da logo deve ter no máximo 2MB.')
        return
      }
      setLogoFile(file)
      
      // Mostrar preview temporário
      const objectUrl = URL.createObjectURL(file)
      setLogoUrl(objectUrl)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={secretariaToEdit ? 'Editar Secretaria' : 'Nova Secretaria'}
      maxWidth="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div>
          <Label className="text-xs text-[#aaa]">Nome da Secretaria *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Secretaria Municipal de Educação"
            className="bg-[#18181a] border-[#27272a] text-white mt-1"
            required
          />
        </div>

        <div>
          <Label className="text-xs text-[#aaa] mb-2 block">Logo da Secretaria (Opcional)</Label>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-[#27272a] bg-[#121214] flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-600" />
              )}
            </div>

            <div className="flex-1">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#27272a] bg-[#18181a] hover:bg-[#202024] text-xs font-semibold text-white cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {logoFile ? 'Trocar Arquivo' : 'Selecionar Logo'}
              </label>
              {logoFile && (
                <p className="text-[10px] text-slate-400 mt-1.5 truncate max-w-[200px]">
                  {logoFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="secAtivo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="w-4 h-4 accent-sky-500 rounded border-gray-600 bg-gray-700 cursor-pointer"
          />
          <label htmlFor="secAtivo" className="text-sm text-slate-300 font-medium cursor-pointer">
            Secretaria Ativa
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#27272a] mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingLogo}
            className="bg-sky-600 text-white hover:bg-sky-700 font-semibold gap-2"
          >
            {loading || uploadingLogo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Salvando...' : uploadingLogo ? 'Enviando logo...' : secretariaToEdit ? 'Atualizar' : 'Criar Secretaria'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
