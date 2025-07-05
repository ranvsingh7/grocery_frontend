"use client";

import React from "react";
import { Button } from "@mui/material";
import Image from "next/image";
import GroceryImage from "@/../public/groceryLogo.jpg";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    price: number;
  };
  quantity: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onIncrement,
  onDecrement,
  onAddToCart,
}) => (
  <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col items-center text-center">
    <Image
      src={GroceryImage}
      alt={product.name}
      width={128}
      height={128}
      className="w-32 h-32 object-cover rounded-md mb-4"
    />
    <h3 className="text-lg font-bold text-blue-600">{product.name}</h3>
    <p className="text-gray-300">₹{product.price.toFixed(2)}</p>
    <div className="mt-4 flex justify-between items-center">
      {quantity > 0 ? (
        <div className="flex justify-between items-center w-max">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg"
            onClick={() => onDecrement(product._id)}
          >
            -
          </button>
          <span className="text-yellow-500 font-bold px-4">{quantity}</span>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg"
            onClick={() => onIncrement(product._id)}
          >
            +
          </button>
        </div>
      ) : (
        <Button
          variant="contained"
          color="primary"
          style={{ backgroundColor: "#ff4081" }}
          onClick={() => onAddToCart(product._id)}
        >
          Add
        </Button>
      )}
    </div>
  </div>
);

export default ProductCard;
