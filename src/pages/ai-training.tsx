import AITrainingPage from './AITrainingPage';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AITrainingPageWrapper() {
  return (
    <ProtectedRoute>
      <AITrainingPage />
    </ProtectedRoute>
  );
} 