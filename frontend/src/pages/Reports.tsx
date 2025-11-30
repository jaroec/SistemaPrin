import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Calendar,
} from 'lucide-react';
import api from '@/api/axios';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';

// API para reportes
const reportsApi = {
  getTopSelling: async (params: any) => {
    const response = await api.get('/api/v1/reports/products/top-selling', {
      params,
    });
    return response.data;
  },
  getSellerPerformance: async (params: any) => {
    const response = await api.get('/api/v1/reports/sellers/performance', {
      params,
    });
    return response.data;
  },
  getDailyCashFlow: async (days: number) => {
    const response = await api.get('/api/v1/reports/daily-cash-flow', {
      params: { days },
    });
    return response.data;
  },
};

export const Reports = () => {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  // Productos más vendidos
  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: () =>
      reportsApi.getTopSelling({
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
        limit: 10,
      }),
  });

  // Rendimiento de vendedores
  const { data: sellers = [] } = useQuery({
    queryKey: ['seller-performance', dateRange],
    queryFn: () =>
      reportsApi.getSellerPerformance({
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
      }),
  });

  // Flujo de caja diario
  const { data: cashFlow = [] } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: () => reportsApi.getDailyCashFlow(7),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Análisis y estadísticas del negocio</p>
        </div>
        <Button variant="secondary">
          <Calendar className="w-5 h-5 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filtros de Fecha */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button
            onClick={() => setDateRange({ start: '', end: '' })}
            variant="secondary"
          >
            Limpiar
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos Más Vendidos */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Productos Más Vendidos
            </h2>
          </div>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product: any, index: number) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 font-bold rounded-full text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.product_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.total_quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(product.total_revenue_usd)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.sales_count} ventas
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                No hay datos disponibles
              </p>
            )}
          </div>
        </Card>

        {/* Rendimiento de Vendedores */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Rendimiento de Vendedores
            </h2>
          </div>
          <div className="space-y-3">
            {sellers.length > 0 ? (
              sellers.map((seller: any, index: number) => (
                <div
                  key={seller.seller_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 font-bold rounded-full text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {seller.seller_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {seller.total_sales} ventas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(seller.total_revenue_usd)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Promedio: {formatCurrency(seller.avg_sale_usd)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                No hay datos disponibles
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Flujo de Caja Diario */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Flujo de Caja (Últimos 7 días)
          </h2>
        </div>
        <div className="space-y-2">
          {cashFlow.length > 0 ? (
            cashFlow.map((day: any) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{day.date}</p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                    <span>Efectivo: {formatCurrency(day.cash_usd)}</span>
                    <span>Transfer: {formatCurrency(day.transfer_usd)}</span>
                    <span>P. Móvil: {formatCurrency(day.pago_movil_usd)}</span>
                  </div>
                </div>
                <p className="text-xl font-bold text-primary-600">
                  {formatCurrency(day.total_usd)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              No hay datos disponibles
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
