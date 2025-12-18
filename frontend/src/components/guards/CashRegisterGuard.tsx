// frontend/src/components/guards/CashRegisterGuard.tsx
import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/api/axios';

interface CashRegister {
  id: number;
  status: 'OPEN' | 'CLOSED';
}

const cashRegisterApi = {
  getStatus: async (): Promise<CashRegister | null> => {
    const response = await api.get('/api/v1/cash-register/status');
    return response.data;
  },
};

interface CashRegisterGuardProps {
  children: ReactNode;
}

export const CashRegisterGuard = ({ children }: CashRegisterGuardProps) => {
  const navigate = useNavigate();
  
  const { data: cashRegister, isLoading } = useQuery({
    queryKey: ['cash-register-status-guard'],
    queryFn: cashRegisterApi.getStatus,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  // Si no hay caja abierta, mostrar pantalla de bloqueo
  if (!cashRegister || cashRegister.status !== 'OPEN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            {/* Icono */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <Lock className="w-10 h-10 text-red-600" />
            </div>

            {/* Título */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Caja Cerrada
            </h1>
            
            {/* Descripción */}
            <p className="text-gray-600 mb-6">
              Debe abrir una caja para poder realizar ventas y operaciones en el punto de venta.
            </p>

            {/* Alerta */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Acción requerida
                  </p>
                  <p className="text-sm text-orange-700">
                    Dirígete a <strong>Control de Caja</strong> para abrir la caja antes de operar ventas.
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/cash-register')}
                className="w-full"
              >
                Ir a Control de Caja
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="secondary"
                className="w-full"
              >
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si hay caja abierta, renderizar hijos (POS)
  return <>{children}</>;
};
