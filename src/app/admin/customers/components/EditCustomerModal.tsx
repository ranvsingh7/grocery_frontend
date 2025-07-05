"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../../../types/types";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  initialData: {
    name: string;
    email: string;
    mobile: string;
  };
  onCustomerUpdated: () => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customerId,
  initialData,
  onCustomerUpdated,
}) => {
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  let token: string | null = null;
  let userId: string | null = null;
   const initializeAuth = () => {
      const decoded = getDecodedToken<CustomJwtPayload>("token");
      userId = decoded?.id || null;
      token = decoded
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
    };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    initializeAuth();
    if (!userId || !token) {
      alert("User ID or token is missing.");
      setIsLoading(false);
      return;
    }

    try {
      await apiRequest(`/api/customers/edit/${customerId}`, "PUT", formData, token);
      onCustomerUpdated();
      onClose();
    } catch (error) {
      alert("Failed to update customer. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-96 p-6">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Edit Customer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Mobile</label>
            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;
