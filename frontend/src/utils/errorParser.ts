// utils/errorParser.ts
export function parseApiError(error: any): string {
  if (!error) return 'Error desconocido';

  // Axios / fetch error
  const data = error.response?.data;

  if (!data) return 'Error de conexión con el servidor';

  // FastAPI validation error (detail array)
  if (Array.isArray(data.detail)) {
    return data.detail.map((e: any) => e.msg).join(', ');
  }

  // FastAPI HTTPException con string
  if (typeof data.detail === 'string') {
    return data.detail;
  }

  // Objeto inesperado
  if (typeof data.detail === 'object') {
    return data.detail.msg ?? 'Error de validación';
  }

  return 'Error inesperado';
}
