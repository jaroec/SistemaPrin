// frontend/src/pages/ExchangeRate.tsx - VERSIÓN MEJORADA CON ESTILO COMPLETO
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Download,
} from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';

interface ExchangeRate {
  id: number;
  rate: number;
  date: string;
  set_by_name: string;
  created_at?: string;
}

const exchangeRateApi = {
  getToday: async (): Promise<ExchangeRate> => {
    const response = await api.get('/api/v1/exchange-rate/today');
    return response.data;
  },
  getHistory: async (limit = 30): Promise<ExchangeRate[]> => {
    const response = await api.get('/api/v1/exchange-rate/history', {
      params: { limit },
    });
    return response.data;
  },
  create: async (data: { rate: number; date: string }): Promise<ExchangeRate> => {
    const response = await api.post('/api/v1/exchange-rate', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/exchange-rate/${id}`);
  },
};

export const ExchangeRate = () => {
  const [showModal, setShowModal] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: todayRate } = useQuery({
    queryKey: ['exchange-rate-today'],
    queryFn: exchangeRateApi.getToday,
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['exchange-rate-history'],
    queryFn: () => exchangeRateApi.getHistory(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { rate: number; date: string }) => exchangeRateApi.create(data),
    onSuccess: () => {
      alert('✅ Tasa de cambio registrada exitosamente');
      setNewRate('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['exchange-rate-today'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-rate-history'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al registrar la tasa');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: exchangeRateApi.delete,
    onSuccess: () => {
      alert('✅ Tasa eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['exchange-rate-history'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-rate-today'] });
    },
    onError: () => {
      alert('❌ Error al eliminar la tasa');
    },
  });

  const handleSaveRate = () => {
    if (!newRate || parseFloat(newRate) <= 0) {
      alert('⚠️ Ingrese una tasa válida');
      return;
    }

    createMutation.mutate({
      rate: parseFloat(newRate),
      date: selectedDate,
    });
  };

  const handleDeleteRate = (id: number) => {
    if (confirm('¿Eliminar esta tasa de cambio?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditRate = (rate: ExchangeRate) => {
    setNewRate(rate.rate.toString());
    setSelectedDate(rate.date);
    setEditingId(rate.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewRate('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
  };

  // Calcular tendencia
  const calculateTrend = () => {
    if (!todayRate || history.length < 2) return { value: 0, isPositive: false };
    const yesterday = history[1];
    const change = todayRate.rate - yesterday.rate;
    const percent = (change / yesterday.rate) * 100;
    return { value: percent, isPositive: change >= 0 };
  };

  const trend = calculateTrend();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasa de Cambio</h1>
          <p className="text-gray-600 mt-1">Gestión de tasas diarias USD ↔ VES</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="w-5 h-5 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Nueva Tasa
          </Button>
        </div>
      </div>

      {/* Tasa Actual - Card Principal */}
      {todayRate && (
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-2">Tasa Vigente Hoy</p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl font-bold">{todayRate.rate.toFixed(2)}</p>
                <p className="text-2xl text-primary-100">Bs/$</p>
              </div>
            </div>
            <div className="p-4 bg-white/20 backdrop-blur rounded-xl">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Información Adicional */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
            {/* Variación */}
            <div>
              <p className="text-primary-100 text-xs mb-1">Variación vs Ayer</p>
              <div className="flex items-center gap-2">
                {trend.isPositive ? (
                  <TrendingUp className="w-5 h-5 text-white" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-white" />
                )}
                <span className="text-xl font-bold">
                  {trend.isPositive ? '+' : ''}{trend.value.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Calculadora 1 USD */}
            <div>
              <p className="text-primary-100 text-xs mb-1">1 USD =</p>
              <p className="text-lg font-bold">{formatCurrency(todayRate.rate)}</p>
            </div>

            {/* Calculadora 100 USD */}
            <div>
              <p className="text-primary-100 text-xs mb-1">100 USD =</p>
              <p className="text-lg font-bold">{formatCurrency(todayRate.rate * 100)}</p>
            </div>

            {/* Fecha */}
            <div>
              <p className="text-primary-100 text-xs mb-1">Actualizado</p>
              <p className="text-lg font-bold">{formatDate(todayRate.date)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Máxima */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tasa Máxima (30 días)</p>
              <p className="text-2xl font-bold text-red-600">
                {history.length > 0
                  ? Math.max(...history.map((h) => h.rate)).toFixed(2)
                  : '0.00'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        {/* Mínima */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tasa Mínima (30 días)</p>
              <p className="text-2xl font-bold text-green-600">
                {history.length > 0
                  ? Math.min(...history.map((h) => h.rate)).toFixed(2)
                  : '0.00'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Promedio */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tasa Promedio (30 días)</p>
              <p className="text-2xl font-bold text-primary-600">
                {history.length > 0
                  ? (history.reduce((sum, h) => sum + h.rate, 0) / history.length).toFixed(2)
                  : '0.00'}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Historial */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Historial de Tasas</h2>
          <p className="text-sm text-gray-600 mt-1">Últimas 30 tasas registradas</p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando historial...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay historial disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Tasa (Bs/$)
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                    Variación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Registrado por
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((rate, index) => {
                  const prevRate = history[index + 1];
                  const change = prevRate ? rate.rate - prevRate.rate : 0;
                  const changePercent = prevRate
                    ? ((change / prevRate.rate) * 100).toFixed(2)
                    : 0;

                  return (
                    <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(rate.date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {rate.rate.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {index < history.length - 1 ? (
                          <span
                            className={`inline-flex items-center gap-1 text-sm font-semibold ${
                              change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {change >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {change >= 0 ? '+' : ''}{changePercent}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{rate.set_by_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditRate(rate)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRate(rate.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Tasa' : 'Nueva Tasa de Cambio'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-900">
                    Esta tasa se usará para calcular conversiones en todo el sistema.
                  </p>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Tasa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasa USD → VES (Bs/$)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="45.20"
                    className="w-full pl-10 pr-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Vista Previa */}
              {newRate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Vista Previa:</p>
                  <div className="space-y-1 text-sm font-medium">
                    <p>
                      1 USD = <span className="text-primary-600">{formatCurrency(parseFloat(newRate))}</span>
                    </p>
                    <p>
                      10 USD ={' '}
                      <span className="text-primary-600">
                        {formatCurrency(parseFloat(newRate) * 10)}
                      </span>
                    </p>
                    <p>
                      100 USD ={' '}
                      <span className="text-primary-600">
                        {formatCurrency(parseFloat(newRate) * 100)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button onClick={handleCloseModal} variant="secondary" className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveRate}
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Guardando...' : 'Guardar Tasa'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
