'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { FileUpload } from '@/components/ui/file-upload'

interface EscolaToEdit {
  id?: string
  nome: string
  inep?: string | null
  tipo?: string | null
  ativo?: boolean | null
  logo_url?: string | null
  codigo?: number | null
  localizacao?: string | null
  latitude?: number | null
  longitude?: number | null
  diretor_id?: string | null
}

interface ModalEscolaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaToEdit?: EscolaToEdit | null
  onSuccess?: () => void
}

export function ModalEscola({ open, onOpenChange, escolaToEdit, onSuccess }: ModalEscolaProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [inep, setInep] = useState('')
  const [tipo, setTipo] = useState('MUNICIPAL')
  const [ativo, setAtivo] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileObject, setFileObject] = useState<File | null>(null)
  const [localizacao, setLocalizacao] = useState('URBANA')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [diretores, setDiretores] = useState<any[]>([])
  const [diretorId, setDiretorId] = useState('')
  const sessionTimestamp = useRef(Date.now()).current

  useEffect(() => {
    if (!open) return
    let active = true
    const fetchDiretores = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo, acessos_usuarios(nivel, ativo)')
        .is('deleted_at', null)
        .order('nome', { ascending: true })
      if (active && data) {
        const diretoresFiltrados = data.filter((f: any) => {
          const temAcessoNivel2 = Array.isArray(f.acessos_usuarios) && f.acessos_usuarios.some((a: any) => a.nivel === 2 && a.ativo !== false)
          const temCargoDiretor = f.cargo ? f.cargo.toUpperCase().includes('DIRETOR') : false
          const isAtual = escolaToEdit?.diretor_id === f.id
          return temAcessoNivel2 || temCargoDiretor || isAtual
        })
        setDiretores(diretoresFiltrados)
      }
    }
    fetchDiretores()
    return () => {
      active = false
    }
  }, [open, escolaToEdit?.diretor_id])

  useEffect(() => {
    if (escolaToEdit) {
      setNome(escolaToEdit.nome || '')
      setInep(escolaToEdit.inep || '')
      setTipo(escolaToEdit.tipo || 'MUNICIPAL')
      setAtivo(escolaToEdit.ativo !== false)
      setLogoUrl(escolaToEdit.logo_url || '')
      setFileObject(null)
      setLocalizacao(escolaToEdit.localizacao || 'URBANA')
      setLatitude(escolaToEdit.latitude !== undefined && escolaToEdit.latitude !== null ? String(escolaToEdit.latitude) : '')
      setLongitude(escolaToEdit.longitude !== undefined && escolaToEdit.longitude !== null ? String(escolaToEdit.longitude) : '')
      setDiretorId(escolaToEdit.diretor_id || '')
    } else {
      setNome('')
      setInep('')
      setTipo('MUNICIPAL')
      setAtivo(true)
      setLogoUrl('')
      setFileObject(null)
      setLocalizacao('URBANA')
      setLatitude('')
      setLongitude('')
      setDiretorId('')
    }
  }, [escolaToEdit, open])

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      setLogoUrl('')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `escola_${Date.now()}.${fileExt}`
    const toastId = toast.loading('Enviando logo da escola...')

    try {
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { cacheControl: '31536000' })

      toast.dismiss(toastId)

      if (error) {
        toast.error(`Erro no upload: ${error.message}`)
        return
      }

      const { data: publicData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setLogoUrl(publicData.publicUrl)
      toast.success('Logo enviada com sucesso!')
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(`Erro no upload: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Preencha o Nome da Escola.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const latNum = latitude.trim() ? parseFloat(latitude.replace(',', '.')) : null
    const lngNum = longitude.trim() ? parseFloat(longitude.replace(',', '.')) : null

    try {
      if (escolaToEdit?.id) {
        const { error } = await supabase
          .from('escolas')
          .update({
            nome: nome.trim(),
            inep: inep.trim() || null,
            tipo,
            ativo,
            logo_url: logoUrl || null,
            localizacao,
            latitude: isNaN(latNum as any) ? null : latNum,
            longitude: isNaN(lngNum as any) ? null : lngNum,
            diretor_id: diretorId || null
          } as any)
          .eq('id', escolaToEdit.id)

        if (error) throw error
        toast.success('Escola atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('escolas')
          .insert({
            nome: nome.trim(),
            inep: inep.trim() || null,
            tipo,
            ativo,
            logo_url: logoUrl || null,
            localizacao,
            latitude: isNaN(latNum as any) ? null : latNum,
            longitude: isNaN(lngNum as any) ? null : lngNum,
            diretor_id: diretorId || null
          } as any)

        if (error) throw error
        toast.success('Escola cadastrada com sucesso!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar escola: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={escolaToEdit ? 'Editar Unidade Escolar' : 'Cadastrar Nova Unidade Escolar'}
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full pt-4 border-t border-[#27272a]">
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
            form="form-escola"
            disabled={loading || uploading}
            className="bg-purple-600 text-white hover:bg-purple-700 font-semibold gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : escolaToEdit ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      }
    >
      <form id="form-escola" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Label className="text-xs text-[#aaa]">Nome Completo da Escola *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Escola Municipal Eraldo Tinoco"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-[#aaa]">Código do SIG</Label>
              <Input
                value={escolaToEdit?.codigo !== undefined && escolaToEdit?.codigo !== null ? String(escolaToEdit.codigo).padStart(2, '0') : 'Auto'}
                className="bg-[#1e1e20] border-[#27272a] text-[#888] mt-1 font-mono text-center font-bold cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#aaa]">Diretor Responsável (Assinatura Oficial)</Label>
            <select
              value={diretorId}
              onChange={(e) => setDiretorId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1 focus:border-purple-500"
            >
              <option value="">-- Nenhum Diretor Selecionado --</option>
              {diretores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} {d.cargo ? `(${d.cargo})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#aaa]">Código INEP</Label>
              <Input
                value={inep}
                onChange={(e) => setInep(e.target.value)}
                placeholder="Ex: 29182001"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[#aaa]">Tipo de Unidade</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
              >
                <option value="MUNICIPAL">MUNICIPAL</option>
                <option value="ESTADUAL">ESTADUAL</option>
                <option value="PRIVADA">PRIVADA</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs text-[#aaa]">Localização da UE</Label>
              <select
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none mt-1"
              >
                <option value="URBANA">URBANA</option>
                <option value="RURAL">RURAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#aaa]">Latitude</Label>
              <Input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Ex: -12.729993"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[#aaa]">Longitude</Label>
              <Input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Ex: -39.185819"
                className="bg-[#18181a] border-[#27272a] text-white mt-1"
              />
            </div>
          </div>

          {/* Campo Logo da Escola */}
          <div className="space-y-2">
            <Label className="text-xs text-[#aaa]">Logo da Escola</Label>
            <FileUpload
              accept="image/*"
              maxSizeMB={5}
              file={fileObject}
              onChange={(file) => {
                setFileObject(file)
                handleLogoUpload(file)
              }}
              label="Escolher Logo da Escola"
              previewUrl={logoUrl ? (logoUrl.startsWith('data:') ? logoUrl : `${logoUrl}?t=${sessionTimestamp}`) : null}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="escolaAtivo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 accent-purple-500 rounded border-gray-600 bg-gray-700 cursor-pointer"
            />
            <label htmlFor="escolaAtivo" className="text-sm text-slate-300 font-medium cursor-pointer">
              Unidade Escolar Ativa na Rede
            </label>
          </div>

        </form>
    </StandardDialog>
  )
}
