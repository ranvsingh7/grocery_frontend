"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/utils/api";
import { CustomJwtPayload } from "@/types/types";
import { TextField, Select, MenuItem, InputLabel, FormControl, Box, IconButton, CircularProgress } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { getDecodedToken } from "@/utils/auth";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  image?: string;
  price: number;
  stock: number;
}

const AdminProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState<boolean | "add" | "edit">(false);
  const [formData, setFormData] = useState({ name: "", category: "", description: "", image: "", price: 0, stock: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [hasMoreProducts, setHasMoreProducts] = useState(true); // Track if more products are available

  useEffect(() => {
    setProducts([]); // Reset products state to avoid duplicates
    fetchProducts();
    fetchCategories(); // Fetch categories only once on mount
  }, []);

  let token: string | null = null;
  let userId: string | null = null;

  // Initialize token and userId in a global scope
  const initializeAuth = () => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    userId = decoded?.id || null;
    token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
  };

  const fetchProducts = async (page = 1, limit = 24) => {
    initializeAuth();

    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest<{ products: Product[]; totalProducts: number }>(
        `/api/products?page=${page}&limit=${limit}`,
        "GET",
        undefined,
        token
      );

      setProducts((prevProducts) => {
        const allProducts = [...prevProducts, ...response.products];
        const uniqueProducts = allProducts.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p._id === product._id)
        );
        return uniqueProducts;
      });
      setHasMoreProducts(response.products.length > 0);
    } catch (error) {
      setError("Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      return;
    }
    try {
      const response = await apiRequest<any[]>("/api/categories", "GET", undefined, token);
      // Handle array of strings or array of objects with 'name' property
      let uniqueCategories: string[] = [];
      if (Array.isArray(response)) {
        if (typeof response[0] === "string") {
          uniqueCategories = Array.from(new Set(response));
        } else if (typeof response[0] === "object" && response[0] !== null && "name" in response[0]) {
          uniqueCategories = Array.from(new Set(response.map((cat) => cat.name)));
        }
      }
      setCategories(uniqueCategories);
    } catch (error) {
      // Error fetching categories
    }
  };

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | React.ChangeEvent<{ name?: string; value: unknown }>
      | any
  ) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleEdit = (product: Product) => {
    setShowProductModal("edit");
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      image: product.image || "",
      price: product.price,
      stock: product.stock,
    });
  };

  const handleDelete = async (id: string) => {
    initializeAuth();

    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }
    try {
        await apiRequest(`/api/products/${id}`, "DELETE", undefined, token);
      setProducts(products.filter((product) => product._id !== id));
        setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      // Error deleting product
    }
  };

  const handleSave = async () => {
    initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }
    try {
      if (editingProduct) {
        await apiRequest(`/api/products/${editingProduct._id}`, "PUT", formData, token);
        setShowProductModal(false);
      } else {
        await apiRequest("/api/create-product", "POST", formData, token);
      }
      setEditingProduct(null);
      setFormData({ name: "", category: "", description: "", image: "", price: 0, stock: 0 });
      fetchProducts();
    } catch (error) {
      // Error saving product
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    initializeAuth();
    if (!userId || !token) return;
    try {
      // Replace with your actual create-category endpoint
      await apiRequest("/api/categories", "POST", { name: newCategory }, token);
      setCategories((prev) => [...prev, newCategory]);
      setFormData({ ...formData, category: newCategory });
      setNewCategory("");
      setShowAddCategory(false);
    } catch (error) {
      // Error adding category
    }
  };

  const handleImageUpload = async (file: File) => {
    initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await apiRequest<{ url: string }>(
        "/api/upload-image",
        "POST",
        formData,
        token
      );
      setFormData((prev) => ({ ...prev, image: response.url }));
    } catch (error) {
      setError("Failed to upload image.");
    }
  };

  const fetchMoreProducts = async () => {
    if (loading || !hasMoreProducts) return; // Prevent multiple fetches or fetching when no more products

    setLoading(true); // Show loader during data fetch
    initializeAuth();

    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }

    try {
      const nextPage = Math.ceil(products.length / 24) + 1; // Calculate next page based on current product count
      const response = await apiRequest<{ products: Product[] }>(
        `/api/products?page=${nextPage}&limit=24`,
        "GET",
        undefined,
        token
      );

      setProducts((prevProducts) => {
        const allProducts = [...prevProducts, ...response.products];
        const uniqueProducts = allProducts.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p._id === product._id)
        );
        return uniqueProducts;
      });

      if (response.products.length === 0) {
        setHasMoreProducts(false); // No more products available
      }
    } catch (error) {
      // Error fetching more products
    } finally {
      setLoading(false); // Hide loader after data fetch
    }
  };

  let debounceTimeout: NodeJS.Timeout | null = null;

  const debouncedFetchMoreProducts = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      fetchMoreProducts();
    }, 300);
  };

  const handleScroll = () => {
    if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200 &&
        hasMoreProducts &&
        !loading
    ) {
        const nextPage = Math.ceil(products.length / 24) + 1;
        fetchProducts(nextPage);
    }
};

useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
}, [products, hasMoreProducts, loading]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gray-900 text-white p-6">
      <div className="w-full flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-6 text-pink-600">Product Management</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg" onClick={() => setShowProductModal("add")}>
          Add Product
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-yellow-600">Product List</h2>
        <div
          className="overflow-y-auto max-h-[500px]"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (!loading && hasMoreProducts && target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
              debouncedFetchMoreProducts();
            }
          }}
        >
          <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
            <thead className="sticky top-0 bg-gray-700 text-white">
              <tr className="bg-gray-700 text-white">
                <th className="px-6 py-3 text-left">S. No.</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Stock</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-gray-600">
                  <td className="px-6 py-4">{products.indexOf(product) + 1}</td>
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">₹{product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">{product.stock}</td>
                  <td className="px-6 py-4">{product.category}</td>
                  <td className="px-6 py-4">{product.description}</td>
                  <td className="px-6 py-4 flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <CircularProgress color="inherit" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* add and edit product modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-blue-600 text-center">
                {showProductModal === "edit" ? "Edit Product" : "Add Product"}
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth required sx={{ mb: 3 }}>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setShowAddCategory(true);
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                        setShowAddCategory(false);
                      }
                    }}
                    displayEmpty
                    renderValue={(selected) => {
                      if (!selected) {
                        return <span style={{ color: "#aaa" }}>Select Category</span>;
                      }
                      return selected;
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select Category
                    </MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                    <MenuItem value="__add_new__" style={{ color: "#1976d2", fontWeight: 600 }}>
                      <AddIcon fontSize="small" style={{ marginRight: 8 }} /> Add New Category
                    </MenuItem>
                  </Select>
                </FormControl>
                {showAddCategory && (
                  <Box display="flex" alignItems="center" gap={1} mb={3}>
                    <TextField
                      label="New Category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <IconButton color="primary" onClick={handleAddCategory}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                )}
                <TextField
                  label="Price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                />
                <TextField
                  label="Stock"
                  name="stock"
                  type="number"
                  value={formData.stock}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                />
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  multiline
                  rows={4}
                  sx={{ mb: 3 }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                  className="mb-4 hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer inline-block text-center"
                >
                  Upload Image
                </label>
                {formData.image && (
                  <div className="mt-4">
                    <p className="text-green-500">Image uploaded successfully!</p>
                    <Image
                      src={formData.image}
                      alt="Uploaded"
                      width={128}
                      height={128}
                      className="w-32 h-32 object-cover"
                    />  
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full mb-3"
                >
                  {showProductModal === "edit" ? "Update Product" : "Add Product"}
                </button>
              </form>
              <button
                onClick={() => setShowProductModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    // </div>
  );
};

export default AdminProductPage;
