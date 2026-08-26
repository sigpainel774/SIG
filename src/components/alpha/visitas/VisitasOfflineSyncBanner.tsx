'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import { toast } from 'sonner';

export function VisitasOfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [itensPendentes, setItensPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const checarFila = async () => {
    try {
      const qtd = await visitasOfflineService.contarItensPendentes();
      setItensPendentes(qtd);
    } catch {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checarFila();

      const handleOnline = () => {
        setIsOnline(true);
        checarFila();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const interval = setInterval(checarFila, 5000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  const handleSincronizar = async () => {
    if (!navigator.onLine) {
      toast.warning('Você está offline. Conecte-se à internet para sincronizar.');
      return;
    }

    setSincronizando(true);
    try {
      const res = await visitasOfflineService.sincronizarTudo({ forcar: true });
      await checarFila();
      
      if (res.sincronizados > 0) {
        toast.success(`${res.sincronizados} registro(s) sincronizado(s) com o servidor com sucesso!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sig_visitas_dados_atualizados'));
        }
      } else if (res.erros > 0) {
        toast.error(`Falha ao sincronizar ${res.erros} item(ns). Verifique se os dados estão completos e tente novamente.`);
      } else {
        toast.info('Tudo atualizado! Nenhuma alteração pendente para sincronizar.');
      }
    } catch (err) {
      toast.error('Erro ao sincronizar dados com o servidor.');
    } finally {
      setSincronizando(false);
    }
  };

  if (isOnline && itensPendentes === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5 text-xs">
        {isOnline ? (
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
            <Wifi className="w-4 h-4 text-emerald-600" />
            Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-amber-600">
            <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
            Modo Offline Ativo (Operando localmente)
          </span>
        )}

        {itensPendentes > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
            <AlertCircle className="w-3 h-3 text-blue-600" />
            {itensPendentes} item(ns) pendente(s) de envio
          </span>
        )}
      </div>

      {isOnline && itensPendentes > 0 && (
        <Button
          size="sm"
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="h-7 text-xs font-bold gap-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs"
        >
          <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
          Sincronizar Agora
        </Button>
      )}
    </div>
  );
}
