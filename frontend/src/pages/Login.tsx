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

  // LOGIN MUTATION
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      try {
        const user = await authApi.getProfile();
        setAuth(user, data.access_token);
        navigate('/');
      } catch (err: any) {
        console.error('Error al obtener perfil:', err);
        setError('Error al obtener datos del usuario');
      }
    },
    onError: (err: any) => {
      console.error('Error en login:', err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 404) setError('Usuario no encontrado');
      else if (status === 401) setError('Contraseña incorrecta');
      else if (status === 403) setError('Cuenta desactivada');
      else setError(detail || 'Error al iniciar sesión');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Ingrese un email válido');
      return;
    }

    loginMutation.mutate({ username: email, password });
  };

  const loading = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900">Sistema POS</h1>
          <p className="text-gray-600 mt-1">Inicia sesión para continuar</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            autoComplete="email"
            disabled={loading}
          />

          {/* Password */}
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />

          {/* Botón */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        {/* Credenciales demo */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2 font-medium">
            Credenciales de prueba:
          </p>
          <div className="space-y-1 text-sm text-gray-700">
            <p><strong>Admin:</strong> admin@pos.com / admin123</p>
            <p><strong>Cajero:</strong> cajero@pos.com / cajero123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
