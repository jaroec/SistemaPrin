// components/pos/Cart.tsx - CON CONVERSIÓN DE MONEDA
import { Trash2, Plus, Minus, ShoppingCart as CartIcon, DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import api from '@/api/axios';

interface ExchangeRate {
  rate: number;
  date: string;
}

const exchangeRateApi = {
  getToday: async (): Promise<ExchangeRate> => {
    const response = await api.get('/api/v1/exchange-rate/today');
    return response.data;
  },
};

interface CartProps {
  onCheckout: () => void;
}

export const Cart = ({ onCheckout }: CartProps) => {
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getTotal } =
    useCartStore();

  // Obtener tasa de cambio del día
  const { data: exchangeRate, isLoading: loadingRate } = useQuery({
    queryKey: ['exchange-rate-today'],
    queryFn: exchangeRateApi.getToday,
  });

  const subtotal = getSubtotal();
  const total = getTotal();

  // Convertir a moneda local (VES)
  const subtotalVES = exchangeRate ? subtotal * exchangeRate.rate : 0;
  const totalVES = exchangeRate ? total * exchangeRate.rate : 0;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <CartIcon className="w-24 h-24 text-gray-300 mb-4" />
        <p className="text-xl text-gray-400 text-center">El carrito está vacío</p>
        <p className="text-sm text-gray-400 mt-2 text-center">
          Busca productos para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Carrito ({items.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>

        {/* Tasa de Cambio Info */}
        {exchangeRate && (
          <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-600" />
              <div className="flex-1">
                <p className="text-xs text-primary-600 font-medium">Tasa del Día</p>
                <p className="text-sm font-bold text-primary-700">
                  1 USD = {exchangeRate.rate.toFixed(2)} Bs
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {items.map((item) => (
          <Card key={item.product.id} padding="md" className="border-l-4 border-l-primary-500">
            {/* Producto Info */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.product.name}
                </h3>
                <p className="text-sm text-gray-600 font-mono">{item.product.code}</p>
                {item.product.stock <= item.product.min_stock && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                    Stock bajo
                  </span>
                )}
              </div>
              <button
                onClick={() => removeItem(item.product.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Controles y Precios */}
            <div className="space-y-3">
              {/* Cantidad */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1 && value <= item.product.stock) {
                        updateQuantity(item.product.id, value);
                      }
                    }}
                    className="w-12 text-center font-semibold text-gray-900 bg-transparent focus:outline-none"
                    min="1"
                    max={item.product.stock}
                  />
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtotal en USD */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">
                    {item.quantity} × {formatCurrency(item.product.sale_price)}
                  </p>
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>

              {/* Conversión a VES */}
              {exchangeRate && (
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>En Bolívares:</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(item.subtotal * exchangeRate.rate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Footer - Totales */}
      <div className="p-6 border-t border-gray-200 bg-white space-y-4">
        {/* Desglose en USD */}
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal USD:</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-primary-600 pb-3 border-b border-gray-200">
            <span>Total USD:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Conversión a VES */}
        {exchangeRate && !loadingRate && (
          <div className="space-y-2 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
            <div className="flex justify-between text-gray-700">
              <span className="font-medium">Equivalente en Bolívares:</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(subtotalVES)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-orange-700">Total a Cobrar:</span>
                <span className="text-orange-600">{formatCurrency(totalVES)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-orange-200">
              Tasa aplicada: 1 USD = {exchangeRate.rate.toFixed(2)} Bs
            </div>
          </div>
        )}

        {loadingRate && (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="animate-pulse text-sm text-gray-600">
              Cargando tasa de cambio...
            </div>
          </div>
        )}

        {/* Botón de Checkout */}
        <Button
          onClick={onCheckout}
          className="w-full py-4 text-lg font-semibold"
          disabled={items.length === 0}
        >
          Procesar Venta
        </Button>
      </div>
    </div>
  );
};
