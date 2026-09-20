import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Confirmar from './pages/Confirmar';
import Recuperar from './pages/Recuperar';
import Reset from './pages/Reset';
import Recetas from './pages/Recetas';
import Plan from './pages/Plan';
import Lista from './pages/Lista';
import Tareas from './pages/Tareas';
import Perfil from './pages/Perfil';
import Usuarios from './pages/Usuarios';
import NotFound from './pages/NotFound';

function Privado({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner texto="Cargando..." />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Admin({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner texto="Cargando..." />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.esAdmin) return <Navigate to="/recetas" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/confirmar/:token" element={<Confirmar />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/reset" element={<Reset />} />

        <Route path="/recetas" element={<Privado><Recetas /></Privado>} />
        <Route path="/plan" element={<Privado><Plan /></Privado>} />
        <Route path="/lista" element={<Privado><Lista /></Privado>} />
        <Route path="/tareas" element={<Privado><Tareas /></Privado>} />
        <Route path="/perfil" element={<Privado><Perfil /></Privado>} />
        <Route path="/usuarios" element={<Admin><Usuarios /></Admin>} />

        <Route path="/" element={<Navigate to="/recetas" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}