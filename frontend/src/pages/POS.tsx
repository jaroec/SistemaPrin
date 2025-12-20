import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from 'lucide-react';
import { productsApi } from '@/api/products';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/types';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/Button';

export const POS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [showCartButton, setShowCartButton] = useState(false);

  const { items, addItem, removeItem, updateQuantity, getTotal } = useCartStore();

  useEffect(() => {
    if (items.length > 0) {
      setShowCartButton(true);
      setCartOpen(true);
    } else {
      setShowCartButton(false);
      setCartOpen(false);
    }
  }, [items.length]);

  const { data: products = [] } = useQuery({
    queryKey: ['products-pos'],
    queryFn: () => productsApi.getAll(true),
  });

  const filteredProducts = products.filter((p) =>
    [p.name, p.code, p.category].some((f) => f?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) addItem(product, 1);
  };

  const handleCheckout = () => {
    if (!items.length) return alert('El carrito está vacío');
    setShowPaymentModal(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Productos */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4 space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">Punto de Venta</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={product.stock === 0}
                className="group bg-white rounded-xl border p-3 text-left hover:shadow-sm transition overflow-hidden"
              >
                {/* Imagen del producto */}
                <div className="h-24 w-full bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <p className="text-[11px] text-gray-500 truncate font-mono">
                  {product.code}
                </p>

                <div className="mt-2 flex justify-between items-center">
                  <span className="font-semibold text-primary-600 text-sm">
                    {formatCurrency(product.sale_price)}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Stock {product.stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botón Ver Carrito */}
      {showCartButton && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-primary-600 text-white px-4 py-2 rounded-full shadow flex items-center gap-2 text-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          Carrito ({items.length})
        </button>
      )}

      {/* Overlay */}
      {cartOpen && (
        <div onClick={() => setCartOpen(false)} className="fixed inset-0 bg-black/30 z-40" />
      )}

      {/* Carrito */}
      <aside
        className={`fixed right-0 top-0 h-full w-[420px] bg-white z-50 transform transition-transform duration-300 flex flex-col ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">Carrito</h2>
          <button onClick={() => setCartOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de productos (scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Carrito vacío</p>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.product.code}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-2"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-primary-600">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer fijo abajo */}
        <div className="border-t p-4 space-y-3 flex-shrink-0">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(getTotal())}</span>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={!items.length}
            className="w-full py-3 text-sm"
          >
            Procesar pago
          </Button>
        </div>
      </aside>

      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
};
