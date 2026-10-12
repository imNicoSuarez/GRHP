import { useEffect, useState } from 'react'
import { HashRouter } from 'react-router-dom'
import { AppProvider, cargarDatos, useApp } from './lib/store.jsx'
import { TopBar } from './components/Layouts.jsx'
import EmpleadoApp from './screens/empleado/EmpleadoApp.jsx'
import SuplenteApp from './screens/suplente/SuplenteApp.jsx'
import CoordinadoraApp from './screens/coordinadora/CoordinadoraApp.jsx'
import SupervisorApp from './screens/supervisor/SupervisorApp.jsx'

function Shell() {
  const { usuario } = useApp()
  const Rol = { empleado: EmpleadoApp, suplente: SuplenteApp, coordinadora: CoordinadoraApp, supervisor: SupervisorApp }[usuario.rol]
  return (
    <>
      <TopBar />
      <Rol key={usuario.id} />
    </>
  )
}

export default function App() {
  const [inicial, setInicial] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { cargarDatos().then(setInicial).catch((e) => setError(e.message)) }, [])
  if (error) return <div className="p-8 text-red-700">No se pudieron cargar los datos mock: {error}</div>
  if (!inicial) return <div className="flex h-screen items-center justify-center text-slate-500">Cargando datos de Pagnific…</div>
  return (
    <AppProvider inicial={inicial}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  )
}
