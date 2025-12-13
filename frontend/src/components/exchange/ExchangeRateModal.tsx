import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DollarSign, TrendingUp } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ExchangeRateModalProps {
  onClose: () => void;
  onSuccess: (rate: number) => void;
}

const exchangeRateApi = {
  setRate: async (rate: number) => {
    const response = await api.post('/api/v1/exchange-rate/set', { rate });
    return response.data;
  },
};

export const ExchangeRateModal = ({ onClose, onSuccess }: ExchangeRateModalProps) => {
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');

  const setRateMutation = useMutation({
    mutationFn: exchangeRateApi.setRate,
    onSuccess: (data) => {
      onSuccess(data.rate);
      onClose();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail || 'Error al configurar tasa';
      setError(detail);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rateNum = parseFloat(rate);

    if (!rate || isNaN(rateNum) || rateNum <= 0) {
      setError('Ingrese una tasa válida mayor a 0');
      return;
    }

    setRateMutation.mutate(rateNum);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Configurar Tasa del Día</h2>
          <p className="text-sm text-gray-600 mt-2">
            Establece la tasa de cambio USD → Bs para el día de hoy
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Importante
                </p>
                <p className="text-xs text-blue-700">
                  • Solo se puede configurar una tasa por día
                </p>
                <p className="text-xs text-blue-700">
                  • Esta tasa se usará en pagos con divisas
                </p>
                <p className="text-xs text-blue-700">
                  • Los montos principales siempre son en USD
                </p>
              </div>
            </div>
          </div>

          {/* Input de tasa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tasa de Cambio
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                1 USD =
              </span>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="36.50"
                className="w-full pl-24 pr-16 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                Bs
              </span>
            </div>
          </div>

          {/* Vista previa */}
          {rate && !isNaN(parseFloat(rate)) && parseFloat(rate) > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">$10 USD =</span>
                  <span className="font-semibold text-gray-900">
                    Bs {(parseFloat(rate) * 10).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">$50 USD =</span>
                  <span className="font-semibold text-gray-900">
                    Bs {(parseFloat(rate) * 50).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">$100 USD =</span>
                  <span className="font-semibold text-gray-900">
                    Bs {(parseFloat(rate) * 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={setRateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={setRateMutation.isPending || !rate}
            >
              {setRateMutation.isPending ? 'Guardando...' : 'Guardar Tasa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
