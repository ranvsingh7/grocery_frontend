import { apiRequest } from "@/utils/api";
import { TextField } from "@mui/material";
import React, { ChangeEvent, FormEvent, useState } from "react";
import toast from "react-hot-toast";

interface FormDataSignup {
  name: string;
  email: string;
  mobile: string;
  password: string;
  username: string;
  userType: "user" | "admin";
}

interface SignupProps {
  onSuccess: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSuccess }) => {
  const [formDataSignup, setFormDataSignup] = useState<FormDataSignup>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    username: "",
    userType: "user",
  });
  const [loading, setLoading] = useState<boolean>(false);

  const handleChangeSignup = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormDataSignup({ ...formDataSignup, [name]: value });
  };

  const handleSubmitSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiRequest<{ message: string }>("/api/auth/signup", "POST", formDataSignup);
      toast.success(result.message);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold text-pink-600 mb-6 text-center">Signup</h1>
      <form onSubmit={handleSubmitSignup} className="space-y-4 flex flex-col gap-4">
        <TextField
          label="Name"
          name="name"
          value={formDataSignup.name}
          onChange={handleChangeSignup}
          fullWidth
          required
        />
        <TextField
          label="Email"
          name="email"
          value={formDataSignup.email}
          onChange={handleChangeSignup}
          fullWidth
          required
        />
        <TextField
          label="Mobile"
          name="mobile"
          value={formDataSignup.mobile}
          onChange={handleChangeSignup}
          fullWidth
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formDataSignup.password}
          onChange={handleChangeSignup}
          fullWidth
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 text-white font-semibold rounded-md transition ${
            loading
              ? "bg-gray-400"
              : "bg-pink-600 hover:bg-pink-700"
          }`}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default Signup;
