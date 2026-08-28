'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, RefreshCw, Award, Check, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Simulado, SimuladoResposta } from '@/types/simulado'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { processOMRCanvas, calcularResultadoSimulado, playScanSound } from '@/lib/omr/omrEngine'

interface ModalScannerCameraProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  simulado: Simulado | null
  onCorrecaoSalva?: () => void
}

export function ModalScannerCamera({
  open,
  onOpenChange,
  simulado,
  onCorrecaoSalva
}: ModalScannerCameraProps) {
  const [cameraActive, setCameraActive] = useState(false)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [alunosLista, setAlunosLista] = useState<any[]>([])
  const [alunoManualId, setAlunoManualId] = useState<string>('')
  const [autoSave, setAutoSave] = useState<boolean>(true)

  // Resultado da leitura em tempo real
  const [resultadoAtual, setResultadoAtual] = useState<{
    alunoId?: string
    alunoNome: string
    respostas: Record<string, string | null>
    totalAcertos: number
    totalErros: number
    totalEmBranco: number
    totalAnuladas: number
    notaFinal: number
    percentualAcerto: number
    detalhes: any[]
  } | null>(null)

  const [saving, setSaving] = useState(false)
  const [historicoSessao, setHistoricoSessao] = useState<Array<{ nome: string; nota: number; acertos: number }>>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScannedQrRef = useRef<string>('')
  const lastScanTimeRef = useRef<number>(0)

  const supabase = createClient()

  // Carrega lista de alunos do simulado / escola
  useEffect(() => {
    if (!open || !simulado) return

    const carregarAlunos = async () => {
      let query = (supabase as any)
        .from('alunos')
        .select('id, nome, numero_matricula, turma_id')
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (simulado.turmas_ids && simulado.turmas_ids.length > 0) {
        query = query.in('turma_id', simulado.turmas_ids)
      } else {
        query = query.eq('escola_id', simulado.escola_id)
      }

      const { data } = await query
      if (data) setAlunosLista(data)
    }

    carregarAlunos()
  }, [open, simulado])

  // Enumera câmeras disponíveis
  useEffect(() => {
    if (!open) return
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === 'videoinput')
        setVideoDevices(videoInputs)
        if (videoInputs.length > 0 && !selectedDeviceId) {
          // Prefere câmera traseira (environment)
          const backCam = videoInputs.find((d) => /back|traseira|rear|environment/i.test(d.label))
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId)
        }
      } catch (err) {
        console.error('Erro ao listar câmeras:', err)
      }
    }
    getDevices()
  }, [open])

  // Inicia a câmera
  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        setScanning(true)
      }
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err)
      toast.error('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
      setCameraActive(false)
    }
  }, [selectedDeviceId])

  // Para a câmera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setScanning(false)
  }, [])

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
      setResultadoAtual(null)
    }
    return () => stopCamera()
  }, [open, startCamera, stopCamera])

  // Função para salvar a correção no Supabase
  const salvarCorrecao = async (dados: {
    alunoId?: string | null
    alunoNome: string
    respostas: Record<string, string | null>
    totalAcertos: number
    totalErros: number
    totalEmBranco: number
    totalAnuladas: number
    notaFinal: number
    percentualAcerto: number
  }) => {
    if (!simulado) return
    setSaving(true)

    try {
      // Encontra turma do aluno se houver
      const alunoObj = alunosLista.find((a) => a.id === dados.alunoId)
      const turmaId = alunoObj?.turma_id || null

      const payload = {
        simulado_id: simulado.id,
        aluno_id: dados.alunoId || null,
        turma_id: turmaId,
        nome_identificado: dados.alunoNome || 'Aluno Não Identificado',
        respostas: dados.respostas,
        total_acertos: dados.totalAcertos,
        total_erros: dados.totalErros,
        total_em_branco: dados.totalEmBranco,
        total_anuladas: dados.totalAnuladas,
        nota_final: dados.notaFinal,
        percentual_acerto: dados.percentualAcerto,
        canal_correcao: 'camera_painel',
        data_correcao: new Date().toISOString()
      }

      if (dados.alunoId) {
        const { error } = await (supabase as any)
          .from('simulados_respostas')
          .upsert(payload, { onConflict: 'simulado_id, aluno_id' })

        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('simulados_respostas')
          .insert(payload)

        if (error) throw error
      }

      toast.success(`Correção gravada: ${dados.alunoNome} (Nota ${dados.notaFinal.toFixed(1)})`)
      setHistoricoSessao((prev) => [
        { nome: dados.alunoNome, nota: dados.notaFinal, acertos: dados.totalAcertos },
        ...prev
      ])

      onCorrecaoSalva?.()
    } catch (err: any) {
      console.error('Erro ao salvar correção:', err)
      toast.error('Erro ao salvar nota do aluno no banco de dados')
    } finally {
      setSaving(false)
    }
  }

  // Loop de escaneamento de quadros
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !simulado || !cameraActive) return

    const video = videoRef.current
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Executa motor OMR
    const resultadoOMR = processOMRCanvas(canvas, {
      qtdQuestoes: simulado.qtd_questoes,
      alternativasPorQuestao: simulado.alternativas_por_questao
    })

    if (resultadoOMR.sucesso && resultadoOMR.qrData?.simuladoId) {
      const now = Date.now()
      const qrIdent = `${resultadoOMR.qrData.simuladoId}_${resultadoOMR.qrData.alunoId || resultadoOMR.qrData.alunoNome || 'avulso'}`

      // Evita disparos repetidos na mesma folha em menos de 3 segundos
      if (lastScannedQrRef.current === qrIdent && now - lastScanTimeRef.current < 3000) {
        return
      }

      lastScannedQrRef.current = qrIdent
      lastScanTimeRef.current = now

      // Encontra nome do aluno pelo QR Code
      let alunoNome = resultadoOMR.qrData.alunoNome || 'Aluno Avulso'
      let alunoId = resultadoOMR.qrData.alunoId

      if (alunoId) {
        const aluno = alunosLista.find((a) => a.id === alunoId)
        if (aluno) alunoNome = aluno.nome
      } else if (alunoManualId) {
        const aluno = alunosLista.find((a) => a.id === alunoManualId)
        if (aluno) {
          alunoNome = aluno.nome
          alunoId = aluno.id
        }
      }

      const apuracao = calcularResultadoSimulado(
        resultadoOMR.respostas,
        simulado.gabarito_oficial,
        simulado.qtd_questoes
      )

      playScanSound('success')

      const dadosCompletos = {
        alunoId,
        alunoNome,
        respostas: resultadoOMR.respostas,
        ...apuracao
      }

      setResultadoAtual(dadosCompletos)

      if (autoSave && (alunoId || (resultadoOMR.qrData.alunoNome && resultadoOMR.qrData.alunoNome !== 'Aluno Avulso'))) {
        salvarCorrecao(dadosCompletos)
      }
    }
  }, [simulado, cameraActive, alunosLista, alunoManualId, autoSave])

  // Dispara o loop de processamento a cada 350ms
  useEffect(() => {
    if (scanning && cameraActive) {
      scanIntervalRef.current = setInterval(processFrame, 350)
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [scanning, cameraActive, processFrame])

  // Captura manual / Forçar leitura
  const handleCapturaManual = () => {
    processFrame()
  }

  if (!simulado) return null

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Correção por Câmera OMR • ${simulado.titulo}`}
      description="Aponte a câmera para a folha de respostas. O sistema detecta os marcadores, o QR Code e calcula a nota na hora."
      maxWidth="sm:max-w-5xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Painel da Câmera (Lado Esquerdo) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-inner flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Guia de Enquadramento OMR na tela */}
            <div className="absolute inset-4 border-2 border-dashed border-emerald-500/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400"></div>
                <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400"></div>
              </div>
              <div className="text-center text-xs font-bold text-white bg-black/60 py-1 px-3 rounded-full backdrop-blur-sm self-center">
                Enquadre os 4 cantos pretos da folha aqui
              </div>
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400"></div>
                <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400"></div>
              </div>
            </div>

            {!cameraActive && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center space-y-3">
                <Camera className="w-12 h-12 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
                <Button onClick={startCamera} size="sm" variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </Button>
              </div>
            )}
          </div>

          {/* Controles de Câmera */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-card border border-border rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Câmera:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-foreground"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Câmera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded border-border text-emerald-500 focus:ring-0"
                />
                Salvar automático
              </label>

              <Button size="sm" onClick={handleCapturaManual} variant="secondary" className="gap-1.5 font-bold">
                <Camera className="w-3.5 h-3.5" /> Forçar Leitura
              </Button>
            </div>
          </div>
        </div>

        {/* Painel de Resultados da Leitura (Lado Direito) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {resultadoAtual ? (
            <div className="bg-card border border-emerald-500/40 rounded-2xl p-4 space-y-4 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm uppercase truncate max-w-[200px]">
                      {resultadoAtual.alunoNome}
                    </h4>
                    <span className="text-xs text-muted-foreground">Folha escaneada com sucesso</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {resultadoAtual.notaFinal.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">de 10.0</span>
                </div>
              </div>

              {/* Estatísticas de Acertos */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Acertos</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{resultadoAtual.totalAcertos}</span>
                </div>
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Erros</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">{resultadoAtual.totalErros}</span>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Em Branco</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">{resultadoAtual.totalEmBranco}</span>
                </div>
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Aproveit.</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">{resultadoAtual.percentualAcerto}%</span>
                </div>
              </div>

              {/* Mini matriz de respostas conferidas */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                  Conferência de Questões:
                </span>
                <div className="max-h-32 overflow-y-auto grid grid-cols-5 gap-1.5 p-2 bg-muted/40 border border-border rounded-xl text-[10px] font-mono">
                  {resultadoAtual.detalhes.map((d) => (
                    <div
                      key={d.questao}
                      className={`p-1 rounded text-center border ${
                        d.acertou
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                          : d.respostaAluno === 'BRANCO'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      <span>Q{d.questao}: </span>
                      <strong>{d.respostaAluno || '-'}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ação manual caso não tenha salvado automático */}
              {!autoSave && (
                <Button
                  onClick={() => salvarCorrecao(resultadoAtual)}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <Check className="w-4 h-4" /> Confirmar e Gravar Nota
                </Button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-3 flex flex-col items-center justify-center">
              <Camera className="w-10 h-10 text-muted-foreground opacity-40 animate-pulse" />
              <h4 className="font-bold text-sm text-foreground">Aguardando Leitura</h4>
              <p className="text-xs text-muted-foreground max-w-xs">
                Posicione o cartão-resposta centralizado na câmera. O QR Code e a grade de bolhas serão processados automaticamente.
              </p>
            </div>
          )}

          {/* Histórico da Sessão Atual */}
          <div className="bg-card border border-border rounded-2xl p-3 space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-1 border-b border-border">
              <span>Alunos Corrigidos nesta Sessão ({historicoSessao.length})</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>

            <div className="flex-1 max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {historicoSessao.length === 0 ? (
                <span className="text-[11px] text-muted-foreground block py-4 text-center">
                  Nenhum cartão escaneado ainda nesta sessão.
                </span>
              ) : (
                historicoSessao.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/40 border border-border rounded-lg text-xs"
                  >
                    <span className="font-bold text-foreground truncate max-w-[170px]">{item.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">{item.acertos} acertos</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{item.nota.toFixed(1)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  )
}
