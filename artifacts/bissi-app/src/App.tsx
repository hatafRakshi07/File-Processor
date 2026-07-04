import React from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Register localStorage auth token getter for all API requests
setAuthTokenGetter(() => localStorage.getItem("auth_token"));

// Pages
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import CustomerDetailPage from "@/pages/customers/[id]";
import BranchesPage from "@/pages/branches";
import CollectorsPage from "@/pages/collectors";
import CommitteesPage from "@/pages/committees";
import TokensPage from "@/pages/tokens";
import LoansPage from "@/pages/loans";
import CollectionsPage from "@/pages/collections";
import LotteriesPage from "@/pages/lotteries";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <Shell>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/customers" component={CustomersPage} />
            <Route path="/customers/:id" component={CustomerDetailPage} />
            <Route path="/branches" component={BranchesPage} />
            <Route path="/collectors" component={CollectorsPage} />
            <Route path="/committees" component={CommitteesPage} />
            <Route path="/tokens" component={TokensPage} />
            <Route path="/loans" component={LoansPage} />
            <Route path="/collections" component={CollectionsPage} />
            <Route path="/lotteries" component={LotteriesPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
