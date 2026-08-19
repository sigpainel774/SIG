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
  secretaria_id?: string | null
}

interface ModalEscolaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaToEdit?: EscolaToEdit | null
  secretariaIdPreSelected?: string
  onSuccess?: () => void
}

export function ModalEscola({
  open,
  onOpenChange,
  escolaToEdit,
  secretariaIdPreSelected,
  onSuccess
}: ModalEscolaProps) {
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

  const [secretarias, setSecretarias] = useState<{ id: string; nome: string }[]>([])
  const [secretariaId, setSecretariaId] = useState('')

  const sessionTimestamp = useRef(Date.now()).current

  // 1. Carregar Secretarias e Funcionários/Diretores
  useEffect(() => {
    if (!open) return
    let active = true

    const fetchData = async () => {
      const supabase = createClient()
      
      // Busca secretarias ativas
      const { data: secData } = await supabase
        .from('secretarias')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (active && secData) {
        setSecretarias(secData)
      }

      // Busca funcionários
      const { data: funcData } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo, acessos_usuarios(nivel, ativo)')
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (active && funcData) {
        setDiretores(funcData)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [open])

  // 2. Preencher formulário
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
      setSecretariaId(escolaToEdit.secretaria_id || secretariaIdPreSelected || '')
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
      setSecretariaId(secretariaIdPreSelected || '')
    }
  }, [escolaToEdit, open, secretariaIdPreSelected])

  // Se não foi informada secretaria, descobre a secretaria padrão (Educação)
  useEffect(() => {
    if (!secretariaId && secretarias.length > 0) {
      const eduSec = secretarias.find(s => /educa/i.test(s.nome)) || secretarias[0]
      if (eduSec) setSecretariaId(eduSec.id)
    }
  }, [secretarias, secretariaId])

  const selectedSecretariaObj = secretarias.find(s => s.id === secretariaId)
  const selectedSecName = selectedSecretariaObj?.nome || ''
  // Se for secretaria de Educação, usa termos de Escola; se for outra secretaria, usa termos de Unidade Administrativa
  const isEducacao = selectedSecName ? /educa/i.test(selectedSecName) : true

  // Filtragem inteligente de gestores/diretores dependendo da secretaria
  const diretoresFiltrados = diretores.filter((f: any) => {
    if (!isEducacao) return true // Para outras secretarias, permite qualquer responsável
    const temAcessoNivel2 = Array.isArray(f.acessos_usuarios) && f.acessos_usuarios.some((a: any) => a.nivel === 2 && a.ativo !== false)
    const temCargoDiretor = f.cargo ? f.cargo.toUpperCase().includes('DIRETOR') : false
    const isAtual = escolaToEdit?.diretor_id === f.id
    return temAcessoNivel2 || temCargoDiretor || isAtual
  })

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      setLogoUrl('')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `escola_${Date.now()}.${fileExt}`
    const toastId = toast.loading('Enviando logo da unidade...')

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
      toast.error(isEducacao ? 'Preencha o Nome da Escola.' : 'Preencha o Nome da Unidade.')
      return
    }

    if (escolaToEdit?.diretor_id && diretorId && diretorId !== escolaToEdit.diretor_id && isEducacao) {
      toast.error('Esta escola já possui um diretor ativo. Defina como "-- Nenhum Diretor Selecionado --" e salve para desvincular o gestor atual antes de atribuir uma nova pessoa.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const parsedLat = latitude.trim() ? parseFloat(latitude.replace(',', '.')) : null
    const parsedLng = longitude.trim() ? parseFloat(longitude.replace(',', '.')) : null
    const finalLat = (parsedLat !== null && !isNaN(parsedLat)) ? parsedLat : null
    const finalLng = (parsedLng !== null && !isNaN(parsedLng)) ? parsedLng : null
    const secIdToSave = secretariaId || (secretarias.find(s => /educa/i.test(s.nome))?.id ?? null)

    try {
      if (escolaToEdit?.id) {
        const { error } = await supabase
          .from('escolas')
          .update({
            nome: nome.trim(),
            inep: isEducacao ? (inep.trim() || null) : null,
            tipo,
            ativo,
            logo_url: logoUrl || null,
            localizacao,
            latitude: finalLat,
            longitude: finalLng,
            diretor_id: diretorId || null,
            secretaria_id: secIdToSave
          } as any)
          .eq('id', escolaToEdit.id)

        if (error) throw error
        toast.success(isEducacao ? 'Escola atualizada com sucesso!' : 'Unidade administrativa atualizada!')
      } else {
        const { error } = await supabase
          .from('escolas')
          .insert({
            nome: nome.trim(),
            inep: isEducacao ? (inep.trim() || null) : null,
            tipo,
            ativo,
            logo_url: logoUrl || null,
            localizacao,
            latitude: finalLat,
            longitude: finalLng,
            diretor_id: diretorId || null,
            secretaria_id: secIdToSave
          } as any)

        if (error) throw error
        toast.success(isEducacao ? 'Escola cadastrada com sucesso!' : 'Unidade administrativa cadastrada!')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar unidade: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        escolaToEdit
          ? isEducacao ? 'Editar Unidade Escolar' : 'Editar Unidade Administrativa'
          : isEducacao ? 'Cadastrar Nova Unidade Escolar' : 'Cadastrar Nova Unidade Administrativa'
      }
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-escola"
            disabled={loading || uploading}
            className="bg-[#0090ff] text-white hover:bg-[#0077d4] font-semibold gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : escolaToEdit ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      }
    >
      <form id="form-escola" onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Seleção de Secretaria Mantenedora */}
        <div>
          <Label className="text-xs text-muted-foreground">Secretaria Mantenedora *</Label>
          <select
            value={secretariaId}
            onChange={(e) => setSecretariaId(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm outline-none mt-1 focus:border-[#0090ff]"
          >
            {secretarias.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground">
              {isEducacao ? 'Nome Completo da Escola *' : 'Nome da Unidade Administrativa *'}
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={isEducacao ? 'Ex: Escola Municipal Eraldo Tinoco' : 'Ex: Departamento de Recursos Humanos'}
              className="bg-background border-border text-foreground mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Código SIG</Label>
            <Input
              value={escolaToEdit?.codigo !== undefined && escolaToEdit?.codigo !== null ? String(escolaToEdit.codigo).padStart(2, '0') : 'Auto'}
              className="bg-background border-border text-muted-foreground mt-1 font-mono text-center font-bold cursor-not-allowed"
              disabled
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            {isEducacao ? 'Diretor Responsável (Assinatura Oficial)' : 'Gestor / Responsável pela Unidade'}
          </Label>
          <select
            value={diretorId}
            onChange={(e) => setDiretorId(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm outline-none mt-1 focus:border-[#0090ff]"
          >
            <option value="">-- Nenhum Gestor Selecionado --</option>
            {diretoresFiltrados.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome} {d.cargo ? `(${d.cargo})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {isEducacao && (
            <div>
              <Label className="text-xs text-muted-foreground">Código INEP</Label>
              <Input
                value={inep}
                onChange={(e) => setInep(e.target.value)}
                placeholder="Ex: 29182001"
                className="bg-background border-border text-foreground mt-1"
              />
            </div>
          )}
          <div className={isEducacao ? '' : 'col-span-2'}>
            <Label className="text-xs text-muted-foreground">Tipo de Unidade</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm outline-none mt-1"
            >
              <option value="MUNICIPAL">MUNICIPAL</option>
              <option value="ESTADUAL">ESTADUAL</option>
              <option value="PRIVADA">PRIVADA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Localização da Unidade</Label>
            <select
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm outline-none mt-1"
            >
              <option value="URBANA">URBANA</option>
              <option value="RURAL">RURAL</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Ex: -12.729993"
              className="bg-background border-border text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Ex: -39.185819"
              className="bg-background border-border text-foreground mt-1"
            />
          </div>
        </div>

        {/* Campo Logo da Unidade */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {isEducacao ? 'Logo da Escola' : 'Logo da Unidade'}
          </Label>
          <FileUpload
            accept="image/*"
            maxSizeMB={5}
            file={fileObject}
            onChange={(file) => {
              setFileObject(file)
              handleLogoUpload(file)
            }}
            label={isEducacao ? 'Escolher Logo da Escola' : 'Escolher Logo da Unidade'}
            previewUrl={logoUrl ? (logoUrl.startsWith('data:') ? logoUrl : `${logoUrl}?t=${sessionTimestamp}`) : null}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="escolaAtivo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="w-4 h-4 accent-[#0090ff] rounded border-gray-600 bg-gray-700 cursor-pointer"
          />
          <label htmlFor="escolaAtivo" className="text-sm text-slate-300 font-medium cursor-pointer">
            Unidade Ativa na Rede Municipal
          </label>
        </div>
      </form>
    </StandardDialog>
  )
}
