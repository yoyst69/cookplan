import axios, { AxiosError } from 'axios';

export const API_URL: string = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !String(err.config?.url || '').includes('/auth/login')) {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_usuario');
    }
    return Promise.reject(err);
  }
);

export async function errMsg(e: unknown): Promise<string> {
  const ax = e as AxiosError<{ error?: string }>;
  return ax?.response?.data?.error || ax?.message || 'Error inesperado';
}

export type MomentoDia = 'COMIDA' | 'CENA' | 'AMBAS' | 'POSTRE';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  logo: string | null;
  confirmado: boolean;
  activo: boolean;
  esAdmin: boolean;
  createdAt: string;
}

export interface Receta {
  id: number;
  titulo: string;
  momento: MomentoDia;
  descripcion: string | null;
  foto: string | null;
  fotoNombre: string | null;
  ingredientes: string[];
  pasos: string[];
  tiempo: number | null;
  personas: number | null;
  creadorId: number | null;
  creadorNombre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecetaMini {
  id: number;
  titulo: string;
  momento: MomentoDia;
  foto: string | null;
  tiempo: number | null;
  personas: number | null;
}

export interface DiaPlan {
  fecha: string;
  nombre: string;
  comida: RecetaMini | null;
  cena: RecetaMini | null;
  generado: boolean;
}

export interface PlanSemana {
  semana: string;
  dias: DiaPlan[];
}

export interface Sugerencia {
  id: number;
  titulo: string;
  momento: MomentoDia;
  foto: string | null;
  tiempo: number | null;
  personas: number | null;
  diasSinUsar: number;
  ultima: string | null;
}

export interface ListaItem {
  id: number;
  producto: string;
  cantidad: string | null;
  origen: 'MENU' | 'MANUAL';
  checked: boolean;
  orden: number;
  createdAt: string;
}

export interface TareaCatalogo {
  id: number;
  nombre: string;
  peso: number;
  activa: boolean;
}

export interface AsignacionTarea {
  id: number;
  usuarioId: number;
  persona: string;
  tareaId: number;
  tarea: string;
  peso: number;
  dia: 'SABADO' | 'DOMINGO';
  checked: boolean;
  orden: number;
  generado: boolean;
}

export interface RepartoTareas {
  semana: string;
  sabado: string;
  domingo: string;
  personas: Array<{ id: number; nombre: string; email: string }>;
  asignaciones: AsignacionTarea[];
  catalogo: TareaCatalogo[];
}

/* ---------- Auth ---------- */
export const authAPI = {
  login: (email: string, password: string) => api.post<{ usuario: Usuario; token: string }>('/auth/login', { email, password }),
  register: (nombre: string, email: string, password: string) =>
    api.post<{ mensaje: string }>('/auth/register', { nombre, email, password }),
  confirmar: (token: string) => api.post<{ mensaje: string }>('/auth/confirmar', { token }),
  reenviar: (email: string) => api.post<{ mensaje: string }>('/auth/reenviar', { email }),
  recuperar: (email: string) => api.post<{ mensaje: string }>('/auth/recuperar', { email }),
  reset: (token: string, password: string) => api.post<{ mensaje: string }>('/auth/reset', { token, password }),
  me: () => api.get<{ usuario: Usuario }>('/auth/me'),
  updateMe: (form: FormData) => api.patch<{ usuario: Usuario }>('/auth/me', form),
  updateMeJson: (data: { nombre?: string; telefono?: string; email?: string; password?: string }) =>
    api.patch<{ usuario: Usuario }>('/auth/me', data),
};

/* ---------- Recetas ---------- */
export const recetasAPI = {
  list: (params?: { q?: string; momento?: MomentoDia }) => api.get<{ recetas: Receta[] }>('/recetas', { params }),
  get: (id: number) => api.get<{ receta: Receta }>(`/recetas/${id}`),
  crear: (data: Partial<Receta> & { titulo: string }) => api.post<{ receta: Receta }>('/recetas', data),
  actualizar: (id: number, data: Partial<Receta>) => api.patch<{ receta: Receta }>(`/recetas/${id}`, data),
  borrar: (id: number) => api.delete<{ ok: boolean }>(`/recetas/${id}`),
  subirFoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('foto', file);
    return api.post<{ foto: string; fotoNombre: string }>(`/recetas/${id}/foto`, fd);
  },
  quitarFoto: (id: number) => api.delete<{ ok: boolean }>(`/recetas/${id}/foto`),
};

