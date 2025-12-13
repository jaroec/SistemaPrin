import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, ShoppingCart, User } from 'lucide-react';
import { productsApi } from '@/api/products';
import { useCartStore } from '@/store/cartStore';
import { Product, Client } from '@/types';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { formatCurrency } from '@/utils/format';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/api/axios';

const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get('/api/v1/clients');
    return response.data;
  },
};

export const POS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    getTotal, 
    client,
    setClient 
  } = useCartStore();

  // Obtener productos
  const { data: products = [] } = useQuery({
    queryKey: ['products-pos'],
    queryFn: () => productsApi.getAll(true),
  });

  // Obtener clientes
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-pos'],
    queryFn: clientsApi.getAll,
  });

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar clientes
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      addItem(product, 1);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    alert('✅ Venta registrada exitosamente');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Panel Izquierdo - Productos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Punto de Venta</h1>
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos por nombre, código o categoría..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={product.stock === 0}
                className={`bg-white rounded-xl p-4 border-2 transition-all text-left ${
                  product.stock === 0
                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-primary-500 hover:shadow-md'
                }`}
              >
                {/* Imagen Placeholder */}
                <div className="w-full aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400" />
                </div>

                {/* Info del Producto */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2 font-mono">{product.code}</p>
                  
                  {product.category && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mb-2">
                      {product.category}
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(product.sale_price)}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        product.stock <= product.min_stock
                          ? 'text-orange-600'
                          : 'text-gray-600'
                      }`}
                    >
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho - Carrito */}
      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-xl">
        {/* Header Carrito */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Carrito</h2>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Selector de Cliente */}
          {client ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-semibold text-primary-900">{client.name}</p>
                  <p className="text-xs text-primary-700">
                    Saldo: {formatCurrency(client.balance)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClient(null)}
                className="text-primary-600 hover:text-primary-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClientSelector(!showClientSelector)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-primary-700"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Seleccionar Cliente (Opcional)</span>
            </button>
          )}

          {/* Dropdown de Clientes */}
          {showClientSelector && !client && (
            <div className="mt-2 border border-gray-200 rounded-lg">
              <div className="p-2">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClient(c);
                      setShowClientSelector(false);
                      setClientSearch('');
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-600">
                      Saldo: {formatCurrency(c.balance)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Carrito vacío</p>
              <p className="text-sm text-gray-400 mt-2">
                Selecciona productos para comenzar
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-gray-600 font-mono">{item.product.code}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 font-semibold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-2 hover:bg-gray-100 rounded-r-lg disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Precio */}
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {formatCurrency(item.product.sale_price)} × {item.quantity}
                    </p>
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer - Total y Botón */}
        <div className="p-6 border-t border-gray-200 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Artículos:</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-gray-900">
              <span>Total:</span>
              <span className="text-primary-600">{formatCurrency(getTotal())}</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            className="w-full py-4 text-lg"
            disabled={items.length === 0}
          >
            Procesar Pago
          </Button>
        </div>
      </div>

      {/* Modal de Pago */}
      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} />
      )}
    </div>
  );
};
