import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Client } from '@/types';

interface ClientCreate {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit: number;
}

interface ClientModalProps {
  client?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

const clientsApi = {
  create: async (data: ClientCreate): Promise<Client> => {
    const response = await api.post('/api/v1/clients', data);
    return response.data;
  },
  update: async (id: number, data: Partial<ClientCreate>): Promise<Client> => {
    const response = await api.put(`/api/v1/clients/${id}`, data);
    return response.data;
  },
};

export const ClientModal = ({ client, onClose, onSuccess }: ClientModalProps) => {
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientCreate>({
    defaultValues: client
      ? {
          name: client.name,
          document: client.document || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          credit_limit: client.credit_limit,
        }
      : {
          name: '',
          document: '',
          email: '',
          phone: '',
          address: '',
          credit_limit: 0,
        },
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      alert('Cliente creado exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al crear cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ClientCreate>) => clientsApi.update(client!.id, data),
    onSuccess: () => {
      alert('Cliente actualizado exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al actualizar cliente');
    },
  });

  const onSubmit = (data: ClientCreate) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nombre Completo *"
                  {...register('name', { required: 'El nombre es requerido' })}
                  error={errors.name?.message}
                  placeholder="Juan Pérez"
                />
              </div>
              <Input
                label="Documento"
                {...register('document')}
                placeholder="V-12345678"
              />
              <Input
                label="Teléfono"
                {...register('phone')}
                placeholder="+58 424-1234567"
              />
              <div className="md:col-span-2">
                <Input
                  label="Email"
                  type="email"
                  {...register('email')}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Dirección"
                  {...register('address')}
                  placeholder="Calle, Ciudad, Estado"
                />
              </div>
            </div>
          </div>

          {/* Información Financiera */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información Financiera
            </h3>
            <Input
              label="Límite de Crédito (USD)"
              type="number"
              step="0.01"
              {...register('credit_limit', {
                min: { value: 0, message: 'Debe ser mayor o igual a 0' },
              })}
              error={errors.credit_limit?.message}
              placeholder="1000.00"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : isEditing
                ? 'Actualizar'
                : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
