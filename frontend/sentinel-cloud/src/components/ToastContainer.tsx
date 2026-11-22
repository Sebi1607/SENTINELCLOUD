import React from 'react';
import { ToastMessage } from '../types/monitor';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />;
            case 'error':
              return <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />;
            case 'warning':
              return <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />;
            default:
              return <Info className="w-5 h-5 text-sky-500 dark:text-cyan-400 shrink-0" />;
          }
        };

        const getBorderColor = () => {
          switch (toast.type) {
            case 'success':
              return 'border-emerald-200/90 dark:border-emerald-500/40 shadow-emerald-100/60 dark:shadow-emerald-950/20 bg-emerald-50/40 dark:bg-slate-900/95';
            case 'error':
              return 'border-rose-200/90 dark:border-rose-500/40 shadow-rose-100/60 dark:shadow-rose-950/20 bg-rose-50/40 dark:bg-slate-900/95';
            case 'warning':
              return 'border-amber-200/90 dark:border-amber-500/40 shadow-amber-100/60 dark:shadow-amber-950/20 bg-amber-50/40 dark:bg-slate-900/95';
            default:
              return 'border-sky-200/90 dark:border-cyan-500/40 shadow-sky-100/60 dark:shadow-cyan-950/20 bg-sky-50/40 dark:bg-slate-900/95';
          }
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border ${getBorderColor()} shadow-xl text-slate-800 dark:text-slate-100 transition-all duration-300 animate-slide-in-right`}
          >
            {getIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{toast.title}</h4>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{toast.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
