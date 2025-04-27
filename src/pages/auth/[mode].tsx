import { useRouter } from 'next/router';
import AuthPage from '../AuthPage';

export default function AuthPageWrapper() {
  const router = useRouter();
  const { mode } = router.query;
  
  return <AuthPage />;
} 