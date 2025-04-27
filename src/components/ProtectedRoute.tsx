import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);
  
  // Mostrar indicador de carregamento enquanto verifica autenticação
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Retornar nulo durante redirecionamento
  if (!user) {
    return null;
  }
  
  return <>{children}</>;
} 