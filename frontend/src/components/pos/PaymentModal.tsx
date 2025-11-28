import { useState } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { PaymentMethod, Payment } from '@/types';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: CreditCard },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone },
  { value: 'DIVISAS', label: 'Divisas', icon: Banknote },
];

export const PaymentModal = ({ onClose, onSuccess }: PaymentModalProps) => {
  const { items, getTotal } = useCartStore();
  const { user } = useAuthStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('EFECTIVO');
  const [amount, setAmount] = useState(getTotal().toString());
  const [reference, setReference] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);

  const total = getTotal();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_usd, 0);
  const remaining = total - totalPaid;

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      alert('Venta registrada exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al procesar la venta');
    },
  });

  const handleAddPayment = () => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    if (amountNum > remaining) {
      alert(`El monto no puede exceder lo pendiente: ${formatCurrency(remaining)}`);
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

  const handleCompleteSale = () => {
    if (remaining > 0 && payments.length === 0) {
      alert('Debe registrar al menos un pago');
      return;
    }

    createSaleMutation.mutate({
      seller_id: user!.id,
      payment_method: payments.length > 1 ? 'MIXTO' : payments[0]?.method || 'EFECTIVO',
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payments: payments.length > 0 ? payments : [{
        method: selectedMethod,
        amount_usd: total,
      }],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
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
          {/* Total a Pagar */}
          <div className="bg-primary-50 rounded-xl p-6">
            <p className="text-sm text-primary-700 mb-1">Total a Pagar</p>
            <p className="text-4xl font-bold text-primary-900">
              {formatCurrency(total)}
            </p>
            {totalPaid > 0 && (
              <div className="mt-3 pt-3 border-t border-primary-200">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-700">Pagado:</span>
                  <span className="font-semibold">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-primary-700">Pendiente:</span>
                  <span className="font-semibold">{formatCurrency(remaining)}</span>
                </div>
              </div>
            )}
          </div>

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
                  <method.icon className={`w-6 h-6 mx-auto mb-2 ${
                    selectedMethod === method.value ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    selectedMethod === method.value ? 'text-primary-900' : 'text-gray-700'
                  }`}>
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
                Pagos Registrados
              </h3>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{payment.method}</p>
                      {payment.reference && (
                        <p className="text-sm text-gray-600">{payment.reference}</p>
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
            disabled={createSaleMutation.isPending}
          >
            {createSaleMutation.isPending ? 'Procesando...' : 'Finalizar Venta'}
          </Button>
        </div>
      </div>
    </div>
  );
};