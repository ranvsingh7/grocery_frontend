import AdminNavbar from "../components/AdminNavbar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="antialiased bg-gray-900 text-white">
      <AdminNavbar />
      <main className="p-6">{children}</main>
    </div>
  );
}
