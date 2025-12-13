// frontend/src/pages/SalesMovements.tsx
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Search,
  Eye,
  X as XIcon,
  FileText,
  AlertCircle,
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';

import api from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Sale, SaleStatus } from '@/types';


// ============================
// API
// ============================
const salesApi = {
  getAll: async (): Promise<Sale[]> => {
    const res = await api.get('/api/v1/pos/sales');
    return res.data;
  },
  cancel: async (id: number) => {
    const res = await api.post(`/api/v1/pos/sales/${id}/cancel`);
    return res.data;
  },
};


// ============================
// COMPONENTE PRINCIPAL
// ============================
export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: salesApi.getAll,
  });

  // =============================
  // MUTACIÓN PARA ANULAR
  // =============================
  const annulMutation = useMutation({
    mutationFn: (id: number) => salesApi.cancel(id),
    onSuccess: () => {
      alert('Venta anulada correctamente');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      alert(`Error: ${detail || 'No se pudo anular la venta'}`);
    },
  });

  const handleAnnul = (id: number) => {
    const ok = confirm('¿Seguro que deseas anular esta venta?');
    if (!ok) return;
    annulMutation.mutate(id);
  };


  // =============================
  // FILTROS
  // =============================
  const filteredSales = sales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      sale.code.toLowerCase().includes(term) ||
      sale.client_name?.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;

    const matchesMonth =
      selectedMonth === 'ALL' ||
      new Date(sale.created_at).getMonth() + 1 === Number(selectedMonth);

    const matchesYear =
      selectedYear === 'ALL' ||
      new Date(sale.created_at).getFullYear() === Number(selectedYear);

    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });


  // =============================
  // ESTADÍSTICAS
  // =============================
  const stats = {
    total: filteredSales.length,
    ingresos: filteredSales
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + s.total_usd, 0),
    cobrado: filteredSales.reduce((sum, s) => sum + s.paid_usd, 0),
    porCobrar: filteredSales
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + s.balance_usd, 0),
    anuladas: filteredSales.filter((s) => s.status === 'ANULADO').length,
  };


  return (
    <div className="p-6 space-y-6">

      {/* =================== HEADER =================== */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ventas y Movimientos</h1>
        <p className="text-gray-600 mt-1">Historial completo de ventas y balances financieros</p>
      </div>


      {/* =================== ESTADÍSTICAS =================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-gray-600">Ingresos Totales</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(stats.ingresos)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-gray-600">Cobrado</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.cobrado)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-gray-600">Por Cobrar</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats.porCobrar)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-sm text-gray-600">Anuladas</p>
          <p className="text-2xl font-bold text-red-600">{stats.anuladas}</p>
        </Card>
      </div>


      {/* =================== FILTROS =================== */}
      <Card>
        <div className="flex flex-col md:flex-row items-center gap-4">

          {/* Buscar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por código o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Estado */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SaleStatus | 'ALL')
            }
            className="px-4 py-2 border rounded-lg"
          >
            <option value="ALL">Todos</option>
            <option value="PAGADO">Pagado</option>
            <option value="CREDITO">Crédito</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ANULADO">Anulado</option>
          </select>

          {/* Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="ALL">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          {/* Año */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="ALL">Todos los años</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </Card>


      {/* =================== TABLA =================== */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Pagado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Pendiente</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono">{sale.code}</td>

                    <td className="px-6 py-4">
                      <p className="font-medium">{sale.client_name || "Público General"}</p>
                      {sale.client_phone && (
                        <p className="text-xs text-gray-500">{sale.client_phone}</p>
                      )}
                    </td>

                    <td className="px-6 py-4">{formatDateTime(sale.created_at)}</td>

                    <td className="px-6 py-4 text-right font-semibold">
                      {formatCurrency(sale.total_usd)}
                    </td>

                    <td className="px-6 py-4 text-right text-green-600">
                      {formatCurrency(sale.paid_usd)}
                    </td>

                    <td className="px-6 py-4 text-right text-orange-600">
                      {formatCurrency(sale.balance_usd)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
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

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </Card>
      )}


      {/* =================== MODAL DETALLE =================== */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="p-6 border-b flex justify-between bg-white sticky top-0">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedSale.code}</h2>
                  <p className="text-sm text-gray-600">{formatDateTime(selectedSale.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedSale.status !== "ANULADO" && (
                  <button
                    onClick={() => handleAnnul(selectedSale.id)}
                    disabled={annulMutation.isPending}
                    className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Anular Venta
                  </button>
                )}

                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">

              {selectedSale.status === 'ANULADO' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Venta Anulada</p>
                    <p className="text-sm text-red-700">
                      Stock restaurado y balance ajustado.
                    </p>
                  </div>
                </div>
              )}

              {/* Cliente */}
              <div>
                <h3 className="text-sm text-gray-500 mb-1">Cliente</h3>
                <p className="text-lg font-semibold">{selectedSale.client_name || "Público General"}</p>
                {selectedSale.client_phone && (
                  <p className="text-sm text-gray-600">{selectedSale.client_phone}</p>
                )}
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm text-gray-500 mb-1">Productos</h3>
                <div className="space-y-2">
                  {selectedSale.details.map((d) => (
                    <div key={d.id} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                      <div>
                        <p className="font-medium">{d.product_name}</p>
                        <p className="text-sm text-gray-600">
                          {d.quantity} × {formatCurrency(d.price_usd)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(d.subtotal_usd)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagos */}
              {selectedSale.payments.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-1">Pagos Registrados</h3>
                  <div className="space-y-2">
                    {selectedSale.payments.map((p, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                        <div>
                          <p className="font-medium">{p.method}</p>
                          {p.reference && <p className="text-sm text-gray-600">{p.reference}</p>}
                        </div>
                        <p className="font-semibold">{formatCurrency(p.amount_usd)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="border-t pt-4 space-y-2">
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

                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedSale.total_usd)}</span>
                </div>

                <div className="flex justify-between text-green-600">
                  <span>Pagado:</span>
                  <span className="font-semibold">{formatCurrency(selectedSale.paid_usd)}</span>
                </div>

                {selectedSale.balance_usd > 0 && (
                  <div className="flex justify-between text-orange-600 border-t pt-2">
                    <span>Pendiente:</span>
                    <span className="font-semibold">{formatCurrency(selectedSale.balance_usd)}</span>
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
