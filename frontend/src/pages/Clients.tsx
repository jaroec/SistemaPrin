import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Users as UsersIcon } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ClientModal } from '@/components/clients/ClientModal';
import { formatCurrency } from '@/utils/format';
import { Client } from '@/types';

const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get('/api/v1/clients');
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/clients/${id}`);
  },
};

export const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      alert('Cliente eliminado exitosamente');
    },
  });

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const stats = {
    total: clients.length,
    withDebt: clients.filter((c) => c.balance > 0).length,
    totalDebt: clients.reduce((sum, c) => sum + c.balance, 0),
    totalCredit: clients.reduce((sum, c) => sum + c.credit_limit, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Con Deuda</p>
          <p className="text-2xl font-bold text-orange-600">{stats.withDebt}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Deuda Total</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.totalDebt)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-600 mb-1">Crédito Disponible</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalCredit)}
          </p>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Tabla de Clientes */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando clientes...</p>
          </div>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron clientes</p>
            <Button onClick={() => setShowModal(true)} className="mt-4">
              Crear Primer Cliente
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Límite Crédito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Saldo Pendiente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        {client.document && (
                          <p className="text-xs text-gray-500">{client.document}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {client.email && (
                          <p className="text-sm text-gray-900">{client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-xs text-gray-500">{client.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(client.credit_limit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-semibold ${
                          client.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(client.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          }}
        />
      )}
    </div>
  );
};