/* ---------- Plan semanal ---------- */
export const planAPI = {
  get: (semana?: string) => api.get<PlanSemana>('/plan', { params: { semana } }),
  sugerencias: (semana?: string, dia?: number, momento?: 'COMIDA' | 'CENA', actual?: number) =>
    api.get<{ sugerencias: Sugerencia[] }>('/plan/sugerencias', { params: { semana, dia, momento, actual } }),
  ultimosUso: () => api.get<{ ultimosUso: Record<number, string> }>('/plan/ultimos-uso'),
  guardar: (semana: string, cambios: Array<{ dia: number; comidaId?: number | null; cenaId?: number | null; generado?: boolean }>) =>
    api.put<PlanSemana>('/plan', { semana, cambios }),
  generar: (semana?: string) => api.post<{ ok: boolean; mensaje: string; semana: PlanSemana }>('/plan/generar', { semana }),
};

/* ---------- Lista de la compra ---------- */
export const listaAPI = {
  get: (semana?: string) => api.get<{ semana: string; items: ListaItem[] }>('/lista-compra', { params: { semana } }),
  generar: (semana?: string) => api.post<{ semana: string; items: ListaItem[]; generados: number }>('/lista-compra/generar', { semana }),
  add: (producto: string, cantidad?: string, semana?: string) =>
    api.post<{ item: ListaItem }>('/lista-compra/item', { producto, cantidad, semana }),
  patch: (id: number, data: { checked?: boolean; producto?: string; cantidad?: string }) =>
    api.patch<{ item: ListaItem }>(`/lista-compra/${id}`, data),
  del: (id: number) => api.delete<{ ok: boolean }>(`/lista-compra/${id}`),
};

/* ---------- Tareas domesticas ---------- */
export const tareasAPI = {
  get: (semana?: string) => api.get<RepartoTareas>('/tareas', { params: { semana } }),
  generar: (semana?: string) => api.post<RepartoTareas>('/tareas/generar', { semana }),
  catalogo: () => api.get<{ catalogo: TareaCatalogo[] }>('/tareas/catalogo'),
  addCatalogo: (nombre: string, peso: number) => api.post<{ tarea: TareaCatalogo }>('/tareas/catalogo', { nombre, peso }),
  patchCatalogo: (id: number, data: { nombre?: string; peso?: number; activa?: boolean }) =>
    api.patch<{ tarea: TareaCatalogo }>(`/tareas/catalogo/${id}`, data),
  delCatalogo: (id: number) => api.delete<{ ok: boolean }>(`/tareas/catalogo/${id}`),
  addAsignacion: (data: { semana?: string; usuarioId: number; tareaId: number; dia?: 'SABADO' | 'DOMINGO' }) =>
    api.post<{ asignacion: AsignacionTarea }>('/tareas/asignacion', data),
  patchAsignacion: (id: number, data: { checked?: boolean; dia?: 'SABADO' | 'DOMINGO' }) =>
    api.patch<{ asignacion: AsignacionTarea }>(`/tareas/asignacion/${id}`, data),
  delAsignacion: (id: number) => api.delete<{ ok: boolean }>(`/tareas/asignacion/${id}`),
};

/* ---------- Usuarios (admin) ---------- */
export const usuariosAPI = {
  list: () => api.get<{ usuarios: Usuario[] }>('/usuarios'),
  crear: (data: { nombre: string; email: string; password?: string; esAdmin?: boolean; telefono?: string }) =>
    api.post<{ usuario: Usuario }>('/usuarios', data),
  patch: (id: number, data: { nombre?: string; email?: string; telefono?: string; esAdmin?: boolean; activo?: boolean; confirmado?: boolean; password?: string }) =>
    api.patch<{ usuario: Usuario }>(`/usuarios/${id}`, data),
  desactivar: (id: number) => api.delete<{ usuario: Usuario }>(`/usuarios/${id}`),
};

/* ---------- Notificaciones ---------- */
export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export const notificacionesAPI = {
  list: (limit?: number) => api.get<{ notificaciones: Notificacion[]; noLeidas: number }>('/notificaciones', { params: { limit } }),
  noLeidas: () => api.get<{ noLeidas: number }>('/notificaciones/no-leidas'),
  leer: (id: number) => api.patch<{ ok: boolean }>(`/notificaciones/${id}`, { leida: true }),
  leerTodas: () => api.post<{ ok: boolean }>('/notificaciones/leer-todas'),
};