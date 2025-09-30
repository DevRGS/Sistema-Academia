import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkoutsPage from "./pages/Workouts";
import StudentsPage from "./pages/Students";
import WorkoutSessionPage from "./pages/WorkoutSession";
import SettingsPage from "./pages/Settings";
import DietPage from "./pages/Diet";
import WeightTrackingPage from "./pages/WeightTrackingPage";
import BioimpedancePage from "./pages/BioimpedancePage";
import ReportsPage from "./pages/ReportsPage"; // Import the new ReportsPage

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/diet" element={<Layout><DietPage /></Layout>} />
          <Route path="/workouts" element={<Layout><WorkoutsPage /></Layout>} />
          <Route path="/workout-session/:workoutId" element={<Layout><WorkoutSessionPage /></Layout>} />
          <Route path="/bioimpedance" element={<Layout><BioimpedancePage /></Layout>} />
          <Route path="/reports" element={<Layout><ReportsPage /></Layout>} /> {/* New route for ReportsPage */}
          <Route path="/students" element={<Layout><StudentsPage /></Layout>} />
          <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
          <Route path="/weight-tracking" element={<Layout><WeightTrackingPage /></Layout>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;