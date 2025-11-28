import { Trash2, Plus, Minus, ShoppingCart as CartIcon } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';

interface CartProps {
  onCheckout: () => void;
}

export const Cart = ({ onCheckout }: CartProps) => {
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getTotal } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <CartIcon className="w-24 h-24 text-gray-300 mb-4" />
        <p className="text-xl text-gray-400 text-center">
          El carrito está vacío
        </p>
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
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-primary-300 transition-colors"
          >
            {/* Producto info */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.product.name}
                </h3>
                <p className="text-sm text-gray-600 font-mono">
                  {item.product.code}
                </p>
                {item.product.stock <= item.product.min_stock && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                    Stock bajo
                  </span>
                )}
              </div>
              <button
                onClick={() => removeItem(item.product.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Controles de cantidad y precio */}
            <div className="flex items-center justify-between">
              {/* Cantidad */}
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
                  className="w-16 text-center font-semibold text-gray-900 bg-transparent focus:outline-none"
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

              {/* Precio */}
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {formatCurrency(item.product.sale_price)} × {item.quantity}
                </p>
                <p className="text-xl font-bold text-primary-600">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            </div>

            {/* Advertencia de stock */}
            {item.quantity >= item.product.stock && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  Cantidad máxima disponible
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer - Totales */}
      <div className="p-6 border-t border-gray-200 bg-white space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-600">
          <span className="text-lg">Subtotal:</span>
          <span className="text-lg font-semibold">
            {formatCurrency(getSubtotal())}
          </span>
        </div>

        {/* Total */}
        <div className="flex justify-between text-gray-900 pb-4 border-b border-gray-200">
          <span className="text-2xl font-bold">Total:</span>
          <span className="text-3xl font-bold text-primary-600">
            {formatCurrency(getTotal())}
          </span>
        </div>

        {/* Botón de checkout */}
        <Button
          onClick={onCheckout}
          className="w-full py-4 text-lg"
          disabled={items.length === 0}
        >
          Procesar Venta
        </Button>
      </div>
    </div>
  );
};
