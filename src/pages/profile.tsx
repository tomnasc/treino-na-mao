import ProfilePage from './ProfilePage';
import ProtectedRoute from '../components/ProtectedRoute';

export default function ProfilePageWrapper() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
} 