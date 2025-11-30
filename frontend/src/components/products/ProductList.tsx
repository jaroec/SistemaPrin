import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export const ProductList = ({ products, onEdit, onDelete }: ProductListProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Producto
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoría
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Costo
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Precio
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Margen
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-mono text-gray-900 font-semibold">
                  {product.code}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="max-w-xs">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {product.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {product.category ? (
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {product.category}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className="text-sm text-gray-600">
                  {formatCurrency(product.cost_price)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(product.sale_price)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className="text-sm text-green-600 font-medium">
                  {product.profit_margin.toFixed(1)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                  {product.stock <= product.min_stock && (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      product.stock === 0
                        ? 'text-red-600'
                        : product.stock <= product.min_stock
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {product.stock}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    product.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
