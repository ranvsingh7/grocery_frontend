"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogTitle, DialogContent, Button, Box, Typography } from "@mui/material";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "@/types/types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface Address {
  _id?: string;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  landmark?: string;
  isDefault?: boolean;
  location?: { lat?: number; lng?: number };
}


const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const AddressesPage: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Address>({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    landmark: '',
    location: { lat: 26.2389, lng: 73.0243 }, // Default to Jodhpur
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  const initializeAuth = () => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id || null;
    const token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    return { userId, token };
  };

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    const { userId, token } = initializeAuth();
    if (!userId || !token) {
      setError("User ID or token is missing.");
      setLoading(false);
      return;
    }
    try {
      interface Customer {
        addresses?: Address[];
        // add other fields as needed
      }
      const user = await apiRequest<Customer>(`/api/get-customer/${userId}`, "GET", undefined, token);
      setAddresses(user.addresses || []);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as { message?: string }).message || "Failed to fetch addresses");
      } else {
        setError("Failed to fetch addresses");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  },[]);


  // Removed unused handleInputChange and handleMapClick



  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: all fields required except landmark and country
    const requiredFields: Array<{ key: keyof Address; label: string }> = [
      { key: 'label', label: 'Address Type' },
      { key: 'street', label: 'Flat / House no / Building name' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'Pincode' },
    ];
    for (const field of requiredFields) {
      const value = form[field.key];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    try {
      if (editingId) {
        // Edit address
        await apiRequest(`/api/customers/${userId}/addresses/${editingId}`, "PUT", form, token);
        toast.success("Address updated successfully!");
      } else {
        // Add address
        await apiRequest(`/api/customers/${userId}/addresses`, "POST", form, token);
        toast.success("Address added successfully!");
      }
      setShowModal(false);
      setForm({});
      setEditingId(null);
      fetchAddresses();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as { message?: string }).message || "Failed to save address");
        toast.error((error as { message?: string }).message || "Failed to save address");
      } else {
        setError("Failed to save address");
        toast.error("Failed to save address");
      }
    }
  };

  const handleEdit = (address: Address) => {
    setForm(address);
    setEditingId(address._id || null);
    setShowModal(true);
  };

  const handleDeleteClick = (id?: string) => {
    setDeleteId(id || null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { userId, token } = initializeAuth();
    if (!userId || !token) return;
    try {
      await apiRequest(`/api/customers/${userId}/addresses/${deleteId}`, "DELETE", undefined, token);
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchAddresses();
      toast.success("Address deleted successfully!");
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as { message?: string }).message || "Failed to delete address");
        toast.error((error as { message?: string }).message || "Failed to delete address");
      } else {
        setError("Failed to delete address");
        toast.error("Failed to delete address");
      }
    }
  };

  return (
    <>
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 relative">
        <div className="flex items-center justify-between mb-6">
          {/* Go Back Button Top Left, now inside header row for correct stacking */}
          <div className="flex items-center gap-2">
            <button
              className="bg-gray-300 hover:bg-gray-400 rounded-full p-2 cursor-pointer border border-gray-400 shadow z-10"
              onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/dashboard')}
              aria-label="Go back"
              style={{ marginRight: 8 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
          </div>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
            onClick={() => {
              setShowModal(true);
              setForm({
                label: 'Home',
                street: '',
                city: '',
                state: '',
                pincode: '',
                country: 'India',
                landmark: '',
                location: { lat: 26.2389, lng: 73.0243 },
              });
              setEditingId(null);
            }}
          >
            + Add New
          </button>
        </div>
        {loading ? (
          <div className="text-gray-700">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : addresses.length === 0 ? (
          <div className="text-gray-700">No addresses found.</div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div key={address._id} className="border rounded-lg p-4 flex flex-col gap-1 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{address.label || "Address"}</div>
                  <div className="flex gap-2">
                    <button className="text-blue-600 cursor-pointer" title="Edit" onClick={() => handleEdit(address)}>
                      <EditIcon />
                    </button>
                    <button className="text-red-600 cursor-pointer" title="Delete" onClick={() => handleDeleteClick(address._id)}>
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
                <div className="text-gray-800 text-sm">
                  {address.street}, {address.city}, {address.state}, {address.pincode}, {address.country}
                </div>
                {address.landmark && <div className="text-gray-600 text-xs">Landmark: {address.landmark}</div>}
                {address.isDefault && <div className="text-green-700 text-xs font-semibold">Default</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Add Address Modal */}
      {showModal && (
        <Dialog open={showModal} onClose={() => { setShowModal(false); setEditingId(null); }} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', fontSize: 22 }}>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
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
              <Button variant="outlined" sx={{ mt: 1, borderRadius: 2, mb: 2, color: '#16a34a', borderColor: '#22c55e', fontWeight: 'bold', width: '100%', cursor: 'pointer' }} onClick={() => navigator.geolocation.getCurrentPosition(pos => setForm(addr => ({ ...addr, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } })))}>
                Go to current location
              </Button>
              {isLoaded && typeof window !== 'undefined' && (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 12 }}
                  center={{
                    lat: form.location && form.location.lat ? form.location.lat : 26.2389,
                    lng: form.location && form.location.lng ? form.location.lng : 73.0243
                  }}
                  zoom={15}
                  onClick={(e: google.maps.MapMouseEvent) => {
                    const lat = e.latLng?.lat();
                    const lng = e.latLng?.lng();
                    if (lat !== undefined && lng !== undefined) {
                      setForm(addr => ({ ...addr, location: { lat, lng } }));
                    }
                  }}
                  options={{ disableDefaultUI: true }}
                >
                  {form.location && form.location.lat && form.location.lng && (
                    <Marker position={{ lat: form.location.lat, lng: form.location.lng }} />
                  )}
                </GoogleMap>
              )}
            </Box>
            {/* Form Section */}
            <Box sx={{ flex: 1, minWidth: 320 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {['Home', 'Work', 'Other'].map(type => (
                  <Button key={type} variant={form.label === type ? 'contained' : 'outlined'} sx={{ borderRadius: 2, fontWeight: 'bold', background: form.label === type ? '#22c55e' : '#fff', color: form.label === type ? '#fff' : '#222', borderColor: '#22c55e' }} onClick={() => setForm(addr => ({ ...addr, label: type }))}>{type}</Button>
                ))}
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>Flat / House no / Building name</Typography>
              <input value={form.street || ''} onChange={e => setForm(addr => ({ ...addr, street: e.target.value }))} required style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>City</Typography>
              <input value={form.city || ''} onChange={e => setForm(addr => ({ ...addr, city: e.target.value }))} required style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>State</Typography>
              <input value={form.state || ''} onChange={e => setForm(addr => ({ ...addr, state: e.target.value }))} required style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>Pincode</Typography>
              <input value={form.pincode || ''} onChange={e => setForm(addr => ({ ...addr, pincode: e.target.value }))} required style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>Country</Typography>
              <input value={form.country || 'India'} onChange={e => setForm(addr => ({ ...addr, country: e.target.value }))} style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#374151', fontWeight: 600 }}>Landmark (optional)</Typography>
              <input value={form.landmark || ''} onChange={e => setForm(addr => ({ ...addr, landmark: e.target.value }))} style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }} />
            </Box>
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, p: 2 }}>
            <Button onClick={() => setShowModal(false)} sx={{ color: '#222', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</Button>
            <Button onClick={handleAddOrEdit} sx={{ color: '#fff', fontWeight: 'bold', backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' }, cursor: 'pointer' }}>
              {editingId ? 'Update Address' : 'Add Address'}
            </Button>
          </Box>
        </Dialog>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Delete Address</h2>
            <p className="mb-6 text-gray-800">Are you sure you want to delete this address?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold cursor-pointer" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold cursor-pointer" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddressesPage;
