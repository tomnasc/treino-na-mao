import DashboardPage from './DashboardPage';
import ProtectedRoute from '../components/ProtectedRoute';

export default function DashboardPageWrapper() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
} 