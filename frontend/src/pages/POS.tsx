import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/types';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { Cart } from '@/components/pos/Cart';
import { ClientSelector } from '@/components/pos/ClientSelector';
import { PaymentModal } from '@/components/pos/PaymentModal';

export const POS = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { addItem, clearCart } = useCartStore();

  const handleProductSelect = (product: Product) => {
    addItem(product, 1);
  };

  const handleCheckout = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    clearCart();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Panel Principal - Búsqueda */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Punto de Venta</h1>
          <p className="text-gray-600">Busca y agrega productos al carrito</p>
        </div>

        {/* Cliente Selector */}
        <div className="mb-6">
          <ClientSelector />
        </div>

        {/* Búsqueda de Productos */}
        <div className="mb-6">
          <ProductSearch onProductSelect={handleProductSelect} />
        </div>

        {/* Espacio vacío */}
        <div className="flex-1" />
      </div>

      {/* Panel Lateral - Carrito */}
      <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-xl">
        <Cart onCheckout={handleCheckout} />
      </div>

      {/* Modal de Pago */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
