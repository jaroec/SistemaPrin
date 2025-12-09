// frontend/src/pages/SalesMovements.tsx - VENTAS Y MOVIMIENTOS
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Search, FileText, Eye, X as XIcon, AlertCircle, Receipt } from 'lucide-react';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Sale, SaleStatus } from '@/types';

export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: salesApi.getAll,
  });

  // ✅ MUTACIÓN PARA ANULAR
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

  const stats = {
    ingresos: sales
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + s.total_usd, 0),
    cobrado: sales.reduce((sum, s) => sum + s.paid_usd, 0),
    porCobrar: sales
      .filter((s) => s.status === 'CREDITO' || s.status === 'PENDIENTE')
      .reduce((sum, s) => sum + s.balance_usd, 0),
    anuladas: sales.filter((s) => s.status === 'ANULADO').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ventas y Movimientos</h1>
        <p className="text-gray-600 mt-1">
          Historial de ventas, ingresos y movimientos financieros
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(stats.ingresos)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Cobrado</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.cobrado)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Por Cobrar</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats.porCobrar)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Anuladas</p>
          <p className="text-2xl font-bold text-red-600">{stats.anuladas}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por código o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SaleStatus | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PAGADO">Pagado</option>
            <option value="CREDITO">Crédito</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando ventas...</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Pendiente
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-semibold text-gray-900">
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

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(sale.created_at)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.total_usd)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-green-600">
                        {formatCurrency(sale.paid_usd)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-orange-600">
                        {formatCurrency(sale.balance_usd)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          sale.status === 'PAGADO'
                            ? 'bg-green-100 text-green-700'
                            : sale.status === 'CREDITO'
                            ? 'bg-orange-100 text-orange-700'
                            : sale.status === 'ANULADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ✅ MODAL DE DETALLE (SOLO VER Y ANULAR) */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSale.code}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDateTime(selectedSale.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* ✅ SOLO ANULAR (NO PAGAR) */}
                {selectedSale.status !== 'ANULADO' && (
                  <button
                    onClick={() => handleAnnul(selectedSale.id)}
                    disabled={annulMutation.isPending}
                    className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {annulMutation.isPending ? 'Anulando...' : 'Anular Venta'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* CONTENIDO */}
            <div className="p-6 space-y-6">
              {selectedSale.status === 'ANULADO' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-900">Venta Anulada</p>
                    <p className="text-sm text-red-700 mt-1">
                      Esta venta ha sido anulada. Stock restaurado y balances ajustados.
                    </p>
                  </div>
                </div>
              )}

              {/* Cliente */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedSale.client_name || 'Público General'}
                </p>
                {selectedSale.client_phone && (
                  <p className="text-sm text-gray-600">{selectedSale.client_phone}</p>
                )}
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Productos</h3>
                <div className="space-y-2">
                  {selectedSale.details.map((detail) => (
                    <div
                      key={detail.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
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

              {/* Pagos */}
              {selectedSale.payments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    Pagos Registrados
                  </h3>
                  <div className="space-y-2">
                    {selectedSale.payments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{payment.method}</p>
                          {payment.reference && (
                            <p className="text-sm text-gray-600">{payment.reference}</p>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount_usd)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal_usd)}</span>
                </div>

                {selectedSale.discount_usd > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedSale.discount_usd)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedSale.total_usd)}</span>
                </div>

                <div className="flex justify-between text-green-600">
                  <span>Pagado:</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedSale.paid_usd)}
                  </span>
                </div>

                {selectedSale.balance_usd > 0 && (
                  <div className="flex justify-between text-orange-600 pt-2 border-t border-gray-200">
                    <span>Por Cobrar:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedSale.balance_usd)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
