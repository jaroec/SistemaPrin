import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Página no encontrada
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          La página que estás buscando no existe o ha sido movida.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="secondary">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </Button>
          <Button onClick={() => navigate('/')}>
            <Home className="w-5 h-5 mr-2" />
            Ir al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
};