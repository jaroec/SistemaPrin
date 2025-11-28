import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Product, ProductCreate } from '@/types';
import { PRODUCT_CATEGORIES } from '@/utils/constants';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProductForm = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
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

  // Calcular precio de venta
  const calculateSalePrice = () => {
    if (costPrice && profitMargin) {
      return (costPrice / (1 - profitMargin / 100)).toFixed(2);
    }
    return '0.00';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register('description')}
              placeholder="Descripción del producto"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          <Select
            label="Categoría"
            {...register('category')}
            options={[
              { value: '', label: 'Seleccionar categoría' },
              ...PRODUCT_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            ]}
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
              valueAsNumber: true,
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
              valueAsNumber: true,
            })}
            error={errors.profit_margin?.message}
            placeholder="30"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio de Venta (USD)
            </label>
            <div className="px-4 py-2 border-2 border-primary-200 bg-primary-50 rounded-lg text-lg font-bold text-primary-700">
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
              valueAsNumber: true,
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
              valueAsNumber: true,
            })}
            error={errors.min_stock?.message}
            placeholder="10"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Guardando...' : product ? 'Actualizar' : 'Crear Producto'}
        </Button>
      </div>
    </form>
  );
};