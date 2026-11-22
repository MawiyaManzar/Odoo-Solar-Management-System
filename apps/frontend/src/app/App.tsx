import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { CustomerShell } from "../features/customer-portal/components/CustomerShell";
import { CustomerJobsPage } from "../features/customer-portal/pages/CustomerJobsPage";
import { CustomerQuotesListPage } from "../features/customer-portal/pages/CustomerQuotesListPage";
import { CustomerServicePage } from "../features/customer-portal/pages/CustomerServicePage";
import { CustomerSupportPage } from "../features/customer-portal/pages/CustomerSupportPage";
import { CustomerQuotePage } from "../features/customer-quotes/pages/CustomerQuotePage";
import { InquiryPage } from "../features/landing/pages/InquiryPage";
import { LandingPage } from "../features/landing/pages/LandingPage";
import { useAuth } from "./AuthProvider";
import { AppShell } from "./AppShell";
import { featureRoutes, type FeatureRoute } from "./feature-registry";
import { ModeBanner } from "./ModeBanner";

const FeatureGate: React.FC<{ feature: FeatureRoute }> = ({ feature }) => {
  const { user } = useAuth();
  if (!user || !feature.roles.includes(user.role)) {
    return (
      <div style={{ padding: "var(--space-6, 24px)" }}>
        <Alert variant="danger" title="Access denied">
          Your role cannot open this screen.
        </Alert>
      </div>
    );
  }
  const Page = feature.page;
  return <Page />;
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-8, 32px)", color: "var(--text-muted)" }}>Checking session...</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-8, 32px)", color: "var(--text-muted)" }}>Checking session...</div>
    );
  }
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--page)" }}>
      <ModeBanner />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/inquire" element={<InquiryPage />} />
          <Route path="/my" element={<CustomerShell />}>
            <Route index element={<Navigate to="jobs" replace />} />
            <Route path="jobs" element={<CustomerJobsPage />} />
            <Route path="quotes" element={<CustomerQuotesListPage />} />
            <Route path="quotes/:quoteId" element={<CustomerQuotePage />} />
            <Route path="service" element={<CustomerServicePage />} />
            <Route path="support" element={<CustomerSupportPage />} />
          </Route>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            {featureRoutes.map((feature) => (
              <Route key={feature.id} path={feature.path} element={<FeatureGate feature={feature} />} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};
