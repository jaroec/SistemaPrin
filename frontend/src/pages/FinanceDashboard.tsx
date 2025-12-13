// frontend/src/pages/FinanceDashboard.tsx
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Search, Eye, X as XIcon, FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { exportToExcel, exportToPDF } from '@/utils/exports';
import { FinancialCharts } from '@/components/financial/FinancialCharts';
import reportsApi from '@/api/reports';
import { Sale } from '@/types';

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'ACCOUNTS_RECEIVABLE' | 'ACCOUNTS_PAYABLE';

export const FinanceDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [branch, setBranch] = useState<'ALL' | string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<'ALL' | string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', { dateFrom, dateTo }],
    queryFn: () => reportsApi.getSales({ from: dateFrom, to: dateTo }),
  });

  // MUTACIÓN ANULAR (usa endpoint existente)
  const annulMutation = useMutation({
    mutationFn: (id: number) => reportsApi.cancelSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
      alert('Venta anulada correctamente');
    },
    onError: (err: any) => {
      alert('No se pudo anular la venta');
    },
  });

  const handleAnnul = (id: number) => {
    if (!confirm('¿Anular venta? Esto no se puede revertir.')) return;
    annulMutation.mutate(id);
  };

  // Filtrado complejo conforme a tu especificación
  const filtered = useMemo(() => {
    return sales.filter((s: Sale) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        s.code.toLowerCase().includes(term) ||
        (s.client_name || '').toLowerCase().includes(term);

      // Fecha
      const sDate = new Date(s.created_at);
      if (dateFrom && new Date(dateFrom) > sDate) return false;
      if (dateTo && new Date(dateTo) < sDate) return false;

      // Branch / payment method filters (if implemented)
      if (branch !== 'ALL' && (s.branch || '') !== branch) return false;
      if (paymentMethod !== 'ALL' && (s.payment_method || '') !== paymentMethod) return false;

      // Tipo de operación
      switch (filterType) {
        case 'ALL':
          return matchesSearch;
        case 'INCOME':
          return (s.status === 'PAGADO' || s.status === 'CREDITO') && matchesSearch;
        case 'EXPENSE':
          // En tu modelo puede que uses movimientos que no sean ventas para egresos.
          // Aquí se filtra por sale.type === 'EGRESO' si existe, o por status ANULADO según lo que definas.
          return (s.type === 'EGRESO' || s.status === 'ANULADO') && matchesSearch;
        case 'ACCOUNTS_RECEIVABLE':
          return (s.status === 'CREDITO' || s.balance_usd > 0) && matchesSearch;
        case 'ACCOUNTS_PAYABLE':
          // Si tienes movimientos con vendor / supplier y tipo 'PAGO' o 'CXP'
          return s.type === 'CXP' && matchesSearch;
        default:
          return matchesSearch;
      }
    });
  }, [sales, searchTerm, filterType, branch, paymentMethod, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const incomes = filtered
      .filter((s) => s.status !== 'ANULADO')
      .reduce((sum, s) => sum + (s.total_usd || 0), 0);
    const paid = filtered.reduce((sum, s) => sum + (s.paid_usd || 0), 0);
    const receivable = filtered.reduce((sum, s) => sum + (s.balance_usd || 0), 0);
    const expenses = sales
      .filter((s) => s.type === 'EGRESO')
      .reduce((sum, s) => sum + (s.total_usd || 0), 0);

    return { incomes, paid, receivable, expenses };
  }, [filtered, sales]);

  const onExportExcel = () => {
    exportToExcel(filtered, {
      filename: `reporte_financiero_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheetName: filterType,
    });
  };

  const onExportPDF = (includeCharts = false) => {
    exportToPDF({
      title: 'Reporte financiero',
      filters: { filterType, dateFrom, dateTo, branch, paymentMethod },
      tableData: filtered,
      includeCharts,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financiero</h1>
          <p className="text-sm text-gray-600">Visión general y reportes financieros</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onExportExcel()}>
            <Download className="w-4 h-4 mr-2"/> Exportar Excel
          </Button>
          <Button onClick={() => onExportPDF(false)} variant="secondary">
            Exportar PDF
          </Button>
          <Button onClick={() => onExportPDF(true)} variant="ghost">
            Exportar con gráficos
          </Button>
        </div>
      </div>

      {/* Filtros avanzados */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" placeholder="Buscar por código, cliente..." />
          </div>

          <div>
            <label className="text-xs text-gray-600">Tipo</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)} className="w-full px-3 py-2 border rounded">
              <option value="ALL">Todos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Egresos</option>
              <option value="ACCOUNTS_RECEIVABLE">Por cobrar</option>
              <option value="ACCOUNTS_PAYABLE">Por pagar</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label className="text-xs text-gray-600">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>

          {/* Segunda fila: Sucursal, Metodo pago (opcional) */}
          <div>
            <label className="text-xs text-gray-600">Sucursal</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="ALL">Todas</option>
              <option value="MAIN">Principal</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Método de pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="ALL">Todos</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>

          <div className="col-span-2">
            <p className="text-xs text-gray-500">Mostrando {filtered.length} registros — Ingresos: {formatCurrency(totals.incomes)} — Egresos: {formatCurrency(totals.expenses)}</p>
          </div>
        </div>
      </Card>

      {/* Tarjetas resúmen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md"><p className="text-sm text-gray-600">Ingresos</p><p className="text-xl font-bold">{formatCurrency(totals.incomes)}</p></Card>
        <Card padding="md"><p className="text-sm text-gray-600">Egresos</p><p className="text-xl font-bold">{formatCurrency(totals.expenses)}</p></Card>
        <Card padding="md"><p className="text-sm text-gray-600">Cobrado</p><p className="text-xl font-bold">{formatCurrency(totals.paid)}</p></Card>
        <Card padding="md"><p className="text-sm text-gray-600">Por cobrar</p><p className="text-xl font-bold">{formatCurrency(totals.receivable)}</p></Card>
      </div>

      {/* Gráficos */}
      <FinancialCharts sales={filtered} />

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-600">Código</th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">Cliente</th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">Fecha</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">Total</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">Pagado</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">Pendiente</th>
                <th className="px-4 py-2 text-center text-xs text-gray-600">Estado</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{s.code}</td>
                  <td className="px-4 py-3 text-sm">{s.client_name || 'Público General'}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(s.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(s.total_usd)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(s.paid_usd)}</td>
                  <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(s.balance_usd)}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded-full text-xs">{s.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedSale(s)}><Eye className="w-4 h-4"/> Ver</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal detalle */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedSale.code}</h3>
                <p className="text-sm text-gray-600">{formatDateTime(selectedSale.created_at)}</p>
              </div>
              <div className="flex gap-2">
                {selectedSale.status !== 'ANULADO' && (
                  <Button onClick={() => handleAnnul(selectedSale.id)} variant="danger">Anular</Button>
                )}
                <Button onClick={() => setSelectedSale(null)} variant="secondary"><XIcon className="w-4 h-4"/></Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-semibold">{selectedSale.client_name || 'Público General'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Productos</p>
                <div className="space-y-2">
                  {selectedSale.details.map((d) => (
                    <div key={d.id} className="flex justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{d.product_name}</p>
                        <p className="text-sm text-gray-600">{d.quantity} × {formatCurrency(d.price_usd)}</p>
                      </div>
                      <div className="font-semibold">{formatCurrency(d.subtotal_usd)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between"><span className="text-sm text-gray-600">Subtotal</span><span>{formatCurrency(selectedSale.subtotal_usd)}</span></div>
                {selectedSale.discount_usd > 0 && <div className="flex justify-between"><span className="text-sm text-gray-600">Descuento</span><span>-{formatCurrency(selectedSale.discount_usd)}</span></div>}
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(selectedSale.total_usd)}</span></div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;

