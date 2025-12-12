import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Eye,
  X as XIcon,
  Download,
  FileText,
  ShoppingCart,
  AlertCircle,
  Receipt,
  DollarSign,
  Users,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import api from '@/api/axios';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/utils/format';

const salesApi = {
  getAll: async () => {
    const response = await api.get('/api/v1/pos/sales');
    return response.data;
  },
  cancel: async (id) => {
    const response = await api.post(`/api/v1/pos/sales/${id}/cancel`);
    return response.data;
  },
};

export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('12');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [filterType, setFilterType] = useState('TODOS');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: salesApi.getAll,
  });

  const annulMutation = useMutation({
    mutationFn: (id) => salesApi.cancel(id),
    onSuccess: () => {
      alert('✅ Venta anulada. Stock restaurado y balance ajustado.');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setShowDetailModal(false);
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      alert(`❌ Error: ${detail || 'No se pudo anular la venta'}`);
    },
  });

  const handleAnnul = (id) => {
    const confirmed = confirm(
      '⚠️ ¿Anular esta venta?\n\n• Se restaurará el stock\n• Se ajustarán los balances\n• NO se puede revertir'
    );
    if (!confirmed) return;
    annulMutation.mutate(id);
  };

  // Cálculos de estadísticas
  const stats = {
    totalVentas: sales.length,
    ingresos: sales
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + s.total_usd, 0),
    egresos: 500.00, // Mock - integrar con API
    porCobrar: sales
      .filter((s) => s.status === 'CREDITO' || s.status === 'PENDIENTE')
      .reduce((sum, s) => sum + s.balance_usd, 0),
    porPagar: 0.00,
  };

  // Filtrado de ventas
  const filteredSales = sales.filter((sale) => {
    // Filtro de búsqueda - por cliente
    const matchesSearch = 
      !searchTerm || 
      sale.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de fecha - mes y año
    const saleDate = new Date(sale.created_at);
    const saleMonth = String(saleDate.getMonth() + 1).padStart(2, '0');
    const saleYear = String(saleDate.getFullYear());
    const matchesDate = 
      saleMonth === selectedMonth && saleYear === selectedYear;

    // Filtro de estado - según tipo de filtro
    let matchesFilter = true;
    
    if (filterType === 'TODOS') {
      // Mostrar todas las ventas y movimientos
      matchesFilter = true;
    } else if (filterType === 'PAGADO') {
      // Ingresos: Ventas realizadas con éxito (PAGADO)
      matchesFilter = sale.status === 'PAGADO';
    } else if (filterType === 'ANULADO') {
      // Egresos: Gastos hechos (ANULADO = descuento/gasto)
      matchesFilter = sale.status === 'ANULADO';
    } else if (filterType === 'CREDITO') {
      // Por Cobrar: Cliente con saldo pendiente (CREDITO)
      matchesFilter = sale.status === 'CREDITO' && sale.balance_usd > 0;
    } else if (filterType === 'PENDIENTE') {
      // Por Pagar: Proveedores que nos acreditan (PENDIENTE = deuda con proveedor)
      matchesFilter = sale.status === 'PENDIENTE' && sale.balance_usd > 0;
    }

    return matchesSearch && matchesDate && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ventas y Movimientos</h1>
          <p className="text-gray-600 mt-1">Gestiona transacciones e ingresos/egresos</p>
        </div>
        <Button>
          <Download className="w-5 h-5 mr-2" />
          Descargar
        </Button>
      </div>

      {/* Cierre de Caja */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-6 border border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cierre de Caja
            </h2>
            <p className="text-sm text-primary-700 mt-1">Realiza el cierre diario del día</p>
          </div>
          <Button className="bg-primary-600 hover:bg-primary-700">
            Generar Cierre
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos"
          value={formatCurrency(stats.ingresos)}
          icon={TrendingUp}
          bgColor="bg-green-50"
          iconColor="text-green-600"
          borderColor="border-green-200"
        />
        <StatCard
          title="Egresos"
          value={formatCurrency(stats.egresos)}
          icon={TrendingDown}
          bgColor="bg-red-50"
          iconColor="text-red-600"
          borderColor="border-red-200"
        />
        <StatCard
          title="Por Cobrar"
          value={formatCurrency(stats.porCobrar)}
          icon={Users}
          bgColor="bg-orange-50"
          iconColor="text-orange-600"
          borderColor="border-orange-200"
        />
        <StatCard
          title="Por Pagar"
          value={formatCurrency(stats.porPagar)}
          icon={DollarSign}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-blue-200"
        />
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Mes, Año y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="TODOS">Todos</option>
                <option value="PAGADO">Pagado</option>
                <option value="CREDITO">Crédito</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilterType('TODOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all h-10 ${
            filterType === 'TODOS'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Todos
        </button>
        <button
          onClick={() => setFilterType('PAGADO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all h-10 ${
            filterType === 'PAGADO'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Ingresos
        </button>
        <button
          onClick={() => setFilterType('ANULADO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all h-10 ${
            filterType === 'ANULADO'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <TrendingDown className="w-5 h-5" />
          Egresos
        </button>
        <button
          onClick={() => setFilterType('CREDITO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all h-10 ${
            filterType === 'CREDITO'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <Users className="w-5 h-5" />
          Por Cobrar
        </button>
        <button
          onClick={() => setFilterType('PENDIENTE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all h-10 ${
            filterType === 'PENDIENTE'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Por Pagar
        </button>
      </div>

      {/* Transacciones Table */}
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
                    Monto
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
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-semibold text-primary-600">
                        {sale.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {sale.client_name || 'Público General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(sale.created_at).split(',')[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.total_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
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
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSale && (
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
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
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
                    <div key={detail.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
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
                <p className="text-sm font-medium text-gray-500 mb-2">Información de Pago</p>
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

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedSale.status !== 'ANULADO' && selectedSale.balance_usd > 0 && (
                  <Button className="flex-1">
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
                  onClick={() => setShowDetailModal(false)}
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
    </div>
  );
};

// StatCard Component
const StatCard = ({ title, value, icon: Icon, bgColor, iconColor, borderColor }) => (
  <Card padding="md" className={`${bgColor} border ${borderColor}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  </Card>
);
