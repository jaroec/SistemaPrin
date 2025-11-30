import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  AlertCircle,
  Users,
  Package 
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatPercent, formatDateTime } from '@/utils/format';

export const Dashboard = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const { data: recentSales = [] } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => dashboardApi.getRecentSales(5),
    refetchInterval: 30000,
  });

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Ventas de Hoy',
      value: formatCurrency(summary.today.total_usd),
      change: summary.today.daily_change_percent,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Transacciones',
      value: summary.today.sales_count.toString(),
      subtitle: 'ventas hoy',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Ventas del Mes',
      value: formatCurrency(summary.month.total_usd),
      subtitle: `${summary.month.sales_count} ventas`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Por Cobrar',
      value: formatCurrency(summary.today.pending_usd),
      subtitle: `${summary.alerts.pending_sales} ventas`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Vista general de tu negocio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                {stat.change !== undefined ? (
                  <div className="flex items-center gap-1">
                    {stat.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercent(stat.change)}
                    </span>
                  </div>
                ) : (
                  stat.subtitle && (
                    <p className="text-sm text-gray-500">{stat.subtitle}</p>
                  )
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alertas */}
      {(summary.alerts.low_stock_products > 0 || summary.alerts.clients_with_debt > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {summary.alerts.low_stock_products > 0 && (
            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Productos con Bajo Stock
                  </h3>
                  <p className="text-sm text-gray-600">
                    {summary.alerts.low_stock_products} producto(s) necesitan reabastecimiento
                  </p>
                </div>
              </div>
            </Card>
          )}

          {summary.alerts.clients_with_debt > 0 && (
            <Card>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Clientes con Deuda
                  </h3>
                  <p className="text-sm text-gray-600">
                    {summary.alerts.clients_with_debt} cliente(s) tienen saldo pendiente
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Ventas Recientes */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ventas Recientes</h2>
        <div className="space-y-3">
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{sale.code}</p>
                  <p className="text-sm text-gray-600">{sale.client_name}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(sale.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(sale.total_usd)}
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    sale.status === 'PAGADO' 
                      ? 'bg-green-100 text-green-700'
                      : sale.status === 'CREDITO'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sale.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No hay ventas recientes</p>
          )}
        </div>
      </Card>
    </div>
  );
};
};
