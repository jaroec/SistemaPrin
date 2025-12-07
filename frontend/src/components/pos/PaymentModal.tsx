import { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Banknote, User, Search, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { PaymentMethod, Payment, Client } from '@/types';
import api from '@/api/axios';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: CreditCard },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone },
  { value: 'DIVISAS', label: 'Divisas', icon: Banknote },
  { value: 'CREDITO', label: 'Crédito', icon: User },
];

const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get('/api/v1/clients');
    return response.data;
  },
};

export const PaymentModal = ({ onClose, onSuccess }: PaymentModalProps) => {
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('EFECTIVO');
  const [amount, setAmount] = useState(getTotal().toString());
  const [reference, setReference] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  
  // ✅ Estados para CRÉDITO
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);

  // Obtener clientes
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-payment'],
    queryFn: clientsApi.getAll,
  });

  const total = getTotal();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_usd, 0);
  const remaining = total - totalPaid;
  
  // ✅ NUEVO: Calcular monto en crédito
  const creditAmount = payments
    .filter(p => p.method === 'CREDITO')
    .reduce((sum, p) => sum + p.amount_usd, 0);

  // ✅ Mostrar búsqueda de cliente SOLO si es CRÉDITO
  useEffect(() => {
    if (selectedMethod === 'CREDITO') {
      setShowClientSearch(true);
    } else {
      setShowClientSearch(false);
      setSelectedClient(null);
      setSearchTerm('');
    }
  }, [selectedMethod]);

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      alert('✅ Venta registrada exitosamente');
      clearCart();
      onSuccess();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail || 'Error al procesar la venta';
      setError(detail);
    },
  });

  const handleAddPayment = () => {
    setError('');
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingrese un monto válido');
      return;
    }

    if (amountNum > remaining) {
      setError(`El monto no puede exceder lo pendiente: ${formatCurrency(remaining)}`);
      return;
    }

    // ✅ Si es CRÉDITO, OBLIGAR a seleccionar cliente
    if (selectedMethod === 'CREDITO' && !selectedClient) {
      setError('⚠️ Debe seleccionar un cliente para venta a CRÉDITO');
      return;
    }

    setPayments([
      ...payments,
      {
        method: selectedMethod,
        amount_usd: amountNum,
        reference: reference || undefined,
      },
    ]);

    setAmount(remaining > amountNum ? (remaining - amountNum).toFixed(2) : '');
    setReference('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientSearch(false);
    setSearchTerm('');
  };

  const handleCompleteSale = () => {
    setError('');

    // ✅ Validar que haya pagos
    if (payments.length === 0) {
      setError('Debe registrar al menos un pago');
      return;
    }

    // ✅ Si hay CRÉDITO en los pagos, VALIDAR cliente
    const hasCreditPayment = payments.some(p => p.method === 'CREDITO');
    if (hasCreditPayment && !selectedClient) {
      setError('⚠️ Cliente requerido para venta con CRÉDITO');
      return;
    }

    // ✅ Crear la venta con cliente si es CRÉDITO
    createSaleMutation.mutate({
      seller_id: user!.id,
      payment_method: payments.length > 1 ? 'MIXTO' : (payments[0]?.method || 'EFECTIVO') as PaymentMethod,
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payments: payments,
      client_id: selectedClient?.id, // ✅ ENVIAR CLIENTE SI ESTÁ SELECCIONADO
    });
  };

  const filteredClients = allClients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Procesar Pago</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Mensaje de error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Total a Pagar */}
          <div className="bg-primary-50 rounded-xl p-6">
            <p className="text-sm text-primary-700 mb-1">Total a Pagar</p>
            <p className="text-4xl font-bold text-primary-900">
              {formatCurrency(total)}
            </p>
            {totalPaid > 0 && (
              <div className="mt-3 pt-3 border-t border-primary-200 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-700">Pagado:</span>
                  <span className="font-semibold">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-700">Pendiente:</span>
                  <span className="font-semibold">{formatCurrency(remaining)}</span>
                </div>
                {creditAmount > 0 && (
                  <div className="flex justify-between text-sm pt-1 border-t border-primary-200 mt-1">
                    <span className="text-orange-700 font-medium">A Crédito del Cliente:</span>
                    <span className="font-bold text-orange-700">{formatCurrency(creditAmount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ✅ SELECTOR DE CLIENTE - SOLO CUANDO ES CRÉDITO */}
          {showClientSearch && (
            <div className="space-y-3 border-2 border-orange-200 bg-orange-50 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-semibold text-orange-900">
                  Seleccionar Cliente (Requerido para Crédito)
                </h3>
              </div>
              <p className="text-xs text-orange-700">
                El monto en crédito se asignará al saldo del cliente
              </p>
              
              {selectedClient ? (
                <div className="p-4 border-2 border-primary-300 bg-primary-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary-900">{selectedClient.name}</p>
                      {selectedClient.phone && (
                        <p className="text-sm text-primary-700">{selectedClient.phone}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        Saldo actual: <span className="font-semibold">${selectedClient.balance.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setSearchTerm('');
                    }}
                    className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-primary-700" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente por nombre, email o teléfono..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  
                  {searchTerm && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <p className="font-medium text-gray-900">{c.name}</p>
                            <div className="flex gap-3 mt-1 text-xs text-gray-600">
                              {c.phone && <span>{c.phone}</span>}
                              {c.email && (
                                <>
                                  <span>•</span>
                                  <span>{c.email}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-gray-600">Saldo:</span>
                              <span className={`text-xs font-semibold ${
                                c.balance > 0 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                ${c.balance.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No se encontraron clientes
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selección de Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setSelectedMethod(method.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === method.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon
                    className={`w-6 h-6 mx-auto mb-2 ${
                      selectedMethod === method.value ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      selectedMethod === method.value
                        ? 'text-primary-900'
                        : 'text-gray-700'
                    }`}
                  >
                    {method.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Referencia (opcional)"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ref-123456"
            />
          </div>

          <Button
            onClick={handleAddPayment}
            variant="secondary"
            className="w-full"
            disabled={remaining <= 0}
          >
            Agregar Pago
          </Button>

          {/* Lista de Pagos */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Pagos Registrados ({payments.length})
              </h3>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      payment.method === 'CREDITO'
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{payment.method}</p>
                      {payment.reference && (
                        <p className="text-sm text-gray-600">{payment.reference}</p>
                      )}
                      {payment.method === 'CREDITO' && selectedClient && (
                        <p className="text-xs text-orange-700 mt-1">
                          Se asignará a: <span className="font-semibold">{selectedClient.name}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount_usd)}
                      </span>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteSale}
            className="flex-1"
            disabled={createSaleMutation.isPending || payments.length === 0}
          >
            {createSaleMutation.isPending ? 'Procesando...' : 'Finalizar Venta'}
          </Button>
        </div>
      </div>
    </div>
  );
};
