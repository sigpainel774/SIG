'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { Camera, CheckCircle2, Award, Trophy, Sparkles, RefreshCw, AlertTriangle, Check, User, ArrowRight, BookOpen, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { Simulado } from '@/types/simulado'
import { processOMRCanvas, calcularResultadoSimulado, playScanSound } from '@/lib/omr/omrEngine'
import { toast, Toaster } from 'sonner'

interface SimuladoExternoPageProps {
  params: Promise<{ token: string }>
}

export default function SimuladoExternoPage({ params }: SimuladoExternoPageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [simulado, setSimulado] = useState<Simulado | null>(null)
  const [escolaNome, setEscolaNome] = useState('Cursinho Pré-Universitário')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Identificação do aluno
  const [alunosLista, setAlunosLista] = useState<any[]>([])
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string>('')
  const [buscaAluno, setBuscaAluno] = useState('')
  const [etapa, setEtapa] = useState<'selecionar_aluno' | 'scanner' | 'resultado'>('selecionar_aluno')

  // Câmera e Scanner
  const [cameraActive, setCameraActive] = useState(false)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [resultadoFinal, setResultadoFinal] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const processingRef = useRef<boolean>(false)

  const supabase = createClient()

  // 1. Carrega dados do simulado pelo token público
  useEffect(() => {
    const carregarSimulado = async () => {
      setLoading(true)
      try {
        const { data: simData, error: simError } = await (supabase as any)
          .from('simulados')
          .select('*, escola:escolas(nome)')
          .eq('token_publico', token)
          .is('deleted_at', null)
          .single()

        if (simError || !simData) {
          setErrorMsg('Simulado não encontrado ou link expirado.')
          setLoading(false)
          return
        }

        if (!simData.auto_correcao_ativa) {
          setErrorMsg('A auto-correção para este simulado foi encerrada pela coordenação.')
          setLoading(false)
          return
        }

        setSimulado(simData)
        if (simData.escola?.nome) setEscolaNome(simData.escola.nome)

        // Busca alunos das turmas participantes ou da escola
        let alunoQuery = (supabase as any)
          .from('alunos')
          .select('id, nome, numero_matricula, turma_id')
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (simData.turmas_ids && simData.turmas_ids.length > 0) {
          alunoQuery = alunoQuery.in('turma_id', simData.turmas_ids)
        } else {
          alunoQuery = alunoQuery.eq('escola_id', simData.escola_id)
        }

        const { data: alData } = await alunoQuery
        if (alData) setAlunosLista(alData)
      } catch (err: any) {
        console.error('Erro ao carregar simulado externo:', err)
        setErrorMsg('Falha ao conectar com o servidor.')
      } finally {
        setLoading(false)
      }
    }

    carregarSimulado()
  }, [token])

  // Enumera câmeras disponíveis no smartphone
  useEffect(() => {
    if (etapa !== 'scanner') return
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === 'videoinput')
        setVideoDevices(videoInputs)
        if (videoInputs.length > 0 && !selectedDeviceId) {
          const backCam = videoInputs.find((d) => /back|traseira|rear|environment/i.test(d.label))
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId)
        }
      } catch (err) {
        console.error('Erro ao listar câmeras:', err)
      }
    }
    getDevices()
  }, [etapa])

  // Inicia câmera
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
      }
    } catch (err) {
      console.error('Erro de câmera:', err)
      toast.error('Permissão de câmera negada ou dispositivo indisponível.')
      setCameraActive(false)
    }
  }, [selectedDeviceId])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    if (etapa === 'scanner') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [etapa, startCamera, stopCamera])

  // Processamento e Salvamento da Correção
  const processFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !simulado ||
      !cameraActive ||
      processingRef.current ||
      etapa !== 'scanner'
    ) {
      return
    }

    const video = videoRef.current
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const resultadoOMR = processOMRCanvas(canvas, {
      qtdQuestoes: simulado.qtd_questoes,
      alternativasPorQuestao: simulado.alternativas_por_questao
    })

    // Se detectou QR Code ou se o aluno já selecionou o nome manualmente
    const alunoIdDetectado = resultadoOMR.qrData?.alunoId || alunoSelecionadoId
    const folhaValida = resultadoOMR.sucesso && (resultadoOMR.qrData?.simuladoId || alunoSelecionadoId)

    if (folhaValida && alunoIdDetectado) {
      processingRef.current = true
      playScanSound('success')

      const alunoObj = alunosLista.find((a) => a.id === alunoIdDetectado)
      const nomeAluno = alunoObj ? alunoObj.nome : 'Estudante'

      const apuracao = calcularResultadoSimulado(
        resultadoOMR.respostas,
        simulado.gabarito_oficial,
        simulado.qtd_questoes
      )

      const dadosParaSalvar = {
        simulado_id: simulado.id,
        aluno_id: alunoIdDetectado,
        turma_id: alunoObj?.turma_id || null,
        nome_identificado: nomeAluno,
        respostas: resultadoOMR.respostas,
        total_acertos: apuracao.totalAcertos,
        total_erros: apuracao.totalErros,
        total_em_branco: apuracao.totalEmBranco,
        total_anuladas: apuracao.totalAnuladas,
        nota_final: apuracao.notaFinal,
        percentual_acerto: apuracao.percentualAcerto,
        canal_correcao: 'celular_aluno',
        data_correcao: new Date().toISOString()
      }

      setSalvando(true)
      try {
        const { error } = await (supabase as any)
          .from('simulados_respostas')
          .upsert(dadosParaSalvar, { onConflict: 'simulado_id, aluno_id' })

        if (error) throw error

        setResultadoFinal({
          nome: nomeAluno,
          ...apuracao
        })
        stopCamera()
        setEtapa('resultado')
        toast.success('Simulado corrigido e nota salva com sucesso!')
      } catch (err: any) {
        console.error('Erro ao gravar nota:', err)
        toast.error('Erro ao salvar nota no sistema: ' + (err.message || ''))
        processingRef.current = false
      } finally {
        setSalvando(false)
      }
    }
  }, [simulado, cameraActive, etapa, alunoSelecionadoId, alunosLista, stopCamera])

  // Loop a cada 350ms
  useEffect(() => {
    if (etapa === 'scanner' && cameraActive) {
      scanIntervalRef.current = setInterval(processFrame, 350)
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [etapa, cameraActive, processFrame])

  // Filtro de alunos na busca
  const alunosFiltrados = alunosLista.filter((a) =>
    a.nome.toLowerCase().includes(buscaAluno.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0e] text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Carregando Simulado...</h2>
      </div>
    )
  }

  if (errorMsg || !simulado) {
    return (
      <div className="min-h-screen bg-[#0d0d0e] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl max-w-md space-y-3">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-extrabold text-foreground">Acesso Indisponível</h2>
          <p className="text-xs text-muted-foreground">{errorMsg || 'Simulado não encontrado.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-zinc-100 flex flex-col justify-between">
      <Toaster position="top-center" richColors />

      {/* Header Institucional Mobile */}
      <header className="p-4 bg-[#141416] border-b border-[#26262a] flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <img
            src="/img/logo-prefeitura.png"
            alt="Prefeitura"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLElement).style.display = 'none'
            }}
          />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
              {escolaNome}
            </span>
            <h1 className="text-sm font-black text-foreground truncate max-w-[220px]">
              {simulado.titulo}
            </h1>
          </div>
        </div>

        <span className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Auto-Correção
        </span>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-4 max-w-lg mx-auto w-full flex-1 flex flex-col justify-center">
        {/* ETAPA 1: Identificação do Aluno */}
        {etapa === 'selecionar_aluno' && (
          <div className="bg-[#141416] border border-[#26262a] rounded-3xl p-5 space-y-5 shadow-xl animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-foreground">Identifique-se para Corrigir</h2>
              <p className="text-xs text-muted-foreground">
                Selecione seu nome na lista da turma ou aponte a câmera se sua folha possuir QR Code nominal.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                placeholder="Digite seu nome para buscar..."
                className="w-full bg-[#1a1a1e] border border-[#26262a] rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
              />

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {alunosFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum estudante encontrado.</p>
                ) : (
                  alunosFiltrados.map((aluno) => {
                    const isSelected = alunoSelecionadoId === aluno.id
                    return (
                      <button
                        key={aluno.id}
                        type="button"
                        onClick={() => setAlunoSelecionadoId(aluno.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                            : 'bg-background border-[#26262a] text-foreground hover:bg-[#1f1f24]'
                        }`}
                      >
                        <span className="truncate max-w-[220px]">{aluno.nome}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Matrícula: {aluno.numero_matricula || '---'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <Button
              onClick={() => setEtapa('scanner')}
              disabled={!alunoSelecionadoId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 text-sm rounded-xl gap-2 shadow-lg shadow-emerald-900/30"
            >
              Abrir Câmera e Escanear Folha <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ETAPA 2: Scanner de Câmera em Tempo Real */}
        {etapa === 'scanner' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border border-[#26262a] shadow-2xl flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Guia de enquadramento OMR */}
              <div className="absolute inset-5 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                </div>

                <div className="text-center text-[11px] font-extrabold text-white bg-black/70 py-1.5 px-4 rounded-full backdrop-blur-md self-center">
                  Alinhe os 4 cantos pretos da folha
                </div>

                <div className="flex justify-between">
                  <div className="w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                  <div className="w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                </div>
              </div>

              {salvando && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 space-y-3 z-30">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Calculando acertos e gravando nota...</p>
                </div>
              )}
            </div>

            {/* Controles de Câmera */}
            <div className="flex items-center justify-between gap-2 p-2 bg-[#141416] border border-[#26262a] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setEtapa('selecionar_aluno')}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ← Voltar
              </button>

              <Button
                size="sm"
                onClick={processFrame}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs"
              >
                <Camera className="w-3.5 h-3.5" /> Forçar Leitura
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Tela de Resultado & Comemoração */}
        {etapa === 'resultado' && resultadoFinal && (
          <div className="bg-[#141416] border border-emerald-500/40 rounded-3xl p-5 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                  Correção Concluída!
                </span>
                <h2 className="text-xl font-black text-foreground">{resultadoFinal.nome}</h2>
              </div>
            </div>

            {/* Placar de Nota */}
            <div className="p-4 bg-background border border-[#26262a] rounded-2xl flex items-center justify-around text-center">
              <div>
                <span className="text-[11px] text-muted-foreground block">Nota Final</span>
                <span className="text-3xl font-black text-emerald-400">
                  {resultadoFinal.notaFinal.toFixed(1)}
                </span>
              </div>
              <div className="h-10 w-px bg-[#26262a]" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Acertos</span>
                <span className="text-xl font-bold text-foreground">
                  {resultadoFinal.totalAcertos} / {simulado.qtd_questoes}
                </span>
              </div>
              <div className="h-10 w-px bg-[#26262a]" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Aproveitamento</span>
                <span className="text-xl font-bold text-blue-400">
                  {resultadoFinal.percentualAcerto}%
                </span>
              </div>
            </div>

            {/* Espelho de Respostas */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase">
                Gabarito Detalhado:
              </h4>
              <div className="max-h-48 overflow-y-auto grid grid-cols-4 gap-1.5 font-mono text-xs">
                {resultadoFinal.detalhes.map((d: any) => (
                  <div
                    key={d.questao}
                    className={`p-2 rounded-xl border text-center ${
                      d.acertou
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : d.respostaAluno === 'BRANCO'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground block">Q{d.questao}</span>
                    <span className="font-black text-sm">{d.respostaAluno}</span>
                    {!d.acertou && <span className="text-[9px] text-muted-foreground block">({d.respostaCorreta})</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Sua nota foi gravada no ranking oficial do Cursinho Pré-Universitário!</span>
            </div>

            <Button
              onClick={() => {
                setEtapa('selecionar_aluno')
                setAlunoSelecionadoId('')
                setResultadoFinal(null)
              }}
              variant="outline"
              className="w-full border-[#26262a] text-xs font-bold"
            >
              Corrigir Outra Folha
            </Button>
          </div>
        )}
      </main>

      {/* Rodapé Mobile */}
      <footer className="p-3 text-center text-[10px] text-muted-foreground border-t border-[#26262a] bg-[#141416]">
        Sistema Integrado de Gestão Escolar (SIG) • Cursinho Pré-Universitário
      </footer>
    </div>
  )
}
