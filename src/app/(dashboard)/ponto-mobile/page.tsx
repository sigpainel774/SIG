'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MapPin, Clock, AlertTriangle, CheckCircle2, RefreshCw, LogIn, LogOut, Coffee, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'

interface RegistroPonto {
  id: string
  horario: string
  tipo: 'Entrada' | 'Intervalo' | 'Retorno' | 'Saída'
  latitude: number
  longitude: number
  status: string
}

export default function PontoMobilePage() {
  const { funcionario } = useAuthStore()
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tipoPonto, setTipoPonto] = useState<'Entrada' | 'Intervalo' | 'Retorno' | 'Saída'>('Entrada')
  const [registros, setRegistros] = useState<RegistroPonto[]>([])
  const [loadingRegistros, setLoadingRegistros] = useState(true)

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Carregar registros reais do usuário do Supabase
  const loadRegistros = async () => {
    if (!funcionario?.id) {
      setLoadingRegistros(false)
      return
    }

    const supabase = createClient()
    setLoadingRegistros(true)

    const { data } = await (supabase.from as any)('pontos_ronda')
      .select('*')
      .eq('funcionario_id', funcionario.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      const parsed: RegistroPonto[] = data.map((item: any) => {
        const loc = item.localizacao || {}
        const dateObj = new Date(item.created_at)
        const horarioStr = `${dateObj.toLocaleTimeString('pt-BR')} - ${dateObj.toLocaleDateString('pt-BR')}`

        return {
          id: item.id,
          horario: loc.horario || horarioStr,
          tipo: loc.tipo || 'Entrada',
          latitude: loc.latitude || 0,
          longitude: loc.longitude || 0,
          status: loc.status || 'Confirmado por GPS'
        }
      })
      setRegistros(parsed)
    }
    setLoadingRegistros(false)
  }

  useEffect(() => {
    loadRegistros()
  }, [funcionario?.id])

  const obterLocalizacao = () => {
    setLoadingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu dispositivo.')
      setLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setLoadingLocation(false)
        toast.success('Sinal GPS atualizado com precisão!')
      },
      (error) => {
        setLocationError('Permissão de GPS negada ou sinal indisponível. Ative a localização nas configurações.')
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    obterLocalizacao()
  }, [])

  const handleBaterPonto = async () => {
    if (!location) {
      toast.error('Localização de GPS obrigatória para bater o ponto.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const agora = new Date()
    const dataHoraStr = `${agora.toLocaleTimeString('pt-BR')} - ${agora.toLocaleDateString('pt-BR')}`

    const localizacaoData = {
      tipo: tipoPonto,
      latitude: location.lat,
      longitude: location.lng,
      horario: dataHoraStr,
      status: 'Confirmado por GPS'
    }

    const { error } = await (supabase.from as any)('pontos_ronda').insert({
      funcionario_id: funcionario?.id ?? null,
      localizacao: localizacaoData
    })

    if (error) {
      toast.error('Erro ao registrar ponto: ' + error.message)
    } else {
      toast.success(`Ponto de ${tipoPonto} registrado com sucesso!`)
      loadRegistros()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-2">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Ponto Mobile GPS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro de frequência em tempo real com validação de geolocalização.
        </p>
      </div>

      <Card className="border-borderCustom bg-[#121212] overflow-hidden shadow-xl">
        <CardHeader className="bg-[#181818] pb-6 border-b border-borderCustom text-center">
          <CardTitle className="text-5xl font-mono text-white tracking-wider">
            {currentTime.toLocaleTimeString('pt-BR')}
          </CardTitle>
          <CardDescription className="text-highlight font-medium mt-2 text-base capitalize">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Seletor de Tipo de Ponto */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Selecione o Tipo de Batida
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Entrada', icon: LogIn, color: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' },
                { label: 'Intervalo', icon: Coffee, color: 'border-amber-500/50 text-amber-400 bg-amber-500/10' },
                { label: 'Retorno', icon: LogIn, color: 'border-blue-500/50 text-blue-400 bg-blue-500/10' },
                { label: 'Saída', icon: LogOut, color: 'border-rose-500/50 text-rose-400 bg-rose-500/10' },
              ].map((item) => {
                const Icon = item.icon
                const isSelected = tipoPonto === item.label
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTipoPonto(item.label as any)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? item.color + ' ring-2 ring-white/20 shadow-md' 
                        : 'bg-[#181818] border-borderCustom text-foregroundCustom/70 hover:bg-hoverCustom'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status GPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <MapPin className="w-4 h-4 text-highlight" />
                Sinal do GPS
              </div>
              <Button
                onClick={obterLocalizacao}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-white gap-1 h-7 px-2 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Atualizar GPS
              </Button>
            </div>
            
            {loadingLocation ? (
              <div className="p-3.5 bg-[#181818] border border-borderCustom rounded-xl text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-highlight" />
                <span>Obtendo coordenadas de geolocalização...</span>
              </div>
            ) : locationError ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-300">{locationError}</p>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-sm text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-mono text-xs">Lat: {location?.lat.toFixed(5)}, Lng: {location?.lng.toFixed(5)}</span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Precisão ±{location?.accuracy ? Math.round(location.accuracy) : 10}m
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={handleBaterPonto}
            disabled={!location || saving}
            className="w-full h-14 text-lg bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 shadow-lg cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Registrando Ponto...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Clock className="w-6 h-6" /> Bater Ponto ({tipoPonto})
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico Recente do Banco */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-highlight" />
          Registros Recentes
        </h2>

        <div className="bg-[#121212] border border-borderCustom rounded-2xl overflow-hidden shadow-md">
          {loadingRegistros ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-highlight" />
              <span>Carregando seus registros...</span>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma batida de ponto registrada até o momento.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderCustom text-xs text-muted-foreground uppercase tracking-wider bg-[#0d0d0d]">
                  <th className="p-3.5 font-semibold">Horário e Data</th>
                  <th className="p-3.5 font-semibold">Tipo</th>
                  <th className="p-3.5 font-semibold">Status GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCustom text-sm">
                {registros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-hoverCustom/50 transition-colors">
                    <td className="p-3.5 font-mono text-white text-xs">{reg.horario}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-highlight/10 text-highlight border border-highlight/20">
                        {reg.tipo}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{reg.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
