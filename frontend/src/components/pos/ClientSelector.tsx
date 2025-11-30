import { useState, useRef, useEffect } from 'react';
import { User, X, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { useCartStore } from '@/store/cartStore';
import { Client } from '@/types';
import { Button } from '@/components/ui/Button';

const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get('/api/v1/clients');
    return response.data;
  },
};

export const ClientSelector = () => {
  const { client, setClient } = useCartStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectClient = (selectedClient: Client) => {
    setClient(selectedClient);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleRemoveClient = () => {
    setClient(null);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Botón/Display del cliente */}
      {client ? (
        <div className="p-4 border-2 border-primary-300 bg-primary-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-primary-900">{client.name}</p>
              {client.phone && (
                <p className="text-sm text-primary-700">{client.phone}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleRemoveClient}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-700" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-primary-700"
        >
          <User className="w-5 h-5" />
          <span className="font-medium">Seleccionar cliente (Opcional)</span>
        </button>
      )}

      {/* Dropdown de clientes */}
      {isOpen && !client && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-hidden flex flex-col">
          {/* Búsqueda */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="flex-1 overflow-y-auto">
            {filteredClients.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectClient(c)}
                    className="w-full p-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && (
                        <>
                          <span>•</span>
                          <span>{c.email}</span>
                        </>
                      )}
                    </div>
                    {c.balance > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                        Saldo: ${c.balance.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500">No se encontraron clientes</p>
              </div>
            )}
          </div>

          {/* Botón crear nuevo */}
          <div className="p-3 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                alert('Funcionalidad de crear cliente rápido - Por implementar');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear nuevo cliente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
