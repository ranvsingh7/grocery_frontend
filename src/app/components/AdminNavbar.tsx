"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const AdminNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Logout handler
  const handleLogout = () => {
    // Remove token cookie
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Redirect to login page
    window.location.href = "/auth";
  };

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 shadow-lg border-b border-gray-600">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="text-2xl font-bold text-blue-400">
          <Link href="/admin/dashboard">Admin Dashboard</Link>
        </div>

        {/* Hamburger Icon for Mobile */}
        <button
          className="text-white focus:outline-none md:hidden"
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Links */}
        <ul
          className={`flex-col md:flex-row md:flex items-center md:space-x-6 mt-4 md:mt-0 transition-all duration-300 ease-in-out overflow-hidden ${
            isMenuOpen ? "flex" : "hidden md:flex"
          }`}
        >
          <li>
            <Link
              href="/admin/dashboard"
              className="text-yellow-500 hover:text-yellow-600"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/admin/sales-analytics"
              className="text-yellow-500 hover:text-yellow-600"
            >
              Sales Analytics
            </Link>
          </li>
          <li>
            <Link
              href="/admin/products"
              className="text-yellow-500 hover:text-yellow-600"
            >
              Products
            </Link>
          </li>
          {/* <li>
            <Link
              href="/admin/orders"
              className="text-yellow-500 hover:text-yellow-600"
            >
              Orders
            </Link>
          </li> */}
          <li>
            <Link
              href="/admin/customers"
              className="text-yellow-500 hover:text-yellow-600"
            >
              Customers
            </Link>
          </li>
          <li>
            <button
              className="bg-pink-600 hover:bg-pink-700 text-white py-1 px-4 rounded-lg"
              onClick={handleLogout}
            >
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default AdminNavbar;
