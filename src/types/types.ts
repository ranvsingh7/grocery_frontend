// ...existing code...
export interface CustomJwtPayload {
  // ...existing code...
  userType?: string;
  role?: string;
  id?: string;
  // ...existing code...
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  // ...other fields if any...
}
// ...existing code...