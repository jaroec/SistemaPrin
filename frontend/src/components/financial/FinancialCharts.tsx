// frontend/src/components/FinancialCharts.tsx
import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  HorizontalBarChartProps,
} from 'recharts';
import { Sale } from '@/types';
import { formatCurrency } from '@/utils/format';

/**
 * Props:
 *  - sales: Sale[]
 */
export const FinancialCharts: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  // Prepara series por día (YYYY-MM-DD)
  const seriesByDay = useMemo(() => {
    const map: Record<string, { income: number; expense: number; balance: number }> = {};
    sales.forEach((s) => {
      const day = new Date(s.created_at).toISOString().slice(0, 10);
      if (!map[day]) map[day] = { income: 0, expense: 0, balance: 0 };
      if (s.type === 'EGRESO') map[day].expense += s.total_usd || 0;
      else map[day].income += s.total_usd || 0;
      map[day].balance += (s.total_usd || 0) - (s.paid_usd || 0);
    });
    const arr = Object.entries(map).sort(([a],[b])=> a.localeCompare(b)).map(([k,v]) => ({ date: k, ...v }));
    return arr;
  }, [sales]);

  // Pie: distribución de egresos por categoría
  const egresosByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    sales.filter(s => s.type === 'EGRESO').forEach(s => {
      const cat = s.category || 'Otros';
      map[cat] = (map[cat] || 0) + (s.total_usd || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // Top Cuentas por cobrar
  const topReceivables = useMemo(() => {
    const map: Record<string, number> = {};
    sales.filter(s => (s.balance_usd || 0) > 0).forEach(s => {
      const client = s.client_name || 'Cliente anónimo';
      map[client] = (map[client] || 0) + (s.balance_usd || 0);
    });
    return Object.entries(map).map(([client, amount]) => ({ client, amount })).sort((a,b)=> b.amount - a.amount).slice(0,10);
  }, [sales]);

  const COLORS = ['#4ade80','#fb7185','#f59e0b','#60a5fa','#a78bfa','#34d399','#f97316'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Ingresos vs Egresos (Line/Bar) */}
      <CardChart title="Ingresos vs Egresos (por día)">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={seriesByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value:number) => formatCurrency(value)} />
            <Bar dataKey="income" stackId="a" name="Ingresos" fill="#10B981" />
            <Bar dataKey="expense" stackId="a" name="Egresos" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardChart>

      {/* Flujo de caja (línea) */}
      <CardChart title="Flujo de caja">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={seriesByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value:number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="balance" stroke="#6366F1" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardChart>

      {/* Distribución de Egresos (Pie) */}
      <CardChart title="Distribución de egresos por categoría">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={egresosByCategory} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label>
              {egresosByCategory.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip formatter={(value:number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </CardChart>

      {/* Top cuentas por cobrar (barra horizontal simple) */}
      <CardChart title="Top 10 - Cuentas por cobrar">
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* Usamos BarChart orientado horizontal simulando 'horizontal' */}
            <BarChart layout="vertical" data={topReceivables}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="client" type="category" width={150} />
              <Tooltip formatter={(value:number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardChart>
    </div>
  );
};

// Helper presentational wrapper
const CardChart: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <h4 className="text-sm font-medium mb-3">{title}</h4>
    {children}
  </div>
);

export default FinancialCharts;
