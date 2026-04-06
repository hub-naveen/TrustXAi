import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, getDashboardRouteForRole, type UserRole, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AnalystDashboard from "./pages/AnalystDashboard";
import ViewerDashboard from "./pages/ViewerDashboard";
import Transactions from "./pages/Transactions";
import FraudIntelligence from "./pages/FraudIntelligence";
import BlockchainExplorer from "./pages/BlockchainExplorer";
import FederatedLearning from "./pages/FederatedLearning";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedPage = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const RoleDashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRouteForRole(user.role)} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><RoleDashboardRedirect /></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedPage allowedRoles={["admin"]}><AdminDashboard /></ProtectedPage>} />
            <Route path="/dashboard/analyst" element={<ProtectedPage allowedRoles={["analyst"]}><AnalystDashboard /></ProtectedPage>} />
            <Route path="/dashboard/viewer" element={<ProtectedPage allowedRoles={["viewer"]}><ViewerDashboard /></ProtectedPage>} />
            <Route path="/transactions" element={<ProtectedPage allowedRoles={["admin", "analyst", "viewer"]}><Transactions /></ProtectedPage>} />
            <Route path="/fraud-intelligence" element={<ProtectedPage allowedRoles={["admin", "analyst"]}><FraudIntelligence /></ProtectedPage>} />
            <Route path="/blockchain" element={<ProtectedPage allowedRoles={["admin", "analyst", "viewer"]}><BlockchainExplorer /></ProtectedPage>} />
            <Route path="/federated-learning" element={<ProtectedPage allowedRoles={["admin", "analyst"]}><FederatedLearning /></ProtectedPage>} />
            <Route path="/admin" element={<ProtectedPage allowedRoles={["admin"]}><Admin /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage allowedRoles={["admin", "analyst"]}><Settings /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
