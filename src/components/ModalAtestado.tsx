'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FileUpload } from '@/components/ui/file-upload'

interface ModalAtestadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalAtestado({ open, onOpenChange, onSuccess }: ModalAtestadoProps) {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')
  const [cid, setCid] = useState('')
  const [dias, setDias] = useState<number>(1)
  const [dataFim, setDataFim] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [loadingFuncs, setLoadingFuncs] = useState(false)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  useEffect(() => {
    let active = true

    if (open) {
      const fetchFuncionarios = async () => {
        setLoadingFuncs(true)
        try {
          let query = supabase
            .from('funcionarios')
            .select('id, nome, cargo, is_superadmin, is_conta_especial, acessos_usuarios(nivel, ativo)')
            .is('deleted_at', null)
            .order('nome')

          if (escolaAtivaId) {
            // Filtrar apenas funcionários vinculados à escola ativa
            const { data: vincs, error: vincsError } = await supabase
              .from('vinculos_funcionarios')
              .select('funcionario_id')
              .eq('escola_id', escolaAtivaId)
              .eq('ativo', true)

            if (vincsError) throw vincsError

            const ids = (vincs ?? []).map((v: any) => v.funcionario_id as string)
            if (ids.length > 0) {
              query = query.in('id', ids) as typeof query
            } else {
              if (active) {
                setFuncionarios([])
                setLoadingFuncs(false)
              }
              return
            }
          }

          const { data, error } = await query
          if (error) throw error

          if (data && active) {
            const filtrados = data.filter((f: any) => {
              if (f.is_conta_especial) return false
              if (escolaAtivaId) {
                if (f.is_superadmin) return false
                if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
                const acessos = f.acessos_usuarios ?? []
                if (acessos.some((a: any) => a.nivel === 1 && a.ativo)) return false
              }
              return true
            })
            setFuncionarios(filtrados)
          }
        } catch (err: any) {
          toast.error('Erro ao carregar funcionários: ' + err.message)
          console.error(err)
        } finally {
          if (active) setLoadingFuncs(false)
        }
      }
      fetchFuncionarios()
    }

    return () => {
      active = false
    }
  }, [open, supabase, escolaAtivaId])

  const handleSave = async () => {
    if (!funcionarioId || !cid || dias <= 0) {
      toast.error('Preencha todos os campos obrigatórios e garanta que os dias sejam maiores que 0.')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      let anexoUrl = null
      let anexoNome = null

      if (arquivo) {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `atestados/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, arquivo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('anexos')
          .getPublicUrl(filePath)

        anexoUrl = publicUrl
        anexoNome = arquivo.name
      }

      // Calcular data de término se não informada explicitamente
      let calculatedDataFim = dataFim
      if (!calculatedDataFim && dias > 0) {
        const dt = new Date()
        dt.setDate(dt.getDate() + (dias - 1))
        calculatedDataFim = dt.toISOString().split('T')[0]
      }

      const { error } = await (supabase.from as any)('atestados')
        .insert({
          funcionario_id: funcionarioId,
          cid: cid.trim().toUpperCase(),
          dias_afastamento: dias,
          data_fim: calculatedDataFim || null,
          escola_id: escolaAtivaId,
          status: 'Pendente',
          anexo_url: anexoUrl,
          anexo_nome: anexoNome
        })

      if (error) throw error

      // Atualizar status do funcionário para afastado
      await supabase
        .from('funcionarios')
        .update({ status: 'afastado' })
        .eq('id', funcionarioId)
      
      toast.success('Atestado registrado e funcionário atualizado para Afastado com sucesso!')
      onSuccess()
      
      // Reset form
      setFuncionarioId('')
      setCid('')
      setDias(1)
      setDataFim('')
      setArquivo(null)
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao registrar atestado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Atestado"
      description="Cadastre um novo atestado médico com o anexo do comprovante."
      maxWidth="sm:max-w-[425px]"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-mutedmerald-600 hover:bg-mutedmerald-700 text-white font-bold gap-2"
            disabled={loading}
          >
            {loading && <LoadingSpinner size="sm" variant="muted" placement="inline" />}
            {loading ? 'Salvando...' : 'Salvar Atestado'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Servidor</label>
          <Select value={funcionarioId} onValueChange={(val) => val && setFuncionarioId(val)} disabled={loadingFuncs}>
            <SelectTrigger className="w-full bg-background border-border text-foreground font-normal">
              <SelectValue placeholder={loadingFuncs ? "Carregando..." : "Selecione o servidor"}>
                {funcionarioId 
                  ? (() => {
                      const f = funcionarios.find((x) => x.id === funcionarioId);
                      return f ? `${f.nome}${f.cargo ? ` (${f.cargo})` : ''}` : (funcionarios.length === 0 ? 'Carregando...' : funcionarioId);
                    })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome} {f.cargo ? `(${f.cargo})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">CID</label>
          <Input
            placeholder="Ex: J01"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className="bg-background border-border text-foreground uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Dias de Afastamento</label>
            <Input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => {
                const num = parseInt(e.target.value) || 0
                setDias(num)
                if (num > 0) {
                  const dt = new Date()
                  dt.setDate(dt.getDate() + (num - 1))
                  setDataFim(dt.toISOString().split('T')[0])
                }
              }}
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Data Prevista Término</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                const val = e.target.value
                setDataFim(val)
                if (val) {
                  const end = new Date(val + 'T00:00:00')
                  const start = new Date()
                  start.setHours(0,0,0,0)
                  const diffMs = end.getTime() - start.getTime()
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
                  if (diffDays > 0) setDias(diffDays)
                }
              }}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Anexo do Atestado (Opcional)</label>
          <FileUpload
            file={arquivo}
            onChange={setArquivo}
            accept=".pdf,image/*"
            label="Selecione ou arraste o comprovante (PDF/Imagem)"
          />
        </div>
      </div>
    </StandardDialog>
  )
}
