import { PaymentMethod, SaleStatus } from '@/types';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'DIVISAS', label: 'Divisas' },
  { value: 'MIXTO', label: 'Mixto' },
  { value: 'CREDITO', label: 'Crédito' },
];

export const SALE_STATUSES: { value: SaleStatus; label: string; color: string }[] = [
  { value: 'PAGADO', label: 'Pagado', color: 'green' },
  { value: 'CREDITO', label: 'Crédito', color: 'orange' },
  { value: 'PENDIENTE', label: 'Pendiente', color: 'gray' },
  { value: 'ANULADO', label: 'Anulado', color: 'red' },
];

export const ROLES = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  INVENTARIO: 'INVENTARIO',
} as const;

export const PRODUCT_CATEGORIES = [
  'Electrónica',
  'Alimentos',
  'Bebidas',
  'Limpieza',
  'Ferretería',
  'Ropa',
  'Deportes',
  'Juguetes',
  'Mascotas',
  'Oficina',
  'Hogar',
  'Belleza',
  'Salud',
  'Automotriz',
  'Otros',
];
