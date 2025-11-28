import { create } from 'zustand';
import { CartItem, Product, Client } from '@/types';

interface CartState {
  items: CartItem[];
  client: Client | null;
  discount: number;
  
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setClient: (client: Client | null) => void;
  setDiscount: (discount: number) => void;
  
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  client: null,
  discount: 0,

  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex(item => item.product.id === product.id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      const newQuantity = newItems[existingIndex].quantity + quantity;
      
      // Validar stock
      if (newQuantity > product.stock) {
        alert(`Stock insuficiente. Disponible: ${product.stock}`);
        return;
      }
      
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQuantity,
        subtotal: newQuantity * product.sale_price,
      };
      set({ items: newItems });
    } else {
      if (quantity > product.stock) {
        alert(`Stock insuficiente. Disponible: ${product.stock}`);
        return;
      }
      
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            subtotal: quantity * product.sale_price,
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set(state => ({
      items: state.items.filter(item => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    const { items } = get();
    const item = items.find(i => i.product.id === productId);
    
    if (!item) return;
    
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    
    if (quantity > item.product.stock) {
      alert(`Stock insuficiente. Disponible: ${item.product.stock}`);
      return;
    }

    set({
      items: items.map(item =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: quantity * item.product.sale_price }
          : item
      ),
    });
  },

  clearCart: () => {
    set({ items: [], client: null, discount: 0 });
  },

  setClient: (client) => {
    set({ client });
  },

  setDiscount: (discount) => {
    set({ discount });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    const { discount } = get();
    return Math.max(0, get().getSubtotal() - discount);
  },
}));