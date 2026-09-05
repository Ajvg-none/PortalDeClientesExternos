import { useEffect } from 'react';

/**
 * Modal de confirmacion/overlay reutilizable (REM-2026-09/REM-11, anexo v1.4).
 * Cierra con Escape o clic en el backdrop. Los botones de accion van en
 * children; el contenido queda sobre una tarjeta centrada.
 */
export function Modal({
  onClose,
  children,
  width = 440,
}: {
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '24px', width, maxWidth: '92vw', maxHeight: '85vh', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
