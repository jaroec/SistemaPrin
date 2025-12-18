import { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Banknote, User, Search, AlertCircle, TrendingUp, Building2, Wallet } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { PaymentMethod, Payment, Client } from '@/types';
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

const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get('/api/v1/clients');
    return response.data;
  },
};

// Bancos venezolanos
const venezuelanBanks = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0104', name: 'Banco Venezolano de Crédito' },
  { code: '0105', name: 'Mercantil' },
  { code: '0108', name: 'BBVA Provincial' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0134', name: 'Banesco' },
  { code: '0137', name: 'Sofitasa' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0146', name: 'Bangente' },
  { code: '0151', name: 'BFC' },
  { code: '0156', name: '100% Banco' },
  { code: '0157', name: 'DelSur' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0169', name: 'Mi Banco' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0173', name: 'Banco Internacional' },
  { code: '0174', name: 'Banplus' },
  { code: '0175', name: 'Banco Bicentenario' },
  { code: '0177', name: 'Banco de la Fuerza Armada' },
  { code: '0191', name: 'Banco Nacional de Crédito' },
];

// Plataformas digitales para divisas
const digitalPlatforms = [
  { code: 'BINANCE', name: 'Binance' },
  { code: 'ZINLI', name: 'Zinli' },
  { code: 'WALLY', name: 'Wally' },
  { code: 'ZELLE', name: 'Zelle' },
  { code: 'PAYPAL', name: 'PayPal' },
  { code: 'RESERVE', name: 'Reserve' },
  { code: 'AIRTM', name: 'AirTM' },
  { code: 'UPHOLD', name: 'Uphold' },
];

// Métodos de pago principales
const paymentMethods = [
  { value: 'EFECTIVO', label: 'Efectivo Bs', icon: DollarSign, color: 'green' },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: Building2, color: 'blue' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone, color: 'purple' },
  { value: 'TARJETA', label: 'Tarjeta', icon: CreditCard, color: 'indigo' },
  { value: 'DIVISAS', label: 'Divisas', icon: Banknote, color: 'emerald' },
  { value: 'CREDITO', label: 'Crédito', icon: User, color: 'orange' },
];

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal = ({ onClose, onSuccess }: PaymentModalProps) => {
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  // Estados del formulario
  const [amountVES, setAmountVES] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [reference, setReference] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [cardType, setCardType] = useState<'DEBITO' | 'CREDITO'>('DEBITO');
  const [divisasType, setDivisasType] = useState<'EFECTIVO' | 'DIGITAL'>('EFECTIVO');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  // Estados para cliente
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener tasa de cambio
  const { data: exchangeRate } = useQuery({
    queryKey: ['exchange-rate-today'],
    queryFn: exchangeRateApi.getToday,
  });

  // Obtener clientes
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-payment'],
    queryFn: clientsApi.getAll,
  });

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

  const total = getTotal();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_usd, 0);
  const remaining = total - totalPaid;
  const rate = exchangeRate?.rate || 1;
  const totalVES = total * rate;
  const totalPaidVES = totalPaid * rate;
  const remainingVES = remaining * rate;

  // Convertir VES a USD automáticamente
  useEffect(() => {
    if (amountVES && selectedMethod !== 'EFECTIVO' && selectedMethod !== 'DIVISAS' && rate > 0) {
      const ves = parseFloat(amountVES);
      if (!isNaN(ves)) {
        setAmountUSD((ves / rate).toFixed(2));
      }
    }
  }, [amountVES, selectedMethod, rate]);

  // Limpiar formulario al cambiar método
  useEffect(() => {
    setAmountVES('');
    setAmountUSD('');
    setReference('');
    setSelectedBank('');
    setSelectedPlatform('');
    setError('');
  }, [selectedMethod]);

  const handleAddPayment = () => {
    setError('');

    // Validaciones según método
    if (selectedMethod === 'EFECTIVO') {
      const ves = parseFloat(amountVES);
      if (isNaN(ves) || ves <= 0) {
        setError('Ingrese un monto válido en Bs');
        return;
      }
      const usd = ves / rate;
      if (usd > remaining) {
        setError(`El monto excede lo pendiente: ${formatCurrency(remaining)}`);
        return;
      }
      setPayments([...payments, {
        method: 'EFECTIVO' as PaymentMethod,
        amount_usd: usd,
        exchange_rate: rate,
        amount_secondary: ves,
      }]);
    }

    else if (selectedMethod === 'TRANSFERENCIA' || selectedMethod === 'PAGO_MOVIL') {
      const ves = parseFloat(amountVES);
      const usd = parseFloat(amountUSD);
      if (isNaN(ves) || ves <= 0) {
        setError('Ingrese un monto válido en Bs');
        return;
      }
      if (!reference.trim()) {
        setError('La referencia es obligatoria');
        return;
      }
      if (!selectedBank) {
        setError('Seleccione el banco receptor');
        return;
      }
      if (usd > remaining) {
        setError(`El monto excede lo pendiente: ${formatCurrency(remaining)}`);
        return;
      }
      const bank = venezuelanBanks.find(b => b.code === selectedBank);
      setPayments([...payments, {
        method: selectedMethod as PaymentMethod,
        amount_usd: usd,
        amount_secondary: ves,
        reference: `${reference} - ${bank?.name || ''}`,
        exchange_rate: rate,
      }]);
    }

    else if (selectedMethod === 'TARJETA') {
      const ves = parseFloat(amountVES);
      const usd = parseFloat(amountUSD);
      if (isNaN(ves) || ves <= 0) {
        setError('Ingrese un monto válido en Bs');
        return;
      }
      if (!reference.trim()) {
        setError('La referencia es obligatoria');
        return;
      }
      if (!selectedBank) {
        setError('Seleccione el banco receptor');
        return;
      }
      if (usd > remaining) {
        setError(`El monto excede lo pendiente: ${formatCurrency(remaining)}`);
        return;
      }
      const bank = venezuelanBanks.find(b => b.code === selectedBank);
      setPayments([...payments, {
        method: 'TARJETA' as PaymentMethod,
        amount_usd: usd,
        amount_secondary: ves,
        reference: `${cardType} - ${reference} - ${bank?.name || ''}`,
        exchange_rate: rate,
      }]);
    }

    else if (selectedMethod === 'DIVISAS') {
      const usd = parseFloat(amountUSD);
      if (isNaN(usd) || usd <= 0) {
        setError('Ingrese un monto válido en USD');
        return;
      }
      if (usd > remaining) {
        setError(`El monto excede lo pendiente: ${formatCurrency(remaining)}`);
        return;
      }
      if (divisasType === 'DIGITAL' && !selectedPlatform) {
        setError('Seleccione la plataforma digital');
        return;
      }
      const platform = digitalPlatforms.find(p => p.code === selectedPlatform);
      setPayments([...payments, {
        method: 'DIVISAS' as PaymentMethod,
        amount_usd: usd,
        reference: divisasType === 'DIGITAL' ? platform?.name : 'EFECTIVO',
        exchange_rate: rate,
        amount_secondary: usd * rate,
      }]);
    }

    else if (selectedMethod === 'CREDITO') {
      if (!selectedClient) {
        setError('Debe seleccionar un cliente');
        return;
      }
      const availableCredit = (selectedClient.credit_limit || 0) - selectedClient.balance;
      if (remaining > availableCredit) {
        setError(`Crédito disponible insuficiente: ${formatCurrency(availableCredit)}`);
        return;
      }
      setPayments([...payments, {
        method: 'CREDITO' as PaymentMethod,
        amount_usd: remaining,
      }]);
    }

    // Limpiar formulario
    setSelectedMethod('');
    setAmountVES('');
    setAmountUSD('');
    setReference('');
    setSelectedBank('');
    setSelectedPlatform('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchTerm('');
  };

  const handleCompleteSale = () => {
    setError('');

    if (payments.length === 0) {
      setError('Debe registrar al menos un pago');
      return;
    }

    const hasCreditPayment = payments.some((p) => p.method === 'CREDITO');
    if (hasCreditPayment && !selectedClient) {
      setError('⚠️ Cliente requerido para venta con CRÉDITO');
      return;
    }

    if (Math.abs(totalPaid - total) > 0.01) {
      setError(`El total de pagos (${formatCurrency(totalPaid)}) no coincide con el total (${formatCurrency(total)})`);
      return;
    }

    createSaleMutation.mutate({
      seller_id: user!.id,
      payment_method: payments.length > 1 ? 'MIXTO' : (payments[0]?.method || 'EFECTIVO') as PaymentMethod,
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payments: payments,
      client_id: selectedClient?.id,
    });
  };

  const filteredClients = allClients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPaymentForm = () => {
    if (!selectedMethod) return null;

    return (
      <div className="space-y-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
        {/* EFECTIVO */}
        {selectedMethod === 'EFECTIVO' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad en Bolívares
              </label>
              <input
                type="number"
                step="0.01"
                value={amountVES}
                onChange={(e) => setAmountVES(e.target.value)}
                placeholder="0.00 Bs"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
              {amountVES && rate > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  ≈ ${formatCurrency(parseFloat(amountVES) / rate)} USD
                </p>
              )}
            </div>
          </>
        )}

        {/* TRANSFERENCIA */}
        {selectedMethod === 'TRANSFERENCIA' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto en Bolívares
              </label>
              <input
                type="number"
                step="0.01"
                value={amountVES}
                onChange={(e) => setAmountVES(e.target.value)}
                placeholder="0.00 Bs"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {amountUSD && (
                <p className="text-sm text-gray-600 mt-2">
                  ≈ ${formatCurrency(parseFloat(amountUSD))} USD
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco Receptor
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione un banco</option>
                {venezuelanBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.code} - {bank.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* PAGO MÓVIL */}
        {selectedMethod === 'PAGO_MOVIL' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto en Bolívares
              </label>
              <input
                type="number"
                step="0.01"
                value={amountVES}
                onChange={(e) => setAmountVES(e.target.value)}
                placeholder="0.00 Bs"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              {amountUSD && (
                <p className="text-sm text-gray-600 mt-2">
                  ≈ ${formatCurrency(parseFloat(amountUSD))} USD
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco Receptor
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Seleccione un banco</option>
                {venezuelanBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.code} - {bank.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* TARJETA */}
        {selectedMethod === 'TARJETA' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Tarjeta
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCardType('DEBITO')}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    cardType === 'DEBITO'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Débito
                </button>
                <button
                  onClick={() => setCardType('CREDITO')}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    cardType === 'CREDITO'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Crédito
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto en Bolívares
              </label>
              <input
                type="number"
                step="0.01"
                value={amountVES}
                onChange={(e) => setAmountVES(e.target.value)}
                placeholder="0.00 Bs"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {amountUSD && (
                <p className="text-sm text-gray-600 mt-2">
                  ≈ ${formatCurrency(parseFloat(amountUSD))} USD
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco Receptor
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Seleccione un banco</option>
                {venezuelanBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.code} - {bank.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* DIVISAS */}
        {selectedMethod === 'DIVISAS' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDivisasType('EFECTIVO')}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    divisasType === 'EFECTIVO'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setDivisasType('DIGITAL')}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    divisasType === 'DIGITAL'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Digital
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto en USD
              </label>
              <input
                type="number"
                step="0.01"
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                placeholder="0.00 USD"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
            </div>
            {divisasType === 'DIGITAL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma Digital
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Seleccione una plataforma</option>
                  {digitalPlatforms.map((platform) => (
                    <option key={platform.code} value={platform.code}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* CRÉDITO */}
        {selectedMethod === 'CREDITO' && (
          <>
            {selectedClient ? (
              <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-orange-900">{selectedClient.name}</p>
                      {selectedClient.phone && (
                        <p className="text-sm text-orange-700">{selectedClient.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setSearchTerm('');
                    }}
                    className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-orange-700" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-orange-200">
                  <div>
                    <p className="text-xs text-orange-700 mb-1">Balance Actual</p>
                    <p className="font-semibold text-orange-900">
                      ${formatCurrency(selectedClient.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 mb-1">Crédito Disponible</p>
                    <p className="font-semibold text-green-600">
                      ${formatCurrency((selectedClient.credit_limit || 0) - selectedClient.balance)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-sm text-orange-700 mb-1">Monto a Crédito</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ${formatCurrency(remaining)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                {searchTerm && (
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <div className="flex gap-2 mt-1 text-xs text-gray-600">
                            {client.phone && <span>{client.phone}</span>}
                            {client.email && (
                              <>
                                <span>•</span>
                                <span>{client.email}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            <span className="text-gray-600">
                              Balance: <span className="font-semibold">${formatCurrency(client.balance)}</span>
                            </span>
                            <span className="text-green-600">
                              Disponible: <span className="font-semibold">${formatCurrency((client.credit_limit || 0) - client.balance)}</span>
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
          </>
        )}

        <Button
          onClick={handleAddPayment}
          variant="secondary"
          className="w-full"
        >
          Agregar Pago
        </Button>
      </div>
    );
  };

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
          <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl">
            <p className="text-sm text-primary-700 mb-2 font-medium">Total a Pagar</p>
            <p className="text-4xl font-bold text-primary-900">{formatCurrency(total)}</p>
            {exchangeRate && (
              <>
                <p className="text-lg text-primary-700 mt-2">≈ {formatCurrency(totalVES)} Bs</p>
                <p className="text-xs text-primary-600 mt-2">
                  Tasa: 1 USD = {exchangeRate.rate.toFixed(2)} Bs
                </p>
              </>
            )}
          </div>

          {/* Estado de Pagos */}
          {payments.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 mb-1">Pagado</p>
                <p className="font-bold text-green-600 text-xl">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-green-600 mt-1">{formatCurrency(totalPaidVES)} Bs</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-700 mb-1">Pendiente</p>
                <p className="font-bold text-orange-600 text-xl">{formatCurrency(Math.max(0, remaining))}</p>
                <p className="text-sm text-orange-600 mt-1">{formatCurrency(Math.max(0, remainingVES))} Bs</p>
              </div>
            </div>
          )}

          {/* Selección de Método de Pago */}
          {remaining > 0.01 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Seleccionar Método de Pago
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setSelectedMethod(method.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            isSelected ? 'text-primary-600' : 'text-gray-400'
                          }`}
                        />
                        <p
                          className={`text-sm font-medium ${
                            isSelected ? 'text-primary-900' : 'text-gray-700'
                          }`}
                        >
                          {method.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulario dinámico según método */}
              {renderPaymentForm()}
            </>
          )}

          {/* Lista de Pagos Registrados */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Pagos Registrados ({payments.length})
              </h3>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{payment.method}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-2">
                          {formatCurrency(payment.amount_usd)}
                        </p>
                        {payment.amount_secondary && (
                          <p className="text-sm text-gray-600">
                            ≈ {formatCurrency(payment.amount_secondary)} Bs
                          </p>
                        )}
                        {payment.reference && (
                          <p className="text-sm text-gray-600 mt-1">
                            {payment.reference}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
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
            disabled={createSaleMutation.isPending || payments.length === 0 || remaining > 0.01}
          >
            {createSaleMutation.isPending 
              ? 'Procesando...' 
              : remaining > 0.01 
                ? `Falta: ${formatCurrency(remaining)}`
                : 'Finalizar Venta'
            }
          </Button>
        </div>
      </div>
    </div>
  );
};
