// frontend/src/pages/Sales.tsx - VERSIÓN MEJORADA CON ESTILO GRAFICO
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Eye,
  X as XIcon,
  AlertCircle,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Filter,
  Trash2,
} from 'lucide-react';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { SalePaymentModal } from '@/components/sales/SalePaymentModal';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Sale, SaleStatus } from '@/types';

export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: salesApi.getAll,
  });

  const annulMutation = useMutation({
    mutationFn: (id: number) => salesApi.cancel(id),
    onSuccess: () => {
      alert('✅ Venta anulada. Stock restaurado y balance ajustado.');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      alert(`❌ Error: ${detail || 'No se pudo anular la venta'}`);
    },
  });

  const handleAnnul = (id: number) => {
    const confirmed = confirm(
      '⚠️ ¿Anular esta venta?\n\n• Se restaurará el stock\n• Se ajustarán los balances\n• NO se puede revertir'
    );
    if (!confirmed) return;
    annulMutation.mutate(id);
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Estadísticas
  const stats = {
    totalVentas: sales.length,
    ingresos: sales
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + s.total_usd, 0),
    cobrado: sales.reduce((sum, s) => sum + s.paid_usd, 0),
    porCobrar: sales
      .filter((s) => s.status === 'CREDITO' || s.status === 'PENDIENTE')
      .reduce((sum, s) => sum + s.balance_usd, 0),
  };

  const statusOptions = [
    { value: 'ALL' as const, label: 'Todos', color: 'bg-gray-100 text-gray-700' },
    { value: 'PAGADO' as const, label: 'Pagado', color: 'bg-green-100 text-green-700' },
    { value: 'CREDITO' as const, label: 'Crédito', color: 'bg-orange-100 text-orange-700' },
    { value: 'PENDIENTE' as const, label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'ANULADO' as const, label: 'Anulado', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ventas y Movimientos</h1>
          <p className="text-gray-600 mt-1">Historial de ventas e ingresos del negocio</p>
        </div>
        <Button>
          <Download className="w-5 h-5 mr-2" />
          Descargar Reporte
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Ventas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalVentas}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Ingresos Totales */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.ingresos)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Cobrado */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Efectivo Cobrado</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(stats.cobrado)}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        {/* Por Cobrar */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Por Cobrar</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.porCobrar)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          {/* Barra Superior */}
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por código, cliente o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Filtro de Estado */}
          {showFilters && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Estado de Venta</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      statusFilter === option.value
                        ? `${option.color} ring-2 ring-offset-2 ring-primary-500`
                        : `${option.color} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tabla de Ventas */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando ventas...</p>
          </div>
        </Card>
      ) : filteredSales.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron ventas</p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Código
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Pagado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Pendiente
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-semibold text-primary-600">
                        {sale.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sale.client_name || 'Público General'}
                        </p>
                        {sale.client_phone && (
                          <p className="text-xs text-gray-500">{sale.client_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(sale.created_at).split(',')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.total_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(sale.paid_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-semibold ${
                          sale.balance_usd > 0 ? 'text-orange-600' : 'text-gray-400'
                        }`}
                      >
                        {formatCurrency(sale.balance_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          sale.status === 'PAGADO'
                            ? 'bg-green-100 text-green-700'
                            : sale.status === 'CREDITO'
                            ? 'bg-orange-100 text-orange-700'
                            : sale.status === 'ANULADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Detalles */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSale.code}</h2>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(selectedSale.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {selectedSale.status === 'ANULADO' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    <strong>Venta Anulada:</strong> Stock y balances han sido restaurados.
                  </p>
                </div>
              )}

              {/* Cliente */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Cliente</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedSale.client_name || 'Público General'}
                </p>
              </div>

              {/* Productos */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">Productos</p>
                <div className="space-y-2">
                  {selectedSale.details.map((detail) => (
                    <div
                      key={detail.id}
                      className="flex justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{detail.product_name}</p>
                        <p className="text-sm text-gray-600">
                          {detail.quantity} × {formatCurrency(detail.price_usd)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(detail.subtotal_usd)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(selectedSale.subtotal_usd)}</span>
                </div>
                {selectedSale.discount_usd > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(selectedSale.discount_usd)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-primary-600">{formatCurrency(selectedSale.total_usd)}</span>
                </div>
              </div>

              {/* Pagos */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-500">Información de Pago</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-green-700 font-medium">Pagado:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(selectedSale.paid_usd)}
                    </span>
                  </div>
                  {selectedSale.balance_usd > 0 && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700 font-medium">Por Cobrar:</span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(selectedSale.balance_usd)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagos Registrados */}
              {selectedSale.payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Métodos de Pago</p>
                  <div className="space-y-2">
                    {selectedSale.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{payment.method}</p>
                          {payment.reference && (
                            <p className="text-xs text-gray-600">{payment.reference}</p>
                          )}
                        </div>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(payment.amount_usd)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedSale.status !== 'ANULADO' && selectedSale.balance_usd > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedSale(null);
                      setSelectedSaleForPayment(selectedSale);
                    }}
                    className="flex-1"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Abonar
                  </Button>
                )}

                {selectedSale.status !== 'ANULADO' && (
                  <Button
                    onClick={() => handleAnnul(selectedSale.id)}
                    variant="danger"
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Anular
                  </Button>
                )}

                <Button
                  onClick={() => setSelectedSale(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago */}
      {selectedSaleForPayment && (
        <SalePaymentModal
          sale={selectedSaleForPayment}
          onClose={() => setSelectedSaleForPayment(null)}
          onSuccess={() => {
            setSelectedSaleForPayment(null);
            queryClient.invalidateQueries({ queryKey: ['sales'] });
          }}
        />
      )}
    </div>
  );
};
