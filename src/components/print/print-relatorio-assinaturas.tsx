'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

// Constant timestamp for anti-flickering cache busting on signature URLs
const sessionTimestamp = Date.now()

interface AuditLog {
  id: string
  user_name: string | null
  user_email: string | null
  user_cargo: string | null
  action: string
  entity: string
  entity_id: string | null
  ip_address: string | null
  created_at: string | null
  old_data?: Record<string, any> | null
  new_data?: Record<string, any> | null
}

interface PrintRelatorioAssinaturasProps {
  logs: AuditLog[]
  onClose: () => void
}

export function PrintRelatorioAssinaturas({ logs, onClose }: PrintRelatorioAssinaturasProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // Função simples para extrair nome do navegador/SO de forma legível
  const formatUserAgent = (ua: string | null | undefined) => {
    if (!ua) return 'Dispositivo desconhecido'
    const lower = ua.toLowerCase()
    
    let device = 'Desktop'
    if (lower.includes('android')) device = 'Celular (Android)'
    else if (lower.includes('iphone') || lower.includes('ipad')) device = 'Celular (iOS)'
    
    let browser = 'Browser'
    if (lower.includes('firefox')) browser = 'Firefox'
    else if (lower.includes('chrome')) browser = 'Chrome'
    else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
    else if (lower.includes('edge')) browser = 'Edge'
    
    return `${device} — ${browser}`
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Botões de Ação na Tela (escondidos na impressão) */}
      <div className="absolute top-4 right-4 flex gap-3 print:hidden no-print">
        <Button 
          onClick={handlePrint} 
          className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório
        </Button>
        <Button 
          onClick={onClose} 
          variant="ghost" 
          className="bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-white font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* Folha de Relatório A4 */}
      <div className="w-[210mm] min-h-[297mm] bg-white text-black p-10 font-sans shadow-2xl rounded-lg print:shadow-none print:rounded-none print:p-0 print:w-full print:min-h-0">
        
        {/* Cabeçalho do Relatório */}
        <PrintHeader
          centerContent={
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Secretaria Municipal de Educação</h1>
              <h2 className="text-base font-black text-gray-900 uppercase mt-0.5">Relatório de Auditoria de Assinaturas Digitais</h2>
              <p className="text-xs text-gray-500 mt-1">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>
          }
        />

        <div className="flex justify-between items-center mb-4">
          <BadgeReport text="Auditoria Global" />
          <p className="text-xs text-gray-500 font-medium">Registros: {logs.length}</p>
        </div>

        {/* Tabela de logs */}
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="border-b-2 border-black bg-gray-100 font-bold uppercase">
              <th className="py-2 px-1">Aluno / ID</th>
              <th className="py-2 px-1">Tipo</th>
              <th className="py-2 px-1">Ação</th>
              <th className="py-2 px-1">Responsável / Assinante</th>
              <th className="py-2 px-1">Dispositivo & IP</th>
              <th className="py-2 px-1">Data / Hora</th>
              <th className="py-2 px-1 text-center">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const studentName = log.new_data?.student_name || log.old_data?.student_name || 'Desconhecido'
              const sigUrl = log.new_data?.url || log.old_data?.url
              const isResp = log.entity === 'alunos_assinatura_responsavel'
              
              const cleanSigUrl = sigUrl ? (sigUrl.startsWith('data:') ? sigUrl : `${sigUrl.split('?')[0]}?t=${sessionTimestamp}`) : null

              return (
                <tr key={log.id} className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="py-2 px-1 font-semibold text-black">
                    <div>{studentName}</div>
                    <div className="text-[8px] text-gray-400 font-normal">{log.entity_id}</div>
                  </td>
                  <td className="py-2 px-1 uppercase font-medium">
                    {isResp ? 'Responsável' : 'Funcionário'}
                  </td>
                  <td className="py-2 px-1">
                    <span className={`font-bold ${log.action === 'DELETE' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-1">
                    <div className="font-semibold">{log.user_name}</div>
                    <div className="text-gray-500">{log.user_email || '-'}</div>
                    <div className="text-[8px] text-gray-400">{log.user_cargo || '-'}</div>
                  </td>
                  <td className="py-2 px-1">
                    <div className="font-medium text-gray-800">{log.ip_address || 'IP desconhecido'}</div>
                    <div className="text-[8px] text-gray-400 leading-tight max-w-[120px] truncate" title={log.new_data?.user_agent}>
                      {formatUserAgent(log.new_data?.user_agent)}
                    </div>
                  </td>
                  <td className="py-2 px-1 whitespace-nowrap text-gray-600">
                    {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="py-1 px-1 text-center align-middle">
                    {cleanSigUrl ? (
                      <div className="inline-block border border-gray-300 rounded bg-zinc-50 p-0.5">
                        <img 
                          src={cleanSigUrl} 
                          alt="Assinatura" 
                          className="max-h-8 max-w-[80px] object-contain filter brightness-90 contrast-125"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-[9px]">Sem assinatura</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400 italic text-xs">
                  Nenhum registro de assinatura no relatório.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Rodapé de autenticidade */}
        <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-[9px] text-gray-500 print:mt-24">
          <div>
            <p>Documento de controle interno para fins de auditoria de assinaturas eletrônicas.</p>
            <p>SIG — Sistema Integrado de Gestão Escolar.</p>
          </div>
          <div className="text-right">
            <p>Assinatura Digital Auditada</p>
            <div className="w-32 h-px bg-gray-400 mt-6 ml-auto" />
            <p className="mt-1 uppercase font-semibold text-black">Administração do Sistema</p>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

function BadgeReport({ text }: { text: string }) {
  return (
    <span className="inline-block bg-zinc-100 text-zinc-800 border border-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
      {text}
    </span>
  )
}
