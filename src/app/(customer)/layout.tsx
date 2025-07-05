"use client";
import React, { useEffect, useState } from "react";
import { Popover, Box, Button as MuiButton } from "@mui/material";
import Link from "next/link";
// Removed unused ShoppingCartIcon, AccountCircleIcon, Badge imports
// import { apiRequest } from "@/utils/api"; // Removed: unused import
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "@/types/types";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoutIcon from "@mui/icons-material/Logout";

const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  // Removed unused cartQty state and fetchCartQty effect

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-200">
      {/* Navbar */}
      <nav className="w-full bg-white shadow-md py-3 px-6 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-green-700 tracking-tight">🚀 Rocket Store</span>
        </Link>
        {/* Center section removed (Home, Orders) */}
        <div className="flex-1" />
        <div className="flex items-center gap-4 relative">
          {/* Account Dropdown */}
          <AccountDropdown />
        </div>
      </nav>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-6 pb-10 px-2 md:px-6">
        {children}
      </main>
    </div>
  );
};

const AccountDropdown: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [decoded, setDecoded] = useState<CustomJwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only decode token on client side to avoid hydration mismatch
    const decodedToken = getDecodedToken<CustomJwtPayload>("token");
    setDecoded(decodedToken);
    setIsLoading(false);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 cursor-pointer text-green-700 font-semibold">
        Account
        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    );
  }

  return (
    <>
      <button
        className="flex items-center gap-1 cursor-pointer text-green-700 font-semibold hover:underline focus:outline-none"
        onClick={handleClick}
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl)}
      >
        Account {decoded?.role === "admin" && "(Admin)"}
        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 220, p: 0, mt: 1, boxShadow: 3 },
        }}
      >
        <Box sx={{ py: 1 }}>
          {/* <Link href="/profile" className="block px-5 py-3 text-gray-800 hover:bg-green-50 font-medium flex items-center gap-3 cursor-pointer">
            <AccountCircleIcon className="!text-green-600" />
            Profile
          </Link> */}
          <Link href="/orders" className="block px-5 py-3 text-gray-800 hover:bg-green-50 font-medium flex items-center gap-3 cursor-pointer" onClick={handleClose}>
            <ListAltIcon className="!text-green-600" />
            Orders
          </Link>
          <Link href="/addresses" className="block px-5 py-3 text-gray-800 hover:bg-green-50 font-medium flex items-center gap-3 cursor-pointer" onClick={handleClose}>
            <LocationOnIcon className="!text-green-600" />
            Saved Addresses
          </Link>
          <MuiButton
            className="block w-full text-left px-5 py-3 text-red-600 hover:bg-red-50 font-medium flex items-center gap-3 cursor-pointer"
            sx={{ justifyContent: 'flex-start', color: '#dc2626', fontWeight: 500, borderRadius: 0, width: '100%', textTransform: 'none', fontFamily: 'inherit', fontSize: 16, p: 0, pl: 2.5, pr: 2.5, py: 1.5, '&:hover': { background: '#fef2f2' } }}
            onClick={() => { document.cookie = 'token=; Max-Age=0; path=/;'; window.location.href = '/login'; handleClose(); }}
            startIcon={<LogoutIcon className="!text-red-500" />}
          >
            Logout
          </MuiButton>
        </Box>
      </Popover>
    </>
  );
};

export default CustomerLayout;
