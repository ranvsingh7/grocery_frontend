"use client";

import { useState } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";

export default function Signin() {
  const [isLogin, setIsLogin] = useState<boolean>(true);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <h1 className="text-4xl font-extrabold mb-6 text-yellow-400">Welcome to Rocket Store</h1>

      {/* Toggle Button */}
      <div className="flex space-x-4 mb-8">
        <button
          className={`px-6 py-2 rounded-full text-lg font-semibold transition ${
            isLogin
              ? "bg-blue-600 text-white shadow-md"
              : "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
          }`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button
          className={`px-6 py-2 rounded-full text-lg font-semibold transition ${
            !isLogin
              ? "bg-pink-600 text-white shadow-md"
              : "bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white"
          }`}
          onClick={() => setIsLogin(false)}
        >
          Signup
        </button>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md transform transition duration-300">
        {isLogin ? <Login /> : <Signup onSuccess={() => setIsLogin(true)} />}
      </div>
    </div>
  );
}
