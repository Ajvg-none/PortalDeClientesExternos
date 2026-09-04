/**
 * App raiz (esqueleto Fase 1 - B1.1).
 * En Fase 6 se reemplaza por el layout con rutas/guards por rol
 * (src/app) y el contenido de cada feature.
 */
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Portal de Clientes Externos</h1>
      <p>Sistema de gestión de órdenes ópticas — esqueleto frontend (Fase 1).</p>
      <p>API disponible en <code>/api/health</code> (vía proxy Vite).</p>
    </main>
  );
}
