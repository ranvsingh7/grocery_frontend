"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../../types/types";
import CategoryFilter from "./components/CategoryFilter";
import ProductCard from "./components/ProductCard";
import { SelectChangeEvent } from "@mui/material";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

const Page: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevCart = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    fetchProducts();
    fetchCartFromAPI();
    // fetchCategories();
  }, []);

  // Fetch cart from API and sync local cart state
  const fetchCartFromAPI = async () => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    try {
      const response = await apiRequest<{ items: { productId: string | { _id: string }; quantity: number }[] }>("/api/cart", "GET", undefined, token);
      if (response && Array.isArray(response.items)) {
        const cartObj: { [key: string]: number } = {};
        response.items.forEach(item => {
          let id: string | undefined;
          if (typeof item.productId === 'string') {
            id = item.productId;
          } else if (item.productId && typeof item.productId === 'object' && '_id' in item.productId) {
            id = (item.productId as any)._id;
          }
          if (id) cartObj[id] = item.quantity;
        });
        setCart(cartObj);
        prevCart.current = cartObj; // Ensure prevCart is also updated so syncCartWithAPI doesn't immediately overwrite
      }
    } catch (error) {
      // ignore error, cart will be empty
    }
  };

  const initializeAuth = () => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id || null;
    const token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    return { userId, token };
  };

  const fetchProducts = async () => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      return;
    }
    try {
      const response = await apiRequest<Product[]>("/api/products", "GET", undefined, token);
      setProducts(response);
    } catch (error) {
      // Error fetching products
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value);
  };

  const handleAddToCart = (productId: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [productId]: 1,
    }));
  };

  const handleIncrement = (productId: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [productId]: (prevCart[productId] || 0) + 1,
    }));
  };

  const handleDecrement = (productId: string) => {
    setCart((prevCart) => {
      const newQty = (prevCart[productId] || 0) - 1;
      if (newQty <= 0) {
        // Remove from cart or set to 0
        const { [productId]: _, ...rest } = prevCart;
        return rest;
      }
      return {
        ...prevCart,
        [productId]: newQty,
      };
    });
  };

  // Debounced cart sync effect
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      syncCartWithAPI();
      prevCart.current = { ...cart };
    }, 500); // 500ms debounce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const syncCartWithAPI = async () => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    const prev = prevCart.current;
    for (const productId of new Set([...Object.keys(prev), ...Object.keys(cart)])) {
      const prevQty = prev[productId] || 0;
      const currQty = cart[productId] || 0;
      if (currQty === prevQty) continue;
      try {
        if (currQty === 0 && prevQty > 0) {
          // Remove from cart
          await apiRequest(`/api/cart/${productId}`, "DELETE", undefined, token);
        } else if (prevQty === 0 && currQty > 0) {
          // Add to cart
          await apiRequest("/api/cart/add", "POST", { productId, quantity: currQty }, token);
        } else if (currQty > 0) {
          // Update cart
          await apiRequest("/api/cart/update", "PUT", { productId, quantity: currQty }, token);
        }
      } catch (error) {
        // Cart API error
      }
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-200 p-0">
      {/* Category Filter */}
      <div className="max-w-5xl mx-auto mt-6 mb-4 px-4">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Products Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 px-4 pb-16">
        {filteredProducts.map((product) => (
          <div key={product._id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition p-4 flex flex-col items-center group relative border border-green-100">
            <img
              src={`/groceryLogo.jpg`}
              alt={product.name}
              className="h-28 w-28 object-contain mb-3 rounded-xl group-hover:scale-105 transition"
              onError={e => (e.currentTarget.src = '/groceryLogo.jpg')}
            />
            <div className="w-full flex flex-col items-center">
              <h2 className="text-lg font-bold text-green-800 mb-1 text-center truncate w-full" title={product.name}>{product.name}</h2>
              <span className="text-green-600 font-semibold text-base mb-1">
                {product.price !== undefined && product.price !== null && !isNaN(Number(product.price))
                  ? `₹${Number(product.price).toFixed(2)}`
                  : '-'}
              </span>
              <span className="text-gray-700 text-sm mb-2 text-center w-full truncate" title={product.description}>
                {product.description || ''}
              </span>
              <div className="flex items-center gap-2 mt-2">
                {cart[product._id] ? (
                  <>
                    <button
                      className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-300 hover:bg-green-200 transition"
                      onClick={() => handleDecrement(product._id)}
                    >-</button>
                    <span className="text-green-800 font-bold text-lg px-2">{cart[product._id]}</span>
                    <button
                      className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-700 hover:bg-green-700 transition"
                      onClick={() => handleIncrement(product._id)}
                    >+</button>
                  </>
                ) : (
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition"
                    onClick={() => handleAddToCart(product._id)}
                  >Add</button>
                )}
              </div>
            </div>
            {/* Tag for category */}
            <span className="absolute top-3 left-3 bg-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {product.category}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur border-t border-green-200 shadow-lg flex items-center justify-between px-6 py-3 z-30 md:hidden">
        <span className="text-green-700 font-semibold text-lg">Cart: <span className="font-bold">{Object.values(cart).reduce((a, b) => a + b, 0)}</span></span>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow transition">View Cart</button>
      </div>
    </div>
  );
};

export default Page;
