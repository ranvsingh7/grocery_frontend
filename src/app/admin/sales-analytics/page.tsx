"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../../types/types";
import { Button, MenuItem, Select, CircularProgress } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const FILTERS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "week" },
  { label: "Last Week", value: "last week" },
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "last month" },
  { label: "This Year", value: "year" },
  { label: "Last Year", value: "last year" },
];

const SalesAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("today");
  const [chartData, setChartData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAnalyticsData();
  }, [filter]);

  const initializeAuth = () => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    const userId = decoded?.id || null;
    const token = decoded
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    return { userId, token };
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    const { token } = initializeAuth();
    if (!token) {
      setError("Token is missing.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest<{ data: any[]; totalAmount: number }>(
        `/api/sales-analytics?filter=${filter}`,
        "GET",
        undefined,
        token
      );

      setChartData(response.data);
      setTotal(response.totalAmount);
    } catch (error: any) {
      setError(error.message || "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-400">Sales Analytics</h1>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-lg font-semibold">Filter:</span>
        <Select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          sx={{ minWidth: 180, background: '#222', color: '#fff' }}
        >
          {FILTERS.map(f => (
            <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
          ))}
        </Select>
        <span className="ml-8 text-lg font-semibold">Total Sales: </span>
        <span className="text-2xl text-yellow-400">₹{total.toFixed(2)}</span>
      </div>
      {loading ? (
        <CircularProgress color="inherit" />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sales" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SalesAnalyticsPage;
