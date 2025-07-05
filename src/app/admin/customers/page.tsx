"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "@/../../types/types";
import EditCustomerModal from "./components/EditCustomerModal";

interface Customer {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  _id: string;
  orderId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
    productName: string; // Assuming the API returns product name
  }[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface ViewOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string; // Added customer name for display
}

const ViewOrdersModal: React.FC<ViewOrdersModalProps> = ({ isOpen, onClose, customerId, customerName }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchOrders = async () => {
      initializeAuth();
      if (!userId || !token) {
        setError("User ID or token is missing.");
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest<Order[]>(
          `/api/orders/user/${customerId}`,
          "GET",
          undefined,
          token
        );
        // update product name by product id  
        // Assuming the API returns orders with product IDs, you might need to fetch product details separately
        setOrders(response);
      } catch (err) {
        // Error fetching orders
        setError("No orders found for this customer or an error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-11/12 max-w-4xl  overflow-y-auto max-h-[80vh]">
        <h2 className="text-2xl font-bold pb-6 text-blue-600 sticky top-0 bg-gray-900 z-10">{customerName}`s Orders</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400">No orders found for this customer.</p>
        ) : (
          <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
            <thead className="sticky top-[3.5rem] bg-gray-700 z-10">
              <tr className="text-white">
                <th className="px-6 py-3 text-left">Order No.</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-left">Total Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-gray-600">
                  <td className="px-6 py-4">{order.orderId}</td>
                  <td className="px-6 py-4">
                    {order.items.map((item, index) => (
                      <div key={index} className={`text-gray-300 ${order.items.length === index+1 ? "":"border-b border-gray-600 pb-2 mb-2"}`}>
                        {item.productName} Qty.{item.quantity} - ₹{item.price}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-yellow-500">₹{order.totalAmount}</td>
                  <td className="px-6 py-4 text-blue-500">{order.status}</td>
                  <td className="px-6 py-4 text-gray-300">
                    {/* Date and Time  */}
                    {new Date(order.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 p-6 flex justify-end sticky bottom-0 bg-gray-900 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState<boolean>(false);
  const [editCustomerData, setEditCustomerData] = useState<Customer | null>(null);
  const [viewOrdersOpen, setViewOrdersOpen] = useState<boolean>(false);
  const [viewOrdersCustomerId, setViewOrdersCustomerId] = useState<string | null>(null);
  const [viewOrdersCustomerName, setViewOrdersCustomerName] = useState<string | null>(null);

  const fetchCustomers = async () => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id;
    const token = decoded ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1") : null;

    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest<Customer[]>(
        "/api/customers",
        "GET",
        undefined,
        token
      );
      setCustomers(response);
    } catch (fetchError) {
      setError("Failed to fetch customers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEdit = (customer: Customer) => {
    setEditCustomerData(customer);
    setEditCustomerOpen(true);
  };

  const handleModalClose = () => {
    setEditCustomerOpen(false);
    setEditCustomerData(null);
  };

  const handleCustomerUpdated = () => {
    fetchCustomers();
  };

  const handleViewOrders = (customerId: string, customerName: string) => {
    setViewOrdersCustomerId(customerId);
    setViewOrdersCustomerName(customerName);
    setViewOrdersOpen(true);
  };

  const handleViewOrdersClose = () => {
    setViewOrdersOpen(false);
    setViewOrdersCustomerId(null);
    setViewOrdersCustomerName(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customer List</h1>
      <p className="text-gray-500 mb-6">Here you can manage your customers.</p>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Mobile</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id} className="border-b border-gray-600">
                <td className="px-6 py-4">{customer.name}</td>
                <td className="px-6 py-4">{customer.email}</td>
                <td className="px-6 py-4">{customer.mobile}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleViewOrders(customer._id, customer.name)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg ml-2"
                  >
                    View Orders
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editCustomerOpen && editCustomerData && (
        <EditCustomerModal
          isOpen={editCustomerOpen}
          onClose={handleModalClose}
          customerId={editCustomerData._id}
          initialData={{
            name: editCustomerData.name,
            email: editCustomerData.email,
            mobile: editCustomerData.mobile,
          }}
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}

      {viewOrdersOpen && viewOrdersCustomerId && (
        <ViewOrdersModal
          isOpen={viewOrdersOpen}
          onClose={handleViewOrdersClose}
          customerId={viewOrdersCustomerId}
          customerName={viewOrdersCustomerName || ""} // Pass customer name for display
        />
      )}
    </div>
  );
};

export default CustomerList;
