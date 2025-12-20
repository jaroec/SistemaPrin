import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
  Percent,
  DollarSign,
  FileText,
  Activity,
} from 'lucide-react';

import api from '@/api/axios';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDateTime } from '@/utils/format';

// ============================
// TIPOS
// ============================
export type MovementType =
  | 'SALE'
  | 'EXPENSE'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'PRICE_CHANGE'
  | 'MARGIN_CHANGE';

export interface Movement {
  id: number;
  type: MovementType;
  reference: string;
  description: string;
  amount_usd?: number;
  created_at: string;
  user_name?: string;
}

// ============================
// API
// ============================
const movementsApi = {
  getAll: async (): Promise<Movement[]> => {
    const res = await api.get('/api/v1/movements');
    return res.data;
  },
};

// ============================
// CONFIGURACIÓN DE TIPOS
// ============================
const typeConfig: Record<
  MovementType,
  {
    label: string;
    icon: any;
    color: string;
    badge: string;
  }
> = {
  SALE: {
    label: 'Venta',
    icon: ArrowUpCircle,
    color: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  EXPENSE: {
    label: 'Egreso',
    icon: ArrowDownCircle,
    color: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  STOCK_IN: {
    label: 'Ingreso inventario',
    icon: Package,
    color: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  STOCK_OUT: {
    label: 'Salida inventario',
    icon: Package,
    color: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  PRICE_CHANGE: {
    label: 'Cambio de precio',
    icon: DollarSign,
    color: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  MARGIN_CHANGE: {
    label: 'Cambio de margen',
    icon: Percent,
    color: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
};

// ============================
// COMPONENTE
// ============================
export const Movements = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: movementsApi.getAll,
  });

  // ============================
  // FILTRADO OPTIMIZADO
  // ============================
  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch =
        m.reference.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'ALL' || m.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [movements, search, typeFilter]);

  // ============================
  // KPIs
  // ============================
  const totalSales = movements.filter((m) => m.type === 'SALE').length;
  const totalExpenses = movements.filter((m) => m.type === 'EXPENSE').length;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Activity className="w-7 h-7 text-gray-500" />
        <div>
          <h1 className="text-3xl font-bold">Movimientos del Sistema</h1>
          <p className="text-gray-600 mt-1">
            Auditoría general de acciones, ventas e inventario
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total movimientos</p>
          <p className="text-2xl font-bold">{movements.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Ventas registradas</p>
          <p className="text-2xl font-bold text-green-600">{totalSales}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Egresos registrados</p>
          <p className="text-2xl font-bold text-red-600">{totalExpenses}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por referencia o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="ALL">Todos</option>
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* TABLA */}
      {isLoading ? (
        <Card>
          <p className="text-center py-10 text-gray-500">Cargando movimientos...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay movimientos registrados</p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Tipo</th>
                  <th className="px-6 py-3 text-left">Referencia</th>
                  <th className="px-6 py-3 text-left">Descripción</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                  <th className="px-6 py-3 text-left">Usuario</th>
                  <th className="px-6 py-3 text-left">Fecha</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((m) => {
                  const cfg = typeConfig[m.type];
                  const Icon = cfg.icon;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${cfg.badge}`}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {m.reference}
                      </td>

                      <td className="px-6 py-4">{m.description}</td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {m.amount_usd !== undefined
                          ? formatCurrency(m.amount_usd)
                          : '—'}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {m.user_name || 'Sistema'}
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {formatDateTime(m.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
