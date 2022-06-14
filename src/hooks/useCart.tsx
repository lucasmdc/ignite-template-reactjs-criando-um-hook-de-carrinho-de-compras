import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get<Product>(`products/${productId}`)
      const product = productResponse.data

      const stockResponse = await api.get<Stock>(`stock/${productId}`)
      const { amount: amountInStock } = stockResponse.data

      const productToUpdate = cart.filter(product => product.id === productId)[0]

      if (!productToUpdate) {
        const newProduct = { ...product, amount: 1 }
        const newCart = [...cart, newProduct]
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart(newCart)

        return
      }

      if (productToUpdate.amount < amountInStock) {
        const updateProduct = { ...productToUpdate, amount: productToUpdate.amount + 1 }
        const newCart = cart.map(product => product.id === productId ? updateProduct : product)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart(newCart)

        return
      }

      toast.error('Quantidade solicitada fora de estoque')
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const amountProductsBeforeRemove = cart.length
      const newCart = cart.filter(product => product.id !== productId)
      const amountProductsAfterRemove = newCart.length

      if (amountProductsBeforeRemove > amountProductsAfterRemove) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart(newCart)
      }

      throw Error()
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`)
      const { amount: amountInStock } = stockResponse.data

      if (amount < 1) {
        toast.error('Quantidade solicitada deve ser no mínimo 1')

        return
      }

      if (amount > amountInStock) {
        toast.error('Quantidade solicitada fora de estoque')

        return
      }

      const newCart = cart.map(product => {
        return product.id === productId
          ? { ...product, amount }
          : product
      })
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart)

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
