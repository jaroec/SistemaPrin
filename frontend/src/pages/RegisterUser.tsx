import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UserPlus, Loader } from 'lucide-react';

export const RegisterUser = () => {
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      setSuccess('Usuario creado exitosamente');
      setError('');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    },
    onError: (err: any) => {
      console.error(err);

      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else {
        setError('Error al registrar usuario');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (!email.includes('@')) {
      setError('Email inválido');
      return;
    }

    registerMutation.mutate({
      name,
      email,
      password,
      role: "CAJERO" // ← obligatorio según backend
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Crear Usuario</h1>
          <p className="text-gray-600 mt-2">Registrar un nuevo cajero</p>
        </div>

        {/* Mensajes */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">

          <Input
            label="Nombre Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={registerMutation.isPending}
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            autoComplete="email"
            disabled={registerMutation.isPending}
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={registerMutation.isPending}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              'Crear Usuario'
            )}
          </Button>
        </form>

        {/* Volver al login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-primary-600 font-semibold hover:underline text-sm"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};
