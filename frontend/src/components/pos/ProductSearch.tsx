import { useState, useEffect, useRef } from 'react';
import { Search, Barcode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductSearchProps {
  onProductSelect: (product: Product) => void;
}

export const ProductSearch = ({ onProductSelect }: ProductSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // Buscar productos
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn: () => productsApi.search(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar resultados cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setShowResults(true);
    }
  }, [debouncedSearch]);

  const handleProductClick = (product: Product) => {
    onProductSelect(product);
    setSearchTerm('');
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre, código o categoría..."
          className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          autoFocus
        />
        <Barcode className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
      </div>

      {/* Resultados de búsqueda */}
      {showResults && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Buscando productos...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="w-full p-4 hover:bg-primary-50 transition-colors text-left flex items-center justify-between group"
                  disabled={product.stock === 0}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                      {product.name}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      <span className="font-mono">{product.code}</span>
                      {product.category && (
                        <>
                          <span>•</span>
                          <span>{product.category}</span>
                        </>
                      )}
                      <span>•</span>
                      <span
                        className={
                          product.stock <= product.min_stock
                            ? 'text-orange-600 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-primary-600 group-hover:text-primary-700">
                      {formatCurrency(product.sale_price)}
                    </p>
                    {product.stock === 0 && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Sin stock
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron productos</p>
              <p className="text-sm text-gray-400 mt-1">
                Intenta con otro término de búsqueda
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hint cuando no hay búsqueda */}
      {searchTerm.length > 0 && searchTerm.length < 2 && (
        <div className="absolute z-50 w-full mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Escribe al menos 2 caracteres para buscar...
          </p>
        </div>
      )}
    </div>
  );
};