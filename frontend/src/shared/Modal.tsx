import { useEffect, useRef } from 'react';

/**
 * Modal de confirmacion/overlay (REM-2026-09/REM-11 + a11y F5).
 * - Cierra con Escape o clic en el backdrop.
 * - Focus trap basico y retorno de foco al elemento que lo abrio.
 * - role="dialog" + aria-modal; el titulo via aria-labelledby (prop titleId).
 */
export function Modal({
  onClose,
  titleId,
  children,
  width,
}: {
  onClose: () => void;
  titleId?: string;
  children: React.ReactNode;
  width?: number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !overlayRef.current) return;
      const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKey);
    overlayRef.current?.addEventListener('keydown', onKeyDown);
    // mover el foco al primer control del modal
    const initial = overlayRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
    );
    initial?.focus();

    return () => {
      window.removeEventListener('keydown', onKey);
      overlayRef.current?.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={width ? { maxWidth: width } : undefined}>
        {children}
      </div>
    </div>
  );
}
