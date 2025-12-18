// frontend/src/pages/CashRegister.tsx
// IMPORTANTE: Agregar esta ruta en App.tsx y en el Layout sidebar
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  Unlock, 
  Lock, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/utils/format';
import api from '@/api/axios';

interface CashRegister {
  id: number;
  status: 'OPEN' | 'CLOSED';
  opening_amount: number;
  closing_amount?: number;
  system_amount?: number;
  difference?: number;
  opened_at: string;
  closed_at?: string;
  opened_by_user_id: number;
  closed_by_user_id?: number;
  notes?: string;
}

const cashRegisterApi = {
  getStatus: async (): Promise<CashRegister | null> => {
    const response = await api.get('/api/v1/cash-register/status');
    return response.data;
  },
  
  open: async (data: { opening_amount: number }): Promise<CashRegister> => {
    const response = await api.post('/api/v1/cash-register/open', data);
    return response.data;
  },
  
  close: async (data: { counted_amount: number; notes?: string }): Promise<CashRegister> => {
    const response = await api.post('/api/v1/cash-register/close', data);
    return response.data;
  },
};

export const CashRegister = () => {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: cashRegister, isLoading } = useQuery({
    queryKey: ['cash-register-status'],
    queryFn: cashRegisterApi.getStatus,
    refetchInterval: 30000, // Refrescar cada 30s
  });

  const openMutation = useMutation({
    mutationFn: cashRegisterApi.open,
    onSuccess: () => {
      alert('✅ Caja abierta exitosamente');
      setShowOpenModal(false);
      setOpeningAmount('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al abrir caja');
    },
  });

  const closeMutation = useMutation({
    mutationFn: cashRegisterApi.close,
    onSuccess: (data) => {
      const diff = data.difference || 0;
      const message = diff === 0 
        ? '✅ Caja cerrada. ¡Cuadre perfecto!' 
        : `⚠️ Caja cerrada. Diferencia: ${formatCurrency(Math.abs(diff))} ${diff > 0 ? '(Sobrante)' : '(Faltante)'}`;
      
      alert(message);
      setShowCloseModal(false);
      setClosingAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al cerrar caja');
    },
  });

  const handleOpenCash = () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      alert('⚠️ Ingrese un monto válido');
      return;
    }
    openMutation.mutate({ opening_amount: amount });
  };

  const handleCloseCash = () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      alert('⚠️ Ingrese un monto válido');
      return;
    }
    closeMutation.mutate({ counted_amount: amount, notes: notes || undefined });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  const isCashOpen = cashRegister?.status === 'OPEN';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Caja</h1>
          <p className="text-gray-600 mt-1">Gestión de apertura y cierre de caja</p>
        </div>
        
        {isCashOpen ? (
          <Button onClick={() => setShowCloseModal(true)} variant="danger">
            <Lock className="w-5 h-5 mr-2" />
            Cerrar Caja
          </Button>
        ) : (
          <Button onClick={() => setShowOpenModal(true)}>
            <Unlock className="w-5 h-5 mr-2" />
            Abrir Caja
          </Button>
        )}
      </div>

      {/* Estado Actual */}
      {isCashOpen ? (
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Caja Abierta</h2>
              </div>
              <p className="text-green-100">Operando normalmente</p>
            </div>
            <div className="p-4 bg-white/20 backdrop-blur rounded-xl">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/20">
            <div>
              <p className="text-green-100 text-xs mb-1">Monto Apertura</p>
              <p className="text-xl font-bold">{formatCurrency(cashRegister.opening_amount)}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs mb-1">Sistema Actual</p>
              <p className="text-xl font-bold">
                {cashRegister.system_amount ? formatCurrency(cashRegister.system_amount) : '-'}
              </p>
            </div>
            <div>
              <p className="text-green-100 text-xs mb-1">Apertura</p>
              <p className="text-sm font-semibold">{formatDateTime(cashRegister.opened_at)}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs mb-1">Tiempo Abierta</p>
              <p className="text-sm font-semibold">
                {Math.floor((Date.now() - new Date(cashRegister.opened_at).getTime()) / 3600000)}h
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Caja Cerrada</h2>
              </div>
              <p className="text-orange-100">Debe abrir caja para operar ventas</p>
            </div>
            <div className="p-4 bg-white/20 backdrop-blur rounded-xl">
              <Lock className="w-8 h-8" />
            </div>
          </div>

          {cashRegister && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/20">
              <div>
                <p className="text-orange-100 text-xs mb-1">Último Cierre</p>
                <p className="text-sm font-semibold">
                  {cashRegister.closed_at ? formatDateTime(cashRegister.closed_at) : '-'}
                </p>
              </div>
              <div>
                <p className="text-orange-100 text-xs mb-1">Sistema</p>
                <p className="text-xl font-bold">
                  {cashRegister.system_amount ? formatCurrency(cashRegister.system_amount) : '-'}
                </p>
              </div>
              <div>
                <p className="text-orange-100 text-xs mb-1">Declarado</p>
                <p className="text-xl font-bold">
                  {cashRegister.closing_amount ? formatCurrency(cashRegister.closing_amount) : '-'}
                </p>
              </div>
              <div>
                <p className="text-orange-100 text-xs mb-1">Diferencia</p>
                <p className={`text-xl font-bold ${
                  !cashRegister.difference ? '' : 
                  cashRegister.difference > 0 ? 'text-yellow-200' : 'text-red-200'
                }`}>
                  {cashRegister.difference 
                    ? `${cashRegister.difference > 0 ? '+' : ''}${formatCurrency(cashRegister.difference)}`
                    : '-'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Movimientos Hoy</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-green-600">-</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Egresos</p>
              <p className="text-2xl font-bold text-red-600">-</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Modal Abrir Caja */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Abrir Caja</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Registre el monto inicial en efectivo con el que abre la caja.
                  </p>
                </div>
              </div>

              <Input
                label="Monto Inicial (USD)"
                type="number"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => setShowOpenModal(false)} 
                  variant="secondary" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleOpenCash} 
                  className="flex-1"
                  disabled={openMutation.isPending}
                >
                  {openMutation.isPending ? 'Abriendo...' : 'Abrir Caja'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja */}
      {showCloseModal && cashRegister && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cerrar Caja</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Sistema calcula:</span>
                    <span className="font-bold text-primary-700">
                      {formatCurrency(cashRegister.system_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <Input
                label="Monto Contado (USD)"
                type="number"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0.00"
                helperText="Cuente el efectivo real en caja"
                autoFocus
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones del cierre..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {closingAmount && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Diferencia:</p>
                  <p className={`text-2xl font-bold ${
                    parseFloat(closingAmount) === (cashRegister.system_amount || 0)
                      ? 'text-green-600'
                      : parseFloat(closingAmount) > (cashRegister.system_amount || 0)
                      ? 'text-orange-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(parseFloat(closingAmount) - (cashRegister.system_amount || 0))}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => setShowCloseModal(false)} 
                  variant="secondary" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCloseCash} 
                  variant="danger"
                  className="flex-1"
                  disabled={closeMutation.isPending}
                >
                  {closeMutation.isPending ? 'Cerrando...' : 'Cerrar Caja'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};