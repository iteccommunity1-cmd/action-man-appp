import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseProvider } from "@/providers/SupabaseProvider";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import ProjectDetails from "./pages/ProjectDetails";
import Profile from "./pages/Profile";
import DailyDigest from "./pages/DailyDigest";
import NotificationsPage from "./pages/Notifications";
import Projects from "./pages/Projects";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="action-manager-theme">
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <SupabaseProvider>
              <UserProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route
                    path="/"
                    element={<Layout><Index /></Layout>}
                  />
                  <Route
                    path="/projects"
                    element={<Layout><Projects /></Layout>}
                  />
                  <Route
                    path="/chat"
                    element={<Layout><Chat /></Layout>}
                  />
                  <Route
                    path="/projects/:id"
                    element={<Layout><ProjectDetails /></Layout>}
                  />
                  <Route
                    path="/profile"
                    element={<Layout><Profile /></Layout>}
                  />
                  <Route
                    path="/daily-digest"
                    element={<Layout><DailyDigest /></Layout>}
                  />
                  <Route
                    path="/notifications"
                    element={<Layout><NotificationsPage /></Layout>}
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </UserProvider>
            </SupabaseProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;