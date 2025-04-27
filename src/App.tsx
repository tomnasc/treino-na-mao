// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import WorkoutsPage from "./pages/WorkoutsPage";
import MyWorkoutsPage from "./pages/MyWorkoutsPage";
import WorkoutEditPage from "./pages/WorkoutEditPage";
import WorkoutTrainPage from "./pages/WorkoutTrainPage";
import ExercisesPage from "./pages/ExercisesPage";
import TodoPage from "./pages/TodoPage";
import HistoryPage from "./pages/HistoryPage";
import AITrainingPage from "./pages/AITrainingPage";
import { TrainingProvider } from "./contexts/TrainingContext";
import { AITrainingProvider } from "./contexts/AITrainingContext";
import { ThemeProvider } from "./lib/theme";

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Show loading indicator while checking authentication
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/:mode" element={<AuthPage />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      
      <Route path="/workouts" element={
        <ProtectedRoute>
          <WorkoutsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/myworkouts" element={
        <ProtectedRoute>
          <MyWorkoutsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/workouts/new" element={
        <ProtectedRoute>
          <WorkoutEditPage />
        </ProtectedRoute>
      } />
      
      <Route path="/workouts/:workoutId/edit" element={
        <ProtectedRoute>
          <WorkoutEditPage />
        </ProtectedRoute>
      } />
      
      <Route path="/workouts/:workoutId/train" element={
        <ProtectedRoute>
          <WorkoutTrainPage />
        </ProtectedRoute>
      } />
      
      <Route path="/exercises" element={
        <ProtectedRoute>
          <ExercisesPage />
        </ProtectedRoute>
      } />
      
      <Route path="/ai-training" element={
        <ProtectedRoute>
          <AITrainingPage />
        </ProtectedRoute>
      } />
      
      <Route path="/todos" element={
        <ProtectedRoute>
          <TodoPage />
        </ProtectedRoute>
      } />
      
      <Route path="/history" element={
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      } />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <TrainingProvider>
            <AITrainingProvider>
              <div className="min-h-screen bg-background text-foreground">
                <main>
                  <AppRoutes />
                </main>
                <Toaster position="top-center" />
              </div>
            </AITrainingProvider>
          </TrainingProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;