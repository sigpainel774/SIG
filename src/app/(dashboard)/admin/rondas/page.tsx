'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { ScanLine, Plus, Edit, RefreshCw, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function AdminRondasPage() {
  const supabase = createClient()
  const [rotas, setRotas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'rotas' | 'registros'>('rotas')
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadRotas = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rotas_ronda')
        .select('*, escolas(nome), funcionarios(nome)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (isMounted.current && data) setRotas(data)
    } catch (err: any) {
      console.error('Erro ao carregar rotas de ronda:', err)
      if (isMounted.current) toast.error('Erro ao carregar rotas de ronda.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [supabase])

  const [registros, setRegistros] = useState<any[]>([])
  const [loadingRegistros, setLoadingRegistros] = useState(false)

  const loadRegistros = useCallback(async () => {
    setLoadingRegistros(true)
    try {
      const { data, error } = await supabase
        .from('registros_ronda')
        .select('*, rotas_ronda(nome), funcionarios(nome)')
        .order('registrado_em', { ascending: false })
        .limit(100)

      if (error) throw error
      if (isMounted.current && data) setRegistros(data)
    } catch (err: any) {
      console.error('Erro ao carregar registros de ronda:', err)
      if (isMounted.current) toast.error('Erro ao carregar registros de ronda.')
    } finally {
      if (isMounted.current) setLoadingRegistros(false)
    }
  }, [supabase])

  useEffect(() => {
    if (activeTab === 'rotas') {
      loadRotas()
    } else if (activeTab === 'registros') {
      loadRegistros()
    }
  }, [activeTab, loadRotas, loadRegistros])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-cyan-500" /> Controle de Rondas
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Definição de escalas e mapeamento de perímetro.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-lg border border-borderCustom flex">
            <button 
              onClick={() => setActiveTab('rotas')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${activeTab === 'rotas' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Rotas
            </button>
            <button 
              onClick={() => setActiveTab('registros')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${activeTab === 'registros' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Registros
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'rotas' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" /> Nova Rota
            </Button>
          </div>
          <div className="rounded-xl border border-borderCustom bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-surface-2 border-b border-borderCustom">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Nome da Rota</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Local/Vigia</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Turno</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotas.map((rota) => (
                  <TableRow key={rota.id} className="border-b border-borderCustom hover:bg-hoverCustom">
                    <TableCell className="font-medium text-foreground">{rota.nome}</TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{rota.escolas?.nome ?? 'Escola não vinculada'}</div>
                      <div className="text-xs text-muted-foreground">{rota.funcionarios?.nome ?? 'Sem vigia padrão'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                        {rota.turno}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${rota.ativo !== false ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500 border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-500 border-rose-300 dark:border-rose-500/30'}`}>
                        {rota.ativo !== false ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rotas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma rota cadastrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-borderCustom bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-surface-2 border-b border-borderCustom">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Data/Hora</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Rota de Ronda</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Ponto / Local</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Vigia / Servidor</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Coordenadas</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((reg) => (
                  <TableRow key={reg.id} className="border-b border-borderCustom hover:bg-hoverCustom">
                    <TableCell className="text-sm font-mono text-foreground">
                      {reg.registrado_em ? new Date(reg.registrado_em).toLocaleString('pt-BR') : 'Data não informada'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {reg.rotas_ronda?.nome ?? 'Rota Avulsa'}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {reg.ponto_nome ?? 'Ponto de Controle'}
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {reg.funcionarios?.nome ?? 'Servidor de Campo'}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-cyan-400">
                      {reg.latitude && reg.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${reg.latitude},${reg.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {Number(reg.latitude).toFixed(4)}, {Number(reg.longitude).toFixed(4)}
                        </a>
                      ) : (
                        'Sem GPS'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {reg.observacao ?? 'Nenhuma'}
                    </TableCell>
                  </TableRow>
                ))}
                {registros.length === 0 && !loadingRegistros && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      Nenhum registro de check-in de ronda gravado até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
