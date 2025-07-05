"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest } from "@/utils/api";
import { TextField, InputAdornment, CircularProgress, Drawer, IconButton, Badge, Button, Typography, Box, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "@/types/types";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import Image from "next/image";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
}

// Define a type for the address and user response
interface UserAddress {
  _id?: string;
  id?: string;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  landmark?: string;
  location?: {
    lat: number;
    lng: number;
  };
  // mobile?: string;
  icon?: string;
  address?: string;
}

interface UserResponse {
  addresses: UserAddress[];
  // ...other user fields if needed
}

const CustomerDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [newAddress, setNewAddress] = useState<{
    label: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark: string;
    location: { lat: number; lng: number };
  }>({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    landmark: '',
    location: { lat: 26.2389, lng: 73.0243 }, // Default to Jodhpur
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const PAGE_SIZE = 24;
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevCart = useRef<{ [key: string]: number }>({});


  // Fetch search suggestions and results as user types
  useEffect(() => {
    if (searchInput.trim().length > 0) {
      const fetchSearchData = async () => {
        const { userId, token } = initializeAuth();
        if (!userId || !token) return;

        try {
          // Fetch suggestions (limited to 5 for dropdown)
          const suggestionsResponse = await apiRequest<{ products: Product[] }>(
            `/api/products?name=${encodeURIComponent(searchInput)}&limit=5`,
            "GET",
            undefined,
            token
          );

          if (suggestionsResponse && Array.isArray(suggestionsResponse.products)) {
            setSearchSuggestions(suggestionsResponse.products);
            setShowSuggestions(true);
          }

          // Fetch search results (more products for the main display)
          const resultsResponse = await apiRequest<{ products: Product[] }>(
            `/api/products?name=${encodeURIComponent(searchInput)}&limit=24`,
            "GET",
            undefined,
            token
          );

          if (resultsResponse && Array.isArray(resultsResponse.products)) {
            setSearchResults(resultsResponse.products);
          } else {
            setSearchResults([]);
          }
        } catch {
          setSearchSuggestions([]);
          setSearchResults([]);
        }
      };

      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(fetchSearchData, 300);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSearchResults([]);
    }
  }, [searchInput]);

  // Fetch all products on mount and when search is cleared
  useEffect(() => {
    if (searchInput.trim() === "") {
      setProducts([]);
      setHasMore(true);
      fetchProducts(1, true, "");
    }
    fetchCartFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput === ""]);

  // Fetch products from backend with pagination (for all products)
  const fetchProducts = async (page = 1, replace = false, searchTerm = "") => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    if (replace) setLoading(true);
    try {
        let url = `/api/products?page=${page}&limit=${PAGE_SIZE}`;
        if (searchTerm) url += `&name=${encodeURIComponent(searchTerm)}`;
        const response = await apiRequest<{ products: Product[] }>(url, "GET", undefined, token);
        if (response && Array.isArray(response.products)) {
            const uniqueProducts = response.products.filter(
                (product, index, self) =>
                    index === self.findIndex((p) => p._id === product._id)
            );
            if (replace) {
                setProducts(uniqueProducts);
            } else {
                setProducts((prev) => [...prev, ...uniqueProducts]);
            }
            setHasMore(uniqueProducts.length === PAGE_SIZE);
        } else {
            setProducts([]);
            setHasMore(false);
        }
    } catch {
        setProducts([]);
        setHasMore(false);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  // Fetch cart from API and sync local cart state
  const fetchCartFromAPI = async () => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      return;
    }
    
    try {
      const response = await apiRequest<{ items: { productId: string | { _id: string }; quantity: number }[] }>("/api/cart", "GET", undefined, token);
      
      if (response && Array.isArray(response.items)) {
        const cartObj: { [key: string]: number } = {};
        response.items.forEach(item => {
          let id: string | undefined;
          if (typeof item.productId === 'string') {
            id = item.productId;
          } else if (item.productId && typeof item.productId === 'object' && '_id' in item.productId) {
            id = (item.productId as { _id: string })._id;
          }
          if (id) cartObj[id] = item.quantity;
        });
        
        setCart(cartObj);
        prevCart.current = cartObj;
      }
    } catch {
      // ignore error, cart will be empty
    }
  };

  const initializeAuth = (): { userId: string | null; token: string | null } => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id || null;
    const token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    return { userId, token };
  };

  // Cart handlers
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
        // Remove productId from cart
        const { [productId]: _unused, ...rest } = prevCart;
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
      prevCart.current;
    }, 500);
  }, [cart]);

  const syncCartWithAPI = async () => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      return;
    }
    const prev = prevCart.current;
    let cartChanged = false;
    for (const productId of new Set([...Object.keys(prev), ...Object.keys(cart)])) {
      const prevQty = prev[productId] || 0;
      const currQty = cart[productId] || 0;
      if (currQty === prevQty) continue;
      try {
        if (currQty === 0 && prevQty > 0) {
          await apiRequest(`/api/cart/${productId}`, "DELETE", undefined, token);
          cartChanged = true;
        } else if (prevQty === 0 && currQty > 0) {
          await apiRequest("/api/cart/add", "POST", { productId, quantity: currQty }, token);
          cartChanged = true;
        } else if (currQty > 0) {
          await apiRequest("/api/cart/update", "PUT", { productId, quantity: currQty }, token);
          cartChanged = true;
        }
      } catch (error: any) {
        if (error && typeof error === 'object' && error.message && error.message.includes('Product not found in cart')) {
          toast.error('Product not found in cart. Please refresh and try again.', { position: 'top-center' });
          // Revert cart state to backend state
          fetchCartFromAPI();
        } else {
          toast.error('Failed to update cart. Please try again.', { position: 'top-center' });
        }
      }
    }
    // After all changes, update prevCart to match the latest cart
    if (cartChanged) {
      prevCart.current = { ...cart };
    }
  };

  // Infinite scroll handler (for all products)
  const fetchMoreProducts = async () => {
    if (loadingMore || !hasMore) return; // Prevent multiple fetches or fetching when no more products

    setLoadingMore(true); // Show loader during data fetch
    const { userId, token } = initializeAuth();

    if (!userId || !token) {
      setLoadingMore(false);
      return;
    }

    try {
      const nextPage = Math.ceil(products.length / PAGE_SIZE) + 1; // Calculate next page based on current product count
      const response = await apiRequest<{ products: Product[] }>(
        `/api/products?page=${nextPage}&limit=${PAGE_SIZE}`,
        "GET",
        undefined,
        token
      );

      if (response.products.length === 0) {
        setHasMore(false); // No more products available
      } else {
        setProducts((prevProducts) => [...prevProducts, ...response.products]);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoadingMore(false); // Hide loader after data fetch
    }
  };

  const debouncedFetchMoreProducts = () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchMoreProducts();
    }, 300);
  };

  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 200 &&
      hasMore &&
      !loadingMore
    ) {
      debouncedFetchMoreProducts();
    }
  };

  useEffect(() => {
    // Memoize handleScroll to avoid dependency warning
    const onScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200 &&
        hasMore &&
        !loadingMore
      ) {
        debouncedFetchMoreProducts();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [products, hasMore, loadingMore]);

  const cartItemsArr = Object.entries(cart).map(([productId, quantity]) => {
    const product = products.find(p => p._id === productId) || searchResults.find(p => p._id === productId);
    return product ? { product, quantity } : null;
  }).filter(Boolean) as { product: Product, quantity: number }[];
  const cartTotal = cartItemsArr.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Fetch addresses from backend
  const fetchAddresses = async () => {
    const { userId, token } = initializeAuth();
    
    if (!userId || !token) {
      setAddresses([]);
      return;
    }
    
    try {
      const res = await apiRequest<UserResponse>(`/api/get-customer/${userId}`, 'GET', undefined, token);
      
      if (res && Array.isArray(res.addresses) && res.addresses.length > 0) {
        const processedAddresses = res.addresses.map((addr, idx) => ({
          ...addr, // Keep the original address object with _id
          id: addr._id ? String(addr._id) : String(idx),
          label: addr.label || 'Home',
          icon: addr.label && addr.label.toLowerCase().includes('place') ? 'place' : 'home',
          address: [
            addr.street,
            addr.city,
            addr.state,
            addr.pincode,
            addr.country
          ].filter(Boolean).join(', ')
        }));
        setAddresses(processedAddresses);
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    }
  };

  // Edit address handler
  const handleEditAddress = (_idx: number, addressObj: UserAddress) => {
    setEditAddressId(addressObj._id || null);
    setNewAddress({
      label: addressObj.label || 'Home',
      street: addressObj.street || '',
      city: addressObj.city || '',
      state: addressObj.state || '',
      pincode: addressObj.pincode || '',
      country: addressObj.country || 'India',
      landmark: addressObj.landmark || '',
      location: addressObj.location || { lat: 26.2389, lng: 73.0243 },
    });
    setAddAddressOpen(true);
  };

  // Save (add or edit) address
  const handleSaveAddress = async () => {
    // Validation: all fields required except landmark and country
    const requiredFields: Array<{ key: keyof typeof newAddress; label: string }> = [
      { key: 'label', label: 'Address Type' },
      { key: 'street', label: 'Flat / House no / Building name' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'Pincode' },
    ];
    for (const field of requiredFields) {
      const value = newAddress[field.key];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }
    setSavingAddress(true);
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    try {
      if (editAddressId) {
        await apiRequest(`/api/customers/${userId}/addresses/${editAddressId}`, 'PUT', newAddress, token);
      } else {
        await apiRequest(`/api/customers/${userId}/addresses`, 'POST', newAddress, token);
      }
      setAddAddressOpen(false);
      setEditAddressId(null);
      setNewAddress({
        label: 'Home', street: '', city: '', state: '', pincode: '', country: 'India', landmark: '', location: { lat: 26.2389, lng: 73.0243 }
      });
      setTimeout(() => fetchAddresses(), 300);
    } catch {
      // handle error
    } finally {
      setSavingAddress(false);
    }
  };

  // Select address for order (now just sets selected, does not place order)
  const handleSelectAddress = (idx: number) => {
    setSelectedAddressIdx(idx);
    setAddressDialogOpen(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Product) => {
    setSearchInput(suggestion.name);
    setShowSuggestions(false);
  };

  const handleSearchFocus = () => {
    if (searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  // Place order after address is selected
  const handlePlaceOrderAfterAddress = async () => {
    console.log(cart)
    if (selectedAddressIdx == null || !addresses[selectedAddressIdx]) {
      return;
    }
    setPlacingOrder(true);
    setOrderMsg(null);
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      setOrderMsg("User ID or token is missing.");
      setPlacingOrder(false);
      return;
    }
    const selectedAddress = addresses[selectedAddressIdx];
    const orderData = {
      addressId: selectedAddress._id || selectedAddress.id,
      paymentMode: 'Cash on Delivery',
    };
    try {
      await apiRequest("/api/orders", "POST", orderData, token);
      setOrderMsg("Order placed successfully!");
      setCart({});
      setCartOpen(false);
      setOrderSuccessModal(true);
      setSelectedAddressIdx(null);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setOrderMsg((error as { message?: string }).message || "Failed to place order");
      } else {
        setOrderMsg("Failed to place order");
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-200 p-0">
      <div className="w-full sticky top-[70px] z-100 bg-transparent">
        <div className="flex justify-center items-center py-3 px-2 pb-10">
          <div className="w-full max-w-xl sm:max-w-xl max-w-full">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search for products..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="text-green-600" />
                  </InputAdornment>
                ),
                endAdornment: (
                  searchInput && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      className="focus:outline-none text-gray-400 hover:text-green-600 transition"
                      onClick={clearSearch}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )
                ),
              }}
              className="bg-white rounded-full shadow border border-green-200 focus-within:border-green-500 transition-all text-base sm:text-lg"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9999px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px 0 rgba(16, 185, 129, 0.08)',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 16px 0 rgba(16, 185, 129, 0.12)',
                  },
                  '&.Mui-focused': {
                    borderColor: '#22c55e',
                    boxShadow: '0 4px 16px 0 rgba(16, 185, 129, 0.16)',
                  },
                },
                '& input': {
                  paddingLeft: '0.75rem',
                  paddingRight: '0.75rem',
                },
              }}
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-green-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion._id}
                    className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <SearchIcon className="text-green-500 text-sm" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{suggestion.name}</div>
                      <div className="text-sm text-gray-500">{suggestion.category}</div>
                    </div>
                    <div className="text-green-600 font-semibold">₹{suggestion.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <IconButton onClick={() => setCartOpen(true)} sx={{ ml: 2, background: '#fff', boxShadow: 2 }}>
            <Badge badgeContent={cartItemsArr.length} color="primary">
              <ShoppingCartIcon fontSize="large" />
            </Badge>
          </IconButton>
        </div>
      </div>
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-10">
          <CircularProgress />
        </div>
      ) : (
        <>
          {/* Show search results above all products, filter out duplicates */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <div className="text-green-700 font-semibold mb-2">Search Results</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {searchResults.map(product => (
                  <div key={product._id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition p-4 flex flex-col items-center group relative border border-green-100">
                    {/* <img
                      // src={product.image || '/groceryLogo.jpg'}
                      src="https://storage.googleapis.com/grocery_image/about-pic.png"
                      alt={product.name}
                      className="h-28 w-28 object-contain mb-3 rounded-xl group-hover:scale-105 transition"
                      onError={e => (e.currentTarget.src = '/groceryLogo.jpg')}
                    /> */}
                    <Image
                      src={product.image || '/groceryLogo.jpg'}
                      alt={product.name}
                      width={112}
                      height={112}
                      unoptimized
                      className="h-28 w-28 object-contain mb-3 rounded-xl group-hover:scale-105 transition"
                      onError={(e) => (e.currentTarget.src = '/groceryLogo.jpg')}
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
                              className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-300 hover:bg-green-200 transition cursor-pointer"
                              onClick={() => handleDecrement(product._id)}
                            >-</button>
                            <span className="text-green-800 font-bold text-lg px-2">{cart[product._id]}</span>
                            <button
                              className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-700 hover:bg-green-700 transition cursor-pointer"
                              onClick={() => handleIncrement(product._id)}
                            >+</button>
                          </>
                        ) : (
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition cursor-pointer"
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
              <hr className="my-8 border-t-2 border-green-200" />
            </div>
          )}
          {/* All products, excluding those already in search results */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {products.filter(p => !searchResults.some(s => s._id === p._id)).map(product => (
                <div key={product._id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition p-4 flex flex-col items-center group relative border border-green-100">
                  {/* <img
                    // src={product.image || '/groceryLogo.jpg'}
                    src="https://storage.googleapis.com/grocery_image/about-pic.png"
                    alt={product.name}
                    className="h-28 w-28 object-contain mb-3 rounded-xl group-hover:scale-105 transition"
                    onError={e => (e.currentTarget.src = '/groceryLogo.jpg')}
                  /> */}
                  <Image
                    src={product.image || '/groceryLogo.jpg'}
                    alt={product.name}
                    width={112}
                    height={112}
                    unoptimized
                    className="h-28 w-28 object-contain mb-3 rounded-xl group-hover:scale-105 transition"
                    onError={(e) => (e.currentTarget.src = '/groceryLogo.jpg')}
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
                            className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-300 hover:bg-green-200 transition cursor-pointer"
                            onClick={() => handleDecrement(product._id)}
                          >-</button>
                          <span className="text-green-800 font-bold text-lg px-2">{cart[product._id]}</span>
                          <button
                            className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-green-700 hover:bg-green-700 transition cursor-pointer"
                            onClick={() => handleIncrement(product._id)}
                          >+</button>
                        </>
                      ) : (
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition cursor-pointer"
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
          )}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <CircularProgress />
            </div>
          )}
        </>
      )}
      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 400, md: 480, lg: 520 }, p: 2, background: '#f8fafc' } }}>
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Step 1: Cart, Step 2: Address selection */}
          {addressDialogOpen ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => setAddressDialogOpen(false)} sx={{ color: '#222', mr: 1 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Select delivery address</Typography>
              </Box>
              <Box sx={{ px: 0, pb: 2, flex: 1, overflowY: 'auto' }}>
                <Button fullWidth variant="outlined" sx={{ borderRadius: 3, borderColor: '#22c55e', color: '#16a34a', fontWeight: 'bold', mb: 2, py: 2, fontSize: 18, background: '#fff', '&:hover': { background: '#f0fdf4', borderColor: '#16a34a' }, cursor: 'pointer' }}
                  onClick={() => { setAddAddressOpen(true); setEditAddressId(null); }}
                >
                  <span style={{ fontSize: 28, marginRight: 12, color: '#22c55e', verticalAlign: 'middle' }}>+</span> Add a new address
                </Button>
                <Typography sx={{ color: '#888', fontWeight: 500, mb: 1, ml: 1 }}>Your saved address</Typography>
                {addresses.length === 0 ? (
                  <Typography sx={{ color: '#888', fontWeight: 500, mb: 2, ml: 1 }}>No saved address. Please add new.</Typography>
                ) : (
                  addresses.map((addr, idx) => (
                    <Box key={addr.id ? String(addr.id) : undefined} sx={{ display: 'flex', alignItems: 'center', background: selectedAddressIdx === idx ? '#f0fdf4' : '#fff', borderRadius: 3, p: 2, mb: 2, boxShadow: 1, border: selectedAddressIdx === idx ? '2px solid #22c55e' : undefined, cursor: 'pointer' }}
                      onClick={() => handleSelectAddress(idx)}
                    >
                      <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 2, background: '#f3f4f6' }}>
                        {addr.icon === 'home' ? (
                          <HomeIcon sx={{ color: '#eab308', fontSize: 28 }} />
                        ) : (
                          <LocationOnIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: 18 }}>{addr.label}</Typography>
                        <Typography sx={{ color: '#666', fontSize: 15, mt: 0.5 }}>{addr.address}</Typography>
                      </Box>
                      <IconButton size="small" sx={{ color: '#16a34a', ml: 1, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleEditAddress(idx, addr); }}>
                        <EditIcon />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>My Cart</Typography>
                <IconButton
                  aria-label="Close cart"
                  onClick={() => setCartOpen(false)}
                  sx={{ color: '#6b7280', ml: 1 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </IconButton>
              </Box>
              {cartItemsArr.length === 0 ? (
                <Typography>Your cart is empty.</Typography>
              ) : (
                <>
                  <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                    {cartItemsArr.map(({ product, quantity }) => (
                      <Box key={product._id} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1, borderRadius: 2, background: '#fff', boxShadow: 1, minHeight: 80 }}>
                        {/* Cross icon for remove at top-right, inside card, small and simple */}
                        <IconButton
                          size="small"
                          onClick={() => setCart(prevCart => { const { [product._id]: _unused, ...rest } = prevCart; return rest; })}
                          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#b0b0b0', background: 'transparent', p: 0.5, '&:hover': { color: '#ef4444', background: 'transparent' }, cursor: 'pointer' }}
                          aria-label="Remove from cart"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" stroke="currentColor" width="18" height="18">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l8 8M6 14L14 6" />
                          </svg>
                        </IconButton>
                        {/* <img
                          // src={product.image || '/groceryLogo.jpg'}
                          src="https://storage.googleapis.com/grocery_image/about-pic.png"
                          alt={product.name}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                          onError={e => (e.currentTarget.src = '/groceryLogo.jpg')}
                        /> */}
                        <Image
                          src={product.image || '/groceryLogo.jpg'}
                          alt={product.name}
                          width={56}
                          height={56}
                          unoptimized
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                          onError={(e) => (e.currentTarget.src = '/groceryLogo.jpg')}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} sx={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 18, lineHeight: 1.2 }}>{product.name}</Typography>
                          {product.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.2 }}>{product.description}</Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">Price: ₹{product.price.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button variant="contained" size="small" sx={{ minWidth: 0, background: '#f472b6', color: '#fff', fontWeight: 'bold', '&:hover': { background: '#ec4899' } }} onClick={() => handleDecrement(product._id)}>-</Button>
                          <Typography sx={{ mx: 1, fontWeight: 600 }}>{quantity}</Typography>
                          <Button variant="contained" size="small" sx={{ minWidth: 0, background: '#f472b6', color: '#fff', fontWeight: 'bold', '&:hover': { background: '#ec4899' } }} onClick={() => handleIncrement(product._id)}>+</Button>
                        </Box>
                        <Typography fontWeight={700} color="primary.main" sx={{ minWidth: 70, textAlign: 'right', wordBreak: 'break-word' }}>₹{(product.price * quantity).toFixed(2)}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography fontWeight={600}>Bill details</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography color="text.secondary">Items total</Typography>
                      <Typography>₹{cartTotal.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography color="text.secondary">Delivery charge</Typography>
                      <Typography className={`${cartTotal > 599 && 'text-green-600'}`}>
                        {cartTotal < 599 ? `₹20` : "Free"}
                        {cartTotal < 599 && <span className="text-xs text-gray-500"> (Free above ₹599)</span>}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography color="text.secondary">Handling charge</Typography>
                      <Typography>₹4</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <Typography>Grand total</Typography>
                      <Typography>₹{(cartTotal + (cartTotal < 599 ? 20 : 0) + 4).toFixed(2)}</Typography>
                    </Box>
                  </Box>
                  {selectedAddressIdx == null ? (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      sx={{ fontWeight: 'bold', fontSize: 18, py: 1.5, borderRadius: 2, mb: 2, cursor: 'pointer' }}
                      onClick={() => { fetchAddresses(); setAddressDialogOpen(true); }}
                      disabled={placingOrder}
                    >
                      Select Delivery Address
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      sx={{ fontWeight: 'bold', fontSize: 18, py: 1.5, borderRadius: 2, mb: 2, cursor: 'pointer' }}
                      onClick={handlePlaceOrderAfterAddress}
                      disabled={placingOrder}
                    >
                      {placingOrder ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  )}
                  {orderMsg && <Typography sx={{ color: (orderMsg && orderMsg.includes('success')) ? '#10b981' : '#f44336', fontWeight: 'bold', mt: 2 }}>{orderMsg}</Typography>}
                </>
              )}
            </>
          )}
          {/* Add Address Modal */}
          <Dialog open={addAddressOpen} onClose={() => { setAddAddressOpen(false); setEditAddressId(null); }} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', fontSize: 22 }}>Enter complete address</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, p: 2 }}>
              {/* Map Section */}
              <Box
                sx={{
                  width: '100%',
                  maxWidth: { xs: '100%', md: 400 },
                  height: { xs: 280, md: 320 },
                  minHeight: 200,
                  mb: { xs: 1, md: 0 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  alignSelf: { xs: 'center', md: 'flex-start' },
                }}
              >
                <Button variant="outlined" sx={{ mt: 1, borderRadius: 2, mb: 2, color: '#16a34a', borderColor: '#22c55e', fontWeight: 'bold', width: '100%', cursor: 'pointer' }} onClick={() => navigator.geolocation.getCurrentPosition(pos => setNewAddress(addr => ({ ...addr, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } })))}>
                  Go to current location
                </Button>
                {isLoaded && (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 12 }}
                    center={{ lat: newAddress.location.lat, lng: newAddress.location.lng }}
                    zoom={15}
                    onClick={(e: google.maps.MapMouseEvent) => {
                      const lat = e.latLng?.lat();
                      const lng = e.latLng?.lng();
                      if (lat !== undefined && lng !== undefined) {
                        setNewAddress(addr => ({ ...addr, location: { lat, lng } }));
                      }
                    }}
                    options={{ disableDefaultUI: true }}
                  >
                    <Marker position={{ lat: newAddress.location.lat, lng: newAddress.location.lng }} />
                  </GoogleMap>
                )}
              </Box>

              {/* Form Section */}
              <Box sx={{ flex: 1, minWidth: 320 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {['Home', 'Work', 'Other'].map(type => (
                    <Button key={type} variant={newAddress.label === type ? 'contained' : 'outlined'} sx={{ borderRadius: 2, fontWeight: 'bold', background: newAddress.label === type ? '#22c55e' : '#fff', color: newAddress.label === type ? '#fff' : '#222', borderColor: '#22c55e' }} onClick={() => setNewAddress(addr => ({ ...addr, label: type }))}>{type}</Button>
                  ))}
                </Box>
                <TextField label="Flat / House no / Building name" value={newAddress.street} onChange={e => setNewAddress(addr => ({ ...addr, street: e.target.value }))} fullWidth required sx={{ mb: 2 }} />
                <TextField label="City" value={newAddress.city} onChange={e => setNewAddress(addr => ({ ...addr, city: e.target.value }))} fullWidth required sx={{ mb: 2 }} />
                <TextField label="State" value={newAddress.state} onChange={e => setNewAddress(addr => ({ ...addr, state: e.target.value }))} fullWidth required sx={{ mb: 2 }} />
                <TextField label="Pincode" value={newAddress.pincode} onChange={e => setNewAddress(addr => ({ ...addr, pincode: e.target.value }))} fullWidth required sx={{ mb: 2 }} />
                <TextField label="Country" disabled value={newAddress.country} onChange={e => setNewAddress(addr => ({ ...addr, country: e.target.value }))} fullWidth sx={{ mb: 2 }} />
                <TextField label="Landmark (optional)" value={newAddress.landmark} onChange={e => setNewAddress(addr => ({ ...addr, landmark: e.target.value }))} fullWidth sx={{ mb: 2 }} />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAddAddressOpen(false)} sx={{ color: '#222', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</Button>
              <Button onClick={handleSaveAddress} sx={{ color: '#fff', fontWeight: 'bold', backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' }, cursor: 'pointer' }} disabled={savingAddress}>
                {savingAddress ? 'Saving...' : 'Save Address'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Drawer>
      {/* Order Success Modal */}
          <Dialog open={orderSuccessModal} onClose={() => setOrderSuccessModal(false)} maxWidth="xs" fullWidth
            PaperProps={{
              style: {
                backgroundColor: '#fff',
                color: '#222',
                borderRadius: 12,
                textAlign: 'center',
                padding: 24,
              },
            }}
          >
            <DialogTitle sx={{ color: '#22c55e', fontWeight: 'bold', fontSize: 22, pb: 0 }}>Your order was placed!</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                {/* Simple animation: checkmark bounce */}
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="40" fill="#22c55e" fillOpacity="0.15" />
                  <path d="M24 42L36 54L56 34" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Typography sx={{ mt: 2, fontWeight: 600, fontSize: 18 }}>Thank you for shopping with us!</Typography>
                <Typography sx={{ color: '#888', mt: 1 }}>You will receive a confirmation soon.</Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={() => setOrderSuccessModal(false)} sx={{ color: '#fff', fontWeight: 'bold', backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' }, cursor: 'pointer' }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
    </div>
  );
};

export default CustomerDashboard;
