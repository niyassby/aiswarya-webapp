import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/useAuth";
import RoleGuard from "@/components/RoleGuard";
import AppLayout from "@/app/AppLayout";

// Pages
import Login from "@/features/auth/Login";
import Unauthorized from "@/features/auth/Unauthorized";
import Dashboard from "@/features/dashboard/Dashboard";
import CustomerList from "@/features/customers/CustomerList";
import CustomerDetail from "@/features/customers/CustomerDetail";
import ProductList from "@/features/products/ProductList";
import OrderList from "@/features/orders/OrderList";
import OrderCreate from "@/features/orders/OrderCreate";
import OrderDetail from "@/features/orders/OrderDetail";
import PurchaseRequestList from "@/features/purchase-requests/PurchaseRequestList";
import PurchaseRequestDetail from "@/features/purchase-requests/PurchaseRequestDetail";
import ComplaintList from "@/features/complaints/ComplaintList";
import ComplaintDetail from "@/features/complaints/ComplaintDetail";
import AdminPanel from "@/features/users/AdminPanel";
import AcceptInvite from "./features/auth/AcceptInvite";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/join/:id" element={<AcceptInvite />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Staff Routes (App Layout Wrapper) */}
        <Route
          path="/"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/customers"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <CustomerList />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <CustomerDetail />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/products"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <ProductList />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/orders"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <OrderList />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/orders/create"
          element={
            <RoleGuard allow={["sales_admin", "super_admin"]}>
              <AppLayout>
                <OrderCreate />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <OrderDetail />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/purchase-requests"
          element={
            <RoleGuard allow={["sales_admin", "manager", "super_admin"]}>
              <AppLayout>
                <PurchaseRequestList />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/purchase-requests/:id"
          element={
            <RoleGuard allow={["sales_admin", "manager", "super_admin"]}>
              <AppLayout>
                <PurchaseRequestDetail />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/complaints"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <ComplaintList />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/complaints/:id"
          element={
            <RoleGuard allow={["sales_admin", "accounts", "manager", "super_admin"]}>
              <AppLayout>
                <ComplaintDetail />
              </AppLayout>
            </RoleGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleGuard allow={["super_admin"]}>
              <AppLayout>
                <AdminPanel />
              </AppLayout>
            </RoleGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
