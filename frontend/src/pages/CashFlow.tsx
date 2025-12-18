// frontend/src/pages/CashFlow.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Download,
  Eye,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDateTime } from '@/utils/format';
import api from '@/api/axios';

// ============================
// TYPES
// ============================

interface CashFlowSummary {
  period_start: string;
  period_end: string;
  total_ingresos: number;
  total_egresos: number;
  saldo_neto: number;
  ingresos_efectivo: number;
  ingresos_transferencia: number;
  ingresos_pago_movil: number;
  ingresos_divisas: number;
  ingresos_credito: number;
  egresos_efectivo: number;
  egresos_transferencia: number;
  egresos_otros: number;
  count_ingresos: number;
  count_egresos: number;
}

interface CashMovement {
  id: number;
  type: 'INGRESO' | 'EGRESO';
  origin: string;
  amount_usd: number;
  payment_method: string;
  description: string;
  category: string;
  reference_code: string;
  operation_date: string;
  created_by_name: string;
  status: string;
}

interface ExpenseCategory {
  category: string;
  total_amount: number;
  count: number;
  percentage: number;
}

// ============================
// API
// ============================

const cashFlowApi = {
  getSummary: async (startDate: string, endDate: string): Promise<CashFlowSummary> => {
    const res = await api.get('/api/v1/cash-flow/cash-flow/summary', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  getMovements: async (params?: any): Promise<CashMovement[]> => {
    const res = await api.get('/api/v1/cash-flow/movements', { params });
    return res.data;
  },

  getExpensesByCategory: async (startDate?: string, endDate?: string): Promise<ExpenseCategory[]> => {
    const res = await api.get('/api/v1/cash-flow/expenses/report/by-category', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },
};

// ============================
// COMPONENTE PRINCIPAL
// ============================

export const CashFlow = () => {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primer día del mes
    return d.toISOString().split('T')[0];
  });
  
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [filterType, setFilterType] = useState<'ALL' | 'INGRESO' | 'EGRESO'>('ALL');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  const queryClient = useQueryClient();

  // Queries
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['cash-flow-summary', dateFrom, dateTo],
    queryFn: () => cashFlowApi.getSummary(dateFrom, dateTo),
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['cash-movements', dateFrom, dateTo, filterType, filterMethod],
    queryFn: () =>
      cashFlowApi.getMovements({
        start_date: dateFrom,
        end_date: dateTo,
        movement_type: filterType !== 'ALL' ? filterType : undefined,
        payment_method: filterMethod !== 'ALL' ? filterMethod : undefined,
      }),
  });

  const { data: expensesByCategory = [] } = useQuery({
    queryKey: ['expenses-by-category', dateFrom, dateTo],
    queryFn: () => cashFlowApi.getExpensesByCategory(dateFrom, dateTo),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flujo de Caja</h1>
          <p className="text-gray-600 mt-1">
            Control financiero de ingresos y egresos
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="w-5 h-5 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => (window.location.href = '/expenses/new')}>
            <Plus className="w-5 h-5 mr-2" />
            Registrar Egreso
          </Button>
        </div>
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
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Todos</option>
            <option value="INGRESO">Ingresos</option>
            <option value="EGRESO">Egresos</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Todos los métodos</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="PAGO_MOVIL">Pago Móvil</option>
            <option value="DIVISAS">Divisas</option>
          </select>
        </div>
      </Card>

      {/* Resumen Principal */}
      {loadingSummary ? (
        <Card>
          <p className="text-center py-8">Cargando resumen...</p>
        </Card>
      ) : summary ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(summary.total_ingresos)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {summary.count_ingresos} movimientos
                  </p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </Card>

            <Card padding="md" className="bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-red-700 mb-1">Egresos Totales</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(summary.total_egresos)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {summary.count_egresos} movimientos
                  </p>
                </div>
                <div className="p-3 bg-red-200 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-700" />
                </div>
              </div>
            </Card>

            <Card
              padding="md"
              className={`bg-gradient-to-br ${
                summary.saldo_neto >= 0
                  ? 'from-primary-50 to-primary-100'
                  : 'from-orange-50 to-orange-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={`text-sm mb-1 ${
                      summary.saldo_neto >= 0 ? 'text-primary-700' : 'text-orange-700'
                    }`}
                  >
                    Saldo Neto
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      summary.saldo_neto >= 0 ? 'text-primary-600' : 'text-orange-600'
                    }`}
                  >
                    {formatCurrency(summary.saldo_neto)}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      summary.saldo_neto >= 0 ? 'text-primary-600' : 'text-orange-600'
                    }`}
                  >
                    {summary.saldo_neto >= 0 ? 'Positivo' : 'Negativo'}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    summary.saldo_neto >= 0 ? 'bg-primary-200' : 'bg-orange-200'
                  }`}
                >
                  <DollarSign
                    className={`w-6 h-6 ${
                      summary.saldo_neto >= 0 ? 'text-primary-700' : 'text-orange-700'
                    }`}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Desglose por Método de Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-bold mb-4">Ingresos por Método</h3>
              <div className="space-y-3">
                {[
                  { label: 'Efectivo', value: summary.ingresos_efectivo },
                  { label: 'Transferencia', value: summary.ingresos_transferencia },
                  { label: 'Pago Móvil', value: summary.ingresos_pago_movil },
                  { label: 'Divisas', value: summary.ingresos_divisas },
                  { label: 'Crédito (registrado)', value: summary.ingresos_credito },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Egresos por Método</h3>
              <div className="space-y-3">
                {[
                  { label: 'Efectivo', value: summary.egresos_efectivo },
                  { label: 'Transferencia', value: summary.egresos_transferencia },
                  { label: 'Otros', value: summary.egresos_otros },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Egresos por Categoría */}
          {expensesByCategory.length > 0 && (
            <Card>
              <h3 className="text-lg font-bold mb-4">Egresos por Categoría</h3>
              <div className="space-y-2">
                {expensesByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(cat.total_amount)} ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : null}

      {/* Tabla de Movimientos */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Movimientos de Caja</h2>
        </div>

        {loadingMovements ? (
          <p className="text-center py-12">Cargando movimientos...</p>
        ) : movements.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No hay movimientos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Método
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Registrado por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {formatDateTime(m.operation_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          m.type === 'INGRESO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{m.description}</p>
                      {m.reference_code && (
                        <p className="text-xs text-gray-500">{m.reference_code}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{m.payment_method}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-bold ${
                          m.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {m.type === 'INGRESO' ? '+' : '-'}
                        {formatCurrency(m.amount_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {m.created_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};