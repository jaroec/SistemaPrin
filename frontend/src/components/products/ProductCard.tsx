import { Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Card } from '@/components/ui/Card';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export const ProductCard = ({ product, onEdit, onDelete }: ProductCardProps) => {
  return (
    <Card padding="none" className="hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 font-mono">{product.code}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Category */}
        {product.category && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded mb-3">
            {product.category}
          </span>
        )}

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-1">Precio de Venta</p>
            <p className="text-lg font-bold text-primary-600">
              {formatCurrency(product.sale_price)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Margen</p>
            <p className="text-lg font-bold text-green-600">
              {product.profit_margin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Stock */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg ${
            product.stock === 0
              ? 'bg-red-50'
              : product.stock <= product.min_stock
              ? 'bg-orange-50'
              : 'bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {product.stock <= product.min_stock && (
              <AlertTriangle
                className={`w-4 h-4 ${
                  product.stock === 0 ? 'text-red-600' : 'text-orange-600'
                }`}
              />
            )}
            <span className="text-sm font-medium text-gray-700">Stock</span>
          </div>
          <span
            className={`text-lg font-bold ${
              product.stock === 0
                ? 'text-red-600'
                : product.stock <= product.min_stock
                ? 'text-orange-600'
                : 'text-green-600'
            }`}
          >
            {product.stock}
          </span>
        </div>

        {/* Status */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              product.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {product.is_active ? 'Activo' : 'Inactivo'}
          </span>
          <span className="text-xs text-gray-500">
            Costo: {formatCurrency(product.cost_price)}
          </span>
        </div>
      </div>
    </Card>
  );
};
