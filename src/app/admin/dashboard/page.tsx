"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../../types/types";
import { Button, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Card, CardContent, Divider, Select, MenuItem } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import io from "socket.io-client";
import { InvoiceDownloadButton } from "@/components/Invoice";

interface OrderItem {
  productId: string | { _id: string; name: string };
  productName?: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderId: string;
  userId: string | { name: string; email?: string; mobile?: string }; // Accepts either string or populated object
  status: string;
  items: OrderItem[];
  totalAmount: number;
  address: string;
  paymentMode: string;
  geoCoordinates: { type: string; coordinates: [number, number] };
  createdAt: string;
}

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-900',
  Processing: 'bg-blue-500',
  Shipped: 'bg-purple-500',
  Delivered: 'bg-green-500',
  Cancelled: 'bg-red-500',
};

const SOCKET_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5001"
  : "https://your-production-backend-url";

const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    newOrders: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // New state for new order modal
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newOrderInfo, setNewOrderInfo] = useState<{ orderId: string; totalAmount: number } | null>(null);
  // Audio ref for notification
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // State for update status modal
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusCurrent, setStatusCurrent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Added filter state
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    // Initialize audio object for notification
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.wav');
      audioRef.current.loop = true; // Enable looping
    }
    fetchOrders();
  }, []);

  // Ensure loop is always set before playing
  useEffect(() => {
    if (!newOrderModalOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
    }
  }, [newOrderModalOpen]);

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Listen for newOrder event
    socket.on("newOrder", (order: { orderId: string; totalAmount: number }) => {
      console.log('Received newOrder event:', order); // Debug log
      
      // Show browser notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('New Order Received', {
            body: `Order #${order.orderId} placed. Amount: ₹${order.totalAmount}`,
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('New Order Received', {
                body: `Order #${order.orderId} placed. Amount: ₹${order.totalAmount}`,
              });
            } else {
              alert('New order received — please check.');
            }
          });
        } else {
          alert('New order received — please check.');
        }
      }
      // Show modal for new order
      setNewOrderInfo(order);
      setNewOrderModalOpen(true);
      // Play notification sound in loop
      if (audioRef.current) {
        audioRef.current.pause(); // Stop if already playing
        audioRef.current.currentTime = 0;
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => {});
      }
      // Optionally, refresh orders
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop sound when modal is closed
  const handleCloseNewOrderModal = () => {
    setNewOrderModalOpen(false);
    setNewOrderInfo(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
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

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(null);
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest<{ orders: Order[]; totalPages: number }>(
        `/api/all-orders?page=${page}&limit=24`,
        "GET",
        undefined,
        token
      );
      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
      // Calculate analytics
      const analyticsData = {
        totalOrders: response.orders.length,
        totalRevenue: response.orders.reduce((sum, o) => sum + o.totalAmount, 0),
        pending: response.orders.filter(o => o.status === "Pending").length,
        processing: response.orders.filter(o => o.status === "Processing").length,
        shipped: response.orders.filter(o => o.status === "Shipped").length,
        delivered: response.orders.filter(o => o.status === "Delivered").length,
        cancelled: response.orders.filter(o => o.status === "Cancelled").length,
        newOrders: response.orders.filter(o => o.status === "Pending").length,
      };
      setAnalytics(analyticsData);
    } catch (error: any) {
      setError(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Updated fetchFilteredOrders to append new orders instead of overwriting

  const fetchFilteredOrders = async (status: string | null, page = 1) => {
    setLoading(true);
    setError(null);
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest<{ orders: Order[]; totalPages: number }>(
        `/api/all-orders?page=${page}&limit=24${status ? `&status=${status}` : ''}`,
        "GET",
        undefined,
        token
      );
      setOrders((prevOrders) => page === 1 ? response.orders : [...prevOrders, ...response.orders]);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
    } catch (error: any) {
      setError(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreOrders = async () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      const { userId, token } = initializeAuth();
      if (!userId || !token) return;
      try {
        const response = await apiRequest<{ orders: Order[]; totalPages: number }>(
          `/api/all-orders?page=${nextPage}&limit=24`,
          "GET",
          undefined,
          token
        );
        setOrders((prevOrders) => [...prevOrders, ...response.orders]);
        setTotalPages(response.totalPages);
        setCurrentPage(nextPage);
      } catch (error) {
        console.error("Failed to fetch more orders", error);
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    setUpdatingOrderId(orderId);
    try {
      await apiRequest(`/api/orders/${orderId}/status`, "PUT", { status: newStatus }, token);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
      fetchOrders();
    } catch (error) {
      alert("Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper to get customer name
  const getCustomerName = (userId: string | { name: string }): string => {
    if (typeof userId === 'object' && userId.name) return userId.name;
    if (typeof userId === 'string') return userId;
    return '';
  };

  // Fetch order details (with customer info) when clicking order number
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
  };

  // Handler to open update status modal
  const handleOpenUpdateStatusModal = (orderId: string, currentStatus: string) => {
    setStatusOrderId(orderId);
    setStatusCurrent(currentStatus);
    setUpdateStatusModalOpen(true);
  };

  // Handler to update status from modal
  const handleUpdateStatus = (newStatus: string) => {
    if (statusOrderId && newStatus && newStatus !== statusCurrent) {
      handleStatusChange(statusOrderId, newStatus);
    }
    setUpdateStatusModalOpen(false);
    setStatusOrderId(null);
    setStatusCurrent("");
  };

  // Handler for filter change
  const handleFilterChange = (status: string | null) => {
    setFilterStatus(status);
    fetchFilteredOrders(status);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gray-900 text-white p-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Select
          value={filterStatus || ''}
          onChange={(e) => handleFilterChange(e.target.value || null)}
          displayEmpty
          sx={{ backgroundColor: '#f3f4f6', color: '#000', borderRadius: 1, height: '40px', width: '200px' }}
        >
          <MenuItem value="">All</MenuItem>
          {ORDER_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>{status}</MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', height: '40px' }}
          onClick={() => handleFilterChange(null)}
        >
          Clear Filter
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4 text-blue-300">All Orders</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div
            className="overflow-y-auto max-h-[500px]"
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              if (target.scrollHeight - target.scrollTop === target.clientHeight && currentPage < totalPages) {
                fetchFilteredOrders(filterStatus, currentPage + 1);
              }
            }}
          >
            <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
              <thead className="sticky top-0 bg-gray-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Order No.</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={`${order._id}-${index}`} className="border-b border-gray-600">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleOrderClick(order)}
                        className="text-blue-400 hover:underline cursor-pointer"
                      >
                        {order.orderId}
                      </button>
                    </td>
                    <td className="px-4 py-2">{getCustomerName(order.userId)}</td>
                    <td className="px-4 py-2">₹{order.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <Tooltip title="Click to change status" arrow>
                        <span
                          className={`px-3 py-1 rounded text-white font-semibold ${STATUS_COLORS[order.status]} cursor-pointer`}
                          onClick={() => handleOpenUpdateStatusModal(order._id, order.status)}
                        >
                          {order.status}
                        </span>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <CircularProgress color="inherit" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal for order details */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth
        PaperProps={{
          style: {
            backgroundColor: '#1f2937',
            color: 'white',
            borderRadius: 12,
          },
        }}
      >
        <DialogTitle sx={{ color: '#10b981', fontWeight: 'bold', fontSize: 22, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          <span>Order Details</span>
          <Button onClick={handleCloseModal} sx={{ minWidth: 0, color: '#fff' }}>
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent>
          {selectedOrder ? (
            <Box>
              <Card sx={{ mt: 2, mb: 2, background: '#111827', color: 'white', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#60a5fa', mb: 1 }}>
                    Customer Details
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <span className="font-semibold text-green-400">Name:</span> {typeof selectedOrder.userId === 'object' ? selectedOrder.userId.name : selectedOrder.userId}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <span className="font-semibold text-yellow-400">Mobile:</span> {typeof selectedOrder.userId === 'object' ? selectedOrder.userId.mobile : ''}
                  </Typography>
                  <Typography>
                    <span className="font-semibold text-blue-400">Email:</span> {typeof selectedOrder.userId === 'object' ? selectedOrder.userId.email : ''}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ background: '#111827', color: 'white', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#f59e0b', mb: 1 }}>
                    Order Details
                  </Typography>
                  <Typography>Order No: <span className="text-green-400">{selectedOrder.orderId}</span></Typography>
                  <Typography>Status: <span className="text-pink-400">{selectedOrder.status}</span></Typography>
                  <Typography>Total: <span className="text-blue-400">₹{selectedOrder.totalAmount.toFixed(2)}</span></Typography>
                  <Typography>Address: {selectedOrder.address}</Typography>
                  <Typography>Payment Mode: {selectedOrder.paymentMode}</Typography>
                  <Typography>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</Typography>
                  {/* Download Invoice Button */}
              <div style={{ marginBlock: 16 }}>
                <InvoiceDownloadButton
                  store={{
                    name: "Rocket Store",
                    gstin: "27AAAPL1234C1ZV",
                    address: "109, prem nagar, digari kallan, Jodhpur, Rajasthan, 342001",
                    contact: "+91-7877763051"
                  }}
                  user={{
                    name:
                      typeof selectedOrder.userId === "object" && selectedOrder.userId.name
                        ? selectedOrder.userId.name
                        : typeof selectedOrder.userId === "string"
                        ? selectedOrder.userId
                        : "Customer",
                    address: selectedOrder.address,
                    mobile:
                      typeof selectedOrder.userId === "object" && selectedOrder.userId.mobile
                        ? selectedOrder.userId.mobile
                        : ""
                  }}
                  order={{
                    orderId: selectedOrder.orderId,
                    createdAt: selectedOrder.createdAt,
                    items: selectedOrder.items.map(item => ({
                      productName: item.productName || (typeof item.productId === 'object' && item.productId ? item.productId.name : ""),
                      quantity: item.quantity,
                      price: item.price
                    })),
                    totalAmount: selectedOrder.totalAmount,
                    deliveryCharge: (selectedOrder as any).deliveryCharge,
                    handlingCharge: (selectedOrder as any).handlingCharge,
                    paymentMode: selectedOrder.paymentMode,
                    status: selectedOrder.status
                  }}
                  buttonText="Print"
                />
              </div>
                  <Divider sx={{ my: 1, background: '#374151' }} />
                  <Typography variant="subtitle1" sx={{ color: '#10b981' }}>Products:</Typography>
                  {selectedOrder.items.map((item, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography>- {item.productName || (typeof item.productId === 'object' ? item.productId.name : item.productId)} x {item.quantity} (₹{item.price})</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
              {/* Status change buttons inside modal, only if not delivered */}
              {selectedOrder.status !== 'Delivered' && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  {ORDER_STATUSES.filter(s => s !== selectedOrder.status).map(status => (
                    <Button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder._id, status)}
                      variant="contained"
                      sx={{
                        backgroundColor: STATUS_COLORS[status].replace('bg-', '').replace('-500', ''),
                        color: '#fff',
                        fontWeight: 'bold',
                        opacity: updatingOrderId === selectedOrder._id ? 0.5 : 1,
                        cursor: updatingOrderId === selectedOrder._id ? 'not-allowed' : 'pointer',
                        '&:hover': { filter: 'brightness(1.1)' },
                      }}
                      disabled={updatingOrderId === selectedOrder._id}
                    >
                      {status}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ background: '#111827' }}>
          {/* Removed Close button as requested */}
        </DialogActions>
      </Dialog>
      {/* Modal for new order notification */}
      <Dialog open={newOrderModalOpen} onClose={handleCloseNewOrderModal} maxWidth="xs" fullWidth
        PaperProps={{
          style: {
            backgroundColor: '#1f2937',
            color: 'white',
            borderRadius: 12,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 20, background: '#111827' }}>
          New Order Alert
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ color: '#10b981', mb: 2 }}>
            New order received — please check.
          </Typography>
          {newOrderInfo && (
            <Typography sx={{ color: '#60a5fa' }}>
              Order No: <span
                className="text-green-400 cursor-pointer underline"
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => {
                  // Find the order in the orders list and open the details modal
                  const foundOrder = orders.find(o => o.orderId === newOrderInfo.orderId);
                  if (foundOrder) {
                    setSelectedOrder(foundOrder);
                    setModalOpen(true);
                    setNewOrderModalOpen(false);
                    // Stop the sound as well
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                      audioRef.current.loop = false;
                    }
                  }
                }}
              >{newOrderInfo.orderId}</span><br />
              Amount: <span className="text-blue-400">₹{newOrderInfo.totalAmount}</span>
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ background: '#111827' }}>
          <Button onClick={handleCloseNewOrderModal} sx={{ color: '#fff', fontWeight: 'bold' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* Update Status Modal */}
      <Dialog open={updateStatusModalOpen} onClose={() => setUpdateStatusModalOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{
          style: {
            backgroundColor: '#1f2937',
            color: 'white',
            borderRadius: 12,
          },
        }}
      >
        <DialogTitle sx={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 20, background: '#111827' }}>
          Update Order Status
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Select new status:</Typography>
          {ORDER_STATUSES.filter(s => s !== statusCurrent).map(status => (
            <Button
              key={status}
              onClick={() => handleUpdateStatus(status)}
              variant="contained"
              sx={{
                backgroundColor: STATUS_COLORS[status].replace('bg-', '').replace('-500', ''),
                color: '#fff',
                fontWeight: 'bold',
                m: 1,
              }}
            >
              {status}
            </Button>
          ))}
        </DialogContent>
        <DialogActions sx={{ background: '#111827' }}>
          <Button onClick={() => setUpdateStatusModalOpen(false)} sx={{ color: '#fff', fontWeight: 'bold' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
