export interface CartItem {
  id?: string;
  name: string;
  price: number;
  quantity?: number;
  [key: string]: unknown;
}

const cart: CartItem[] = [];

export function addToCart(item: CartItem): void {
  cart.push(item);
  console.log(`${item.name} has been added to the cart.`);
}

export function render(): void {
  console.log('Cart Contents:');
  cart.forEach(item => {
    console.log(`- ${item.name}: $${item.price}`);
  });
}

export function getCartState(): CartItem[] {
  return cart;
}

export function clearCart(): void {
  cart.length = 0;
}

export function removeFromCart(itemName: string): boolean {
  const index = cart.findIndex(item => item.name === itemName);
  if (index > -1) {
    cart.splice(index, 1);
    return true;
  }
  return false;
}

export function getCartTotal(): number {
  return cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
}

export default { addToCart, render, getCartState, clearCart, removeFromCart, getCartTotal };