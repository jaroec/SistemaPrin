// pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ShoppingCart, Loader } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      try {
        // Obtener perfil del usuario
        const user = await authApi.getProfile();
        
        // Guardar en Zustand store
        setAuth(user, data.access_token);
        
        // Redirigir al dashboard
        navigate('/');
      } catch (err: any) {
        console.error('Error al obtener perfil:', err);
        setError('Error al obtener datos del usuario');
      }
    },
    onError: (err: any) => {
      console.error('Error en login:', err);
      
      // Mensajes de error más específicos según el status code
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      if (status === 404) {
        setError('Usuario no encontrado');
      } else if (status === 401) {
        setError('Contraseña incorrecta');
      } else if (status === 403) {
        setError('Cuenta desactivada. Contacte al administrador');
      } else if (detail) {
        setError(detail);
      } else {
        setError('Error al iniciar sesión. Intente nuevamente');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor ingrese un email válido');
      return;
    }

    // Ejecutar login
    loginMutation.mutate({ username: email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema POS</h1>
          <p className="text-gray-600 mt-2">Inicia sesión para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Campo de Email */}
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            autoComplete="email"
            disabled={loginMutation.isPending}
          />

          {/* Campo de Contraseña */}
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loginMutation.isPending}
          />

          {/* Botón de Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>
        </form>

        {/* Credenciales de prueba */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2 font-medium">
            Credenciales de prueba:
          </p>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <strong>Admin:</strong> admin@pos.com / admin123
            </p>
            <p>
              <strong>Cajero:</strong> cajero@pos.com / cajero123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
