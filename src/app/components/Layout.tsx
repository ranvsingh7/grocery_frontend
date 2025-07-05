"use client";

import React, { useEffect, useState } from "react";
import AdminNavbar from "@/app/components/AdminNavbar";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "../../../types/types";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<null | boolean>(null);

  useEffect(() => {
    const decoded = getDecodedToken<CustomJwtPayload>("token");
    setIsAdmin(decoded?.role === "admin");
  }, []);

  if (isAdmin === null) {
    // Avoid hydration mismatch: render nothing or a loader until client check is done
    return null;
  }

  return (
    <div>
      {isAdmin ? (
        <AdminNavbar />
      ) : (
        <div className="p-4 text-lg font-bold text-green-700">User</div>
      )}
      <main className="">{children}</main>
    </div>
  );
};

export { Layout };
