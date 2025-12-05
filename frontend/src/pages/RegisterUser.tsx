// ============================================================================
// 2. ACTUALIZAR: src/pages/RegisterUser.tsx
// Versión mejorada con mejor UI y manejo de errores
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export const RegisterUser = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // Redirigir si no es ADMIN
  if (currentUser?.role !== 'ADMIN') {
    navigate('/');
    return null;
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CAJERO',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ✅ MUTACIÓN PARA REGISTRAR
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      setSuccess('✅ Usuario creado exitosamente');
      setError('');

      // Resetear form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'CAJERO',
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(detail || 'Error al registrar usuario');
      setSuccess('');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones
    if (!formData.name || !formData.email || !formData.password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return;
    }

    // Registrar
    registerMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Registrar Usuario</h1>
              <p className="text-slate-400 text-sm">Crear nueva cuenta de usuario</p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-xl p-8">
          {/* Mensajes */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Completo *
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Juan Pérez"
                disabled={registerMutation.isPending}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo Electrónico *
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@empresa.com"
                disabled={registerMutation.isPending}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  disabled={registerMutation.isPending}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={registerMutation.isPending}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Contraseña *
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={registerMutation.isPending}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={registerMutation.isPending}
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="CAJERO">Cajero</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Los cajeros tienen acceso al POS. Los administradores a todo el sistema.
              </p>
            </div>

            {/* Botón Submit */}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-2.5 mt-6"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin inline" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2 inline" />
                  Crear Usuario
                </>
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">
              <strong>Nota:</strong> El nuevo usuario podrá acceder con su email y contraseña desde la página de login.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
