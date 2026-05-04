import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

export interface MetricTooltipProps {
  title?: string;
  description: string;
  calculation?: string;
  interpretation?: string;
  note?: string;
  caveat?: string;
  source?: string;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
}

export function MetricTooltip({
  title,
  description,
  calculation,
  interpretation,
  note,
  caveat,
  source,
}: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const finalNote = note || caveat;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const modal = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-label="Fechar explicação"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'metric-tooltip-title' : undefined}
        className="
          relative z-10 flex max-h-[86vh] w-full max-w-2xl flex-col
          overflow-hidden rounded-2xl border border-slate-700
          bg-slate-950 shadow-2xl
        "
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Explicação da métrica
            </p>

            {title && (
              <h3
                id="metric-tooltip-title"
                className="mt-1 text-lg font-semibold leading-snug text-slate-100"
              >
                {title}
              </h3>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="
              shrink-0 rounded-full p-1.5 text-slate-500
              transition-colors hover:bg-slate-800 hover:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500/40
            "
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <section>
              <p className="mb-1.5 text-xs uppercase tracking-[0.22em] text-slate-500">
                O que é
              </p>

              <p className="text-sm leading-relaxed text-slate-300">
                {description}
              </p>
            </section>

            {calculation && (
              <section>
                <p className="mb-1.5 text-xs uppercase tracking-[0.22em] text-slate-500">
                  Como é calculado
                </p>

                <p className="text-sm leading-relaxed text-slate-300">
                  {calculation}
                </p>
              </section>
            )}

            {interpretation && (
              <section>
                <p className="mb-1.5 text-xs uppercase tracking-[0.22em] text-slate-500">
                  Como interpretar
                </p>

                <p className="text-sm leading-relaxed text-slate-300">
                  {interpretation}
                </p>
              </section>
            )}

            {finalNote && (
              <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="mb-1.5 text-xs uppercase tracking-[0.22em] text-amber-300/90">
                  Atenção
                </p>

                <p className="text-sm leading-relaxed text-amber-50/80">
                  {finalNote}
                </p>
              </section>
            )}

            {source && (
              <section className="border-t border-slate-800 pt-4">
                <p className="mb-1.5 text-xs uppercase tracking-[0.22em] text-slate-500">
                  Fonte
                </p>

                <p className="text-sm leading-relaxed text-slate-400">
                  {source}
                </p>
              </section>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 px-5 py-3">
          <p className="text-xs text-slate-500">
            Clique fora da janela, no X ou pressione Esc para fechar.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="
          inline-flex items-center justify-center rounded-full
          text-slate-500 transition-colors
          hover:text-blue-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
        "
        aria-label={title ? `Ver explicação sobre ${title}` : 'Ver explicação da métrica'}
      >
        <Info size={14} />
      </button>

      {mounted && isOpen ? createPortal(modal, document.body) : null}
    </>
  );
}