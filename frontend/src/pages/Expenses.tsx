// frontend/src/pages/Expenses.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  TrendingDown,
  Calendar,
  FileText,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/utils/format';
import api from '@/api/axios';

interface Expense {
  id: number;
  code: string;
  category: string;
  description: string;
  amount_usd: number;
  payment_method: string;
  created_by_name: string;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  'PROVEEDORES',
  'NOMINA',
  'SERVICIOS',
  'COMPRAS',
  'ADMINISTRATIVO',
  'OTROS',
];

const PAYMENT_METHODS = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'PAGO_MOVIL',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
];

const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    const response = await api.get('/api/v1/expenses');
    return response.data;
  },
  
  create: async (data: {
    category: string;
    description: string;
    amount_usd: number;
    payment_method: string;
  }): Promise<Expense> => {
    const response = await api.post('/api/v1/expenses', data);
    return response.data;
  },
};

export const Expenses = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  
  // Form state
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      alert('✅ Egreso registrado exitosamente');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al registrar egreso');
    },
  });

  const resetForm = () => {
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription('');
    setAmount('');
    setPaymentMethod(PAYMENT_METHODS[0]);
  };

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!description.trim()) {
      alert('⚠️ Ingrese una descripción');
      return;
    }
    
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('⚠️ Ingrese un monto válido');
      return;
    }

    createMutation.mutate({
      category,
      description: description.trim(),
      amount_usd: amountNum,
      payment_method: paymentMethod,
    });
  };

  // Filtrado
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;

    const matchesMonth =
      monthFilter === 'ALL' ||
      new Date(exp.created_at).getMonth() + 1 === Number(monthFilter);

    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Estadísticas
  const stats = {
    total: filteredExpenses.reduce((sum, e) => sum + e.amount_usd, 0),
    count: filteredExpenses.length,
    byCategory: EXPENSE_CATEGORIES.map((cat) => ({
      category: cat,
      total: filteredExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount_usd, 0),
    })).filter((item) => item.total > 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Egresos y Gastos</h1>
          <p className="text-gray-600 mt-1">Registro y control de gastos operativos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Registrar Egreso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.total)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Cantidad</p>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </Card>

        <Card padding="md" className="md:col-span-2">
          <p className="text-sm text-gray-600 mb-2">Top Categorías</p>
          <div className="flex gap-2 flex-wrap">
            {stats.byCategory.slice(0, 3).map((item) => (
              <span
                key={item.category}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                {item.category}: {formatCurrency(item.total)}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Mes {i + 1}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Tabla */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando egresos...</p>
          </div>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron egresos</p>
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
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Registrado por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{expense.code}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">
                        {expense.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(expense.amount_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{expense.payment_method}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(expense.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.created_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Crear Egreso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar Egreso</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Pago de luz del mes de diciembre"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <Input
                label="Monto (USD) *"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
