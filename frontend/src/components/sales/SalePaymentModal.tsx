// src/components/sales/SalePaymentModal.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, DollarSign, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { salesApi } from '@/api/sales';
import { Sale, PaymentMethod, Payment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';

interface SalePaymentModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: CreditCard },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone },
  { value: 'DIVISAS', label: 'Divisas', icon: Banknote },
];

export const SalePaymentModal = ({ sale, onClose, onSuccess }: SalePaymentModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('EFECTIVO');
  const [amount, setAmount] = useState(sale.balance_usd.toString());
  const [reference, setReference] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  const remaining = sale.balance_usd - payments.reduce((sum, p) => sum + p.amount_usd, 0);

  // ✅ MUTACIÓN PARA PAGAR
  const paymentMutation = useMutation({
    mutationFn: (paymentsData: Payment[]) => salesApi.addPayment(sale.id, paymentsData),
    onSuccess: () => {
      alert('Pago registrado exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      setError(detail || 'Error al registrar el pago');
    },
  });

  const handleAddPayment = () => {
    setError('');

    const amountNum = parseFloat(amount);

    // Validaciones
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingrese un monto válido');
      return;
    }

    if (amountNum > remaining) {
      setError(
        `El monto no puede exceder el saldo restante: ${formatCurrency(remaining)}`
      );
      return;
    }

    // Agregar pago a la lista
    setPayments([
      ...payments,
      {
        method: selectedMethod,
        amount_usd: amountNum,
        reference: reference || undefined,
      },
    ]);

    // Limpiar inputs
    setAmount(remaining > amountNum ? (remaining - amountNum).toFixed(2) : '');
    setReference('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompletePayment = () => {
    setError('');

    if (payments.length === 0) {
      setError('Debe registrar al menos un pago');
      return;
    }

    if (remaining > 0.01) {
      // Permitir pequeños errores de redondeo (0.01)
      setError(
        `Saldo pendiente: ${formatCurrency(remaining)}. Complete el pago o cancele.`
      );
      return;
    }

    // Ejecutar mutación
    paymentMutation.mutate(payments);
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount_usd, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registrar Pago</h2>
            <p className="text-sm text-gray-600 mt-1">Venta: {sale.code}</p>
          </div>
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Información de la venta */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Total de la venta:</span>
              <span className="font-semibold">{formatCurrency(sale.total_usd)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Pagado anteriormente:</span>
              <span className="font-semibold">{formatCurrency(sale.paid_usd)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
              <span>Saldo pendiente:</span>
              <span className="text-orange-600">{formatCurrency(sale.balance_usd)}</span>
            </div>
          </div>

          {/* Método de pago */}
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
                      selectedMethod === method.value
                        ? 'text-primary-600'
                        : 'text-gray-400'
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

          {/* Monto y referencia */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto a pagar"
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

          {/* Lista de pagos a registrar */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Pagos a Registrar ({payments.length})
              </h3>
              <div className="space-y-2 mb-4">
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
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
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen de pagos */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Total a pagar:</span>
                  <span className="font-semibold">{formatCurrency(totalPayments)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Aún falta:</span>
                  <span className={remaining > 0.01 ? 'text-orange-600' : 'text-green-600'}>
                    {formatCurrency(Math.max(0, remaining))}
                  </span>
                </div>
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
            onClick={handleCompletePayment}
            className="flex-1"
            disabled={
              paymentMutation.isPending || payments.length === 0 || remaining > 0.01
            }
          >
            {paymentMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </div>
      </div>
    </div>
  );
};
