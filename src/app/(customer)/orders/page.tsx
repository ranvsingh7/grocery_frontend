"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../../types/types";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { InvoiceDownloadButton } from "@/components/Invoice";
import { CircleX } from "lucide-react";

interface OrderItem {
  productId: string | { _id: string; name: string };
  productName?: string;
  productImage?: string;
  quantity: number;
  price: number;
}

interface AddressObj {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface UserObj {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
}

interface Order {
  _id: string;
  orderId: string;
  userId: string | UserObj;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  address: string;
  addresses?: AddressObj[];
  paymentMode: string;
  geoCoordinates: { type: string; coordinates: [number, number] };
  createdAt: string;
  deliveryCharge?: number;
  handlingCharge?: number;
}

interface User {
  _id: string;
  name?: string;
  email?: string;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userInfo, setUserInfo] = useState<{ name: string; mobile: string }>({ name: "", mobile: "" });
  const PAGE_SIZE = 24;
  // Fetch user info for invoice
  useEffect(() => {
    const fetchUserInfo = async () => {
      const decoded = getDecodedToken<CustomJwtPayload>("token");
      const userId = decoded?.id;
      const token = decoded
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
      if (!userId || !token) return;
      try {
        const res = await apiRequest(`/api/get-customer/${userId}`, "GET", undefined, token);
        // User model: { name, email, mobile, ... }
        if (res && typeof res === 'object') {
          const anyRes = res as any;
          setUserInfo({ name: anyRes.name || "", mobile: anyRes.mobile || "" });
        }
      } catch (e) {
        // ignore
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    fetchOrders(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async (pageNum = 1, replace = false) => {
    if (!hasMore && !replace) return;
    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id || null;
    const token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    try {
      const response = await apiRequest<Order[]>(`/api/orders?page=${pageNum}&limit=${PAGE_SIZE}`, "GET", undefined, token);
      if (Array.isArray(response)) {
        if (replace) {
          setOrders(response);
        } else {
          setOrders(prev => [...prev, ...response]);
        }
        setHasMore(response.length === PAGE_SIZE);
        setPage(pageNum);
      } else {
        if (replace) setOrders([]);
        setHasMore(false);
      }
    } catch (error: any) {
      setError(error.message || "Failed to fetch orders");
    } finally {
      if (replace) setLoading(false);
      setLoadingMore(false);
    }
  };
  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200 &&
        hasMore &&
        !loading &&
        !selectedOrder
      ) {
        fetchOrders(page + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, hasMore, loading, selectedOrder]);

console.log("Orders fetched:", orders);

  return (
    <div className="min-h-screen bg-[#f6f7fa] flex">
      {/* Sidebar removed as per user request */}
      <main className="flex-1 flex flex-col items-center py-10 relative">
        {/* Back button at top left */}
          <button
            className="absolute top-0 left-0 bg-gray-300 hover:bg-gray-400 rounded-full p-2 cursor-pointer border border-gray-400 shadow mt-2 ml-2 z-10"
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/dashboard')}
            aria-label="Back"
          >
            <ArrowBackIcon className="!text-gray-800" />
          </button>
        <div className="w-full max-w-2xl relative">
          {!selectedOrder ? (
            <>
              <h1 className="text-2xl font-bold mb-6 text-gray-900 text-center">My Orders</h1>
              {error ? (
                <div className="text-red-600 text-center py-10">{error}</div>
              ) : orders.length === 0 && !loading ? (
                <div className="text-gray-600 text-center py-10">No orders found.</div>
              ) : (
                <>
                  {/* Deduplicate orders by _id to avoid duplicate key warning */}
                  {(() => {
                    const seen = new Set();
                    const uniqueOrders = orders.filter(order => {
                      if (seen.has(order._id)) return false;
                      seen.add(order._id);
                      return true;
                    });
                    return (
                      <div className="space-y-6">
                        {uniqueOrders.map((order) => {
                          const isDelivered = order.status?.toLowerCase().includes("arrived") || order.status?.toLowerCase().includes("delivered");
                          const isCancelled = order.status?.toLowerCase().includes("cancel");
                          return (
                            <div
                              key={order._id}
                              className={`bg-white rounded-2xl shadow-md px-6 py-5 flex flex-col gap-2 border ${isDelivered ? 'border-green-100' : isCancelled ? 'border-red-100' : 'border-gray-100'} cursor-pointer`}
                              onClick={() => setSelectedOrder(order)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isDelivered ? (
                                    <CheckCircleIcon className="!text-green-500" fontSize="large" />
                                  ) : isCancelled ? (
                                    <CancelIcon className="!text-red-500" fontSize="large" />
                                  ) : (
                                    <ListAltIcon className="!text-gray-400" fontSize="large" />
                                  )}
                                  <div>
                                    <div className={`font-bold text-lg ${isDelivered ? 'text-green-700' : isCancelled ? 'text-red-600' : 'text-gray-800'}`}>{order.status}</div>
                                    <div className="text-gray-700 text-sm font-medium">₹{order.totalAmount.toLocaleString()} • {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                  </div>
                                </div>
                                <ArrowForwardIosIcon className="!text-gray-400" />
                              </div>
                              <div className="flex items-center gap-2 mt-2 overflow-x-auto">
                                {order.items.slice(0, 5).map((item, idx) => (
                                  <div key={idx} className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
                                    {item.productImage ? (
                                      <img
                                        src={item.productImage}
                                        alt={item.productName || 'Product'}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-700 text-center px-1 truncate w-full font-medium">
                                        {typeof item.productId === 'object' && item.productId !== null
                                          ? item.productId.name
                                          : (item.productName || '')}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {order.items.length > 5 && (
                                  <p className="text-blue-400 font-semibold">+{order.items.length - 5} more item{order.items.length - 5 > 1 ? 's' : ''}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* Loader always at the bottom of the orders list */}
                  {(loadingMore || loading) && (
                    <div className="flex justify-center py-6">
                      <span className="sr-only">Loading...</span>
                      <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl w-full p-8 relative animate-fadeIn">
              {/* Back Button */}
              <button
                className="absolute top-6 left-6 bg-gray-300 hover:bg-gray-400 rounded-full p-2 cursor-pointer border border-gray-400 shadow"
                onClick={() => setSelectedOrder(null)}
                aria-label="Back to orders"
              >
                <CircleX className="!text-gray-800" />
              </button>
              <h2 className="text-xl font-bold mb-1 pl-12 text-gray-900">Order summary</h2>
              <div className="text-green-700 text-sm mb-2 pl-12 font-semibold">
                {selectedOrder.status} at {new Date(selectedOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              {/* Download Invoice */}
              <div className="mb-4 pl-12">
                <InvoiceDownloadButton
                  store={{
                    name: "Rocket Store",
                    gstin: "27AAAPL1234C1ZV",
                    address: "109, prem nagar, digari kallan, Jodhpur, Rajasthan, 342001",
                    contact: "+91-7877763051"
                  }}
                  user={{
                    name: userInfo.name || "Customer",
                    address:
                      Array.isArray(selectedOrder.addresses) && selectedOrder.addresses.length > 0
                        ? [
                            selectedOrder.addresses[0]?.street,
                            selectedOrder.addresses[0]?.city,
                            selectedOrder.addresses[0]?.state,
                            selectedOrder.addresses[0]?.pincode,
                            selectedOrder.addresses[0]?.country
                          ].filter(Boolean).join(', ')
                        : (typeof selectedOrder.address === 'string' ? selectedOrder.address : ''),
                    mobile:
                      userInfo.mobile ||
                      (selectedOrder.userId && typeof selectedOrder.userId === 'object' && 'mobile' in selectedOrder.userId
                        ? (selectedOrder.userId as UserObj).mobile || ""
                        : "")
                  }}
                  order={{
                    orderId: selectedOrder.orderId,
                    createdAt: selectedOrder.createdAt,
                    items: selectedOrder.items.map(item => ({
                      productName: item.productName || (typeof item.productId === 'object' && item.productId ? item.productId.name : ""),
                      quantity: item.quantity,
                      price: item.price,
                      productImage: item.productImage
                    })),
                    totalAmount: selectedOrder.totalAmount,
                    deliveryCharge: selectedOrder.deliveryCharge,
                    handlingCharge: selectedOrder.handlingCharge,
                    paymentMode: selectedOrder.paymentMode,
                    status: selectedOrder.status
                  }}
                />
              </div>
              <div className="font-semibold mb-2 pl-12 text-gray-800">{selectedOrder.items.length} item{selectedOrder.items.length > 1 ? 's' : ''} in this order</div>
              <div className="space-y-3 mb-6 pl-12">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {/* Product image if available, else placeholder */}
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName || 'Product'}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-800 text-center px-1 truncate w-full font-medium">
                          {typeof item.productId === 'object' && item.productId !== null
                            ? item.productId.name
                            : (item.productName || '')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {item.productName}
                      </div>
                      <div className="text-xs text-gray-700 font-medium">{item.quantity} x <span className="text-gray-900 font-bold">₹{item.price}</span></div>
                    </div>
                    <div className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {/* Bill details */}
              <div className="border-t pt-4 pl-12">
                <div className="font-bold mb-2 text-gray-900">Bill details</div>
                <div className="flex justify-between text-sm mb-1 text-gray-800 font-medium">
                  <span>Items Total</span>
                  <span>₹{selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span>
                </div>
                {/* Example discount, replace with actual if available */}
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-700 cursor-pointer font-medium">Discount</span>
                  <span className="text-blue-700 font-medium">₹0</span>
                </div>
                <div className="flex justify-between text-sm mb-1 text-gray-800 font-medium">
                  <span>Handling charge</span>
                  <span className="text-gray-900 ">{`+₹${selectedOrder.handlingCharge}`}</span>
                </div>
                <div className="flex justify-between text-sm mb-1 text-green-700 font-bold">
                  <span>Delivery charges</span>
                  <span>{selectedOrder.deliveryCharge === 0 ? "FREE" : `₹${selectedOrder.deliveryCharge}`}</span>
                </div>
                <hr className="my-4"/>
                <div className="flex justify-between font-semibold mb-1 text-gray-800 font-medium">
                  <span>Total Amount</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// SidebarLink component
const SidebarLink = ({ href, icon, label, active, onClick }: { href: string, icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <a
    href={href}
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors ${active ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'} cursor-pointer`}
    style={{ textDecoration: 'none' }}
  >
    {icon}
    {label}
  </a>
);

export default OrdersPage;
