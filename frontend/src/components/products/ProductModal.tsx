import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { productsApi } from '@/api/products';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Product, ProductCreate } from '@/types';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductModal = ({ product, onClose, onSuccess }: ProductModalProps) => {
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductCreate>({
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          description: product.description || '',
          category: product.category || '',
          supplier: product.supplier || '',
          cost_price: product.cost_price,
          profit_margin: product.profit_margin,
          stock: product.stock,
          min_stock: product.min_stock,
        }
      : {
          code: '',
          name: '',
          description: '',
          category: '',
          supplier: '',
          cost_price: 0,
          profit_margin: 30,
          stock: 0,
          min_stock: 5,
        },
  });

  const costPrice = watch('cost_price');
  const profitMargin = watch('profit_margin');

  // Calcular precio de venta automáticamente
  const calculateSalePrice = () => {
    if (costPrice && profitMargin) {
      return (costPrice / (1 - profitMargin / 100)).toFixed(2);
    }
    return '0.00';
  };

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      alert('Producto creado exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al crear producto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductCreate> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      alert('Producto actualizado exitosamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Error al actualizar producto');
    },
  });

  const onSubmit = (data: ProductCreate) => {
    if (isEditing) {
      updateMutation.mutate({ id: product.id, data });
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
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
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
          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Código *"
                {...register('code', { required: 'El código es requerido' })}
                error={errors.code?.message}
                placeholder="P-001"
              />
              <Input
                label="Nombre *"
                {...register('name', { required: 'El nombre es requerido' })}
                error={errors.name?.message}
                placeholder="Producto ejemplo"
              />
              <div className="md:col-span-2">
                <Input
                  label="Descripción"
                  {...register('description')}
                  placeholder="Descripción del producto"
                />
              </div>
              <Input
                label="Categoría"
                {...register('category')}
                placeholder="Electrónica, Alimentos, etc."
              />
              <Input
                label="Proveedor"
                {...register('supplier')}
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>

          {/* Precios */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Precios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Precio de Costo (USD) *"
                type="number"
                step="0.01"
                {...register('cost_price', {
                  required: 'El precio de costo es requerido',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                })}
                error={errors.cost_price?.message}
                placeholder="10.00"
              />
              <Input
                label="Margen de Ganancia (%) *"
                type="number"
                step="0.01"
                {...register('profit_margin', {
                  required: 'El margen es requerido',
                  min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                  max: { value: 99, message: 'Debe ser menor a 100' },
                })}
                error={errors.profit_margin?.message}
                placeholder="30"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Venta (USD)
                </label>
                <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-lg font-bold text-primary-600">
                  ${calculateSalePrice()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Calculado automáticamente</p>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Stock Inicial *"
                type="number"
                {...register('stock', {
                  required: 'El stock es requerido',
                  min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                })}
                error={errors.stock?.message}
                placeholder="100"
              />
              <Input
                label="Stock Mínimo *"
                type="number"
                {...register('min_stock', {
                  required: 'El stock mínimo es requerido',
                  min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                })}
                error={errors.min_stock?.message}
                placeholder="10"
              />
            </div>
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
                : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};