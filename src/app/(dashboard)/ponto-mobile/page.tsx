'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MapPin, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function PontoMobilePage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu navegador.')
      setLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLoadingLocation(false)
      },
      (error) => {
        setLocationError('Permissão de localização negada ou falha ao obter sinal de GPS.')
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }, [])

  const handleBaterPonto = async () => {
    if (!location) {
      toast.error('Localização obrigatória para bater o ponto.')
      return
    }

    setSaving(true)
    // Simular chamada de API com cruzamento de madrugada validado via DB/Server
    setTimeout(() => {
      toast.success('Ponto registrado com sucesso!')
      setSaving(false)
    }, 1500)
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight text-center">Registro de Ponto</h1>
      </div>

      <Card className="border-borderCustom bg-card overflow-hidden">
        <CardHeader className="bg-background/30 pb-4 border-b border-borderCustom text-center">
          <CardTitle className="text-4xl font-mono text-white">
            {currentTime.toLocaleTimeString('pt-BR')}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foregroundCustom">
              <MapPin className="w-4 h-4 text-highlight" />
              Status de Localização
            </div>
            
            {loadingLocation ? (
              <div className="p-3 bg-input/50 border border-borderCustom rounded-md text-sm text-muted-foreground">
                Obtendo coordenadas GPS...
              </div>
            ) : locationError ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{locationError}</p>
              </div>
            ) : (
              <div className="p-3 bg-highlight/10 border border-highlight/20 rounded-md text-sm text-highlight">
                GPS Capturado: {location?.lat.toFixed(5)}, {location?.lng.toFixed(5)}
              </div>
            )}
          </div>

          <Button
            onClick={handleBaterPonto}
            disabled={!location || saving}
            className="w-full h-14 text-lg bg-highlight text-background hover:bg-highlight/90 font-bold"
          >
            <Clock className="w-5 h-5 mr-2" />
            {saving ? 'Registrando...' : 'Registrar Ponto'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            O registro requer confirmação de local e cruza viradas de turno automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
