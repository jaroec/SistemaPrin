/**
 * Hook centralizado para acceder a todos los stores
 * Facilita el uso de múltiples stores en un solo componente
 */

import { useAuthStore } from './authStore';
import { useCartStore } from './cartStore';

export const useStore = () => {
  const auth = useAuthStore();
  const cart = useCartStore();

  return {
    // Auth
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    setAuth: auth.setAuth,
    clearAuth: auth.clearAuth,
    initAuth: auth.initAuth,

    // Cart
    cartItems: cart.items,
    cartClient: cart.client,
    cartDiscount: cart.discount,
    addToCart: cart.addItem,
    removeFromCart: cart.removeItem,
    updateCartQuantity: cart.updateQuantity,
    clearCart: cart.clearCart,
    setCartClient: cart.setClient,
    setCartDiscount: cart.setDiscount,
    getCartSubtotal: cart.getSubtotal,
    getCartTotal: cart.getTotal,
  };
};

// Export individual stores también
export { useAuthStore, useCartStore };
