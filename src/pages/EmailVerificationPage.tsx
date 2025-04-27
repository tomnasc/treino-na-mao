import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, XCircle, Mail, AlertCircle, Loader2 } from 'lucide-react';
import supabase from '../lib/supabase';

const EmailVerificationPage: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Estados possíveis:
  // 1. Verificando o token (verificação automática)
  // 2. Token verificado com sucesso
  // 3. Token inválido ou expirado
  // 4. Não há token, mas há usuário não verificado (mostrar opção de reenviar)
  // 5. Usuário já está verificado

  // Verificar o token se presente nos parâmetros
  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const email = searchParams.get('email');

    // Se temos um token, tentamos verificar automaticamente
    if (token && type === 'email_verification' && email) {
      verifyEmail(token, email);
    } else if (user) {
      // Se não tem token mas tem usuário, checamos se já está verificado
      checkVerificationStatus();
    }
  }, [searchParams, user]);

  // Efeito para o contador regressivo após reenviar email
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Verificar se o email já está verificado
  const checkVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('auth.users')
        .select('email_confirmed_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Se email_confirmed_at não for null, o email já está verificado
      setVerified(!!data.email_confirmed_at);
    } catch (error) {
      console.error('Erro ao verificar status de email:', error);
      // Se não conseguir verificar, assumimos que precisa verificar por segurança
      setVerified(false);
    }
  };

  // Função para verificar o email usando o token
  const verifyEmail = async (token: string, email: string) => {
    setVerifying(true);
    try {
      // Chamar a API do Supabase para verificar o email
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'email',
        email,
      });

      if (error) {
        throw error;
      }

      // Atualiza o estado da aplicação
      setVerified(true);
      toast.success('Email verificado com sucesso!');
      
      // Atualiza a sessão do usuário para refletir a verificação
      await refreshSession();
      
      // Redireciona após um breve delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      setVerified(false);
      toast.error('Falha ao verificar o email. O link pode estar expirado ou ser inválido.');
    } finally {
      setVerifying(false);
    }
  };

  // Função para reenviar o email de verificação
  const resendVerificationEmail = async () => {
    if (!user?.email) return;
    
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        throw error;
      }

      toast.success('Email de verificação reenviado. Por favor, verifique sua caixa de entrada.');
      setCountdown(60); // Iniciar contador regressivo de 60 segundos
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      toast.error('Falha ao reenviar o email de verificação.');
    } finally {
      setResending(false);
    }
  };

  // Redirecionamento para o dashboard se o usuário já estiver verificado
  useEffect(() => {
    if (verified === true && !verifying) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [verified, verifying, navigate]);

  return (
    <PageLayout>
      <div className="container max-w-lg py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Verificação de Email</CardTitle>
            <CardDescription className="text-center">
              Verifique seu email para acessar todos os recursos
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center justify-center space-y-6 pt-6">
            {verifying ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="text-center">Verificando seu email...</p>
              </>
            ) : verified === true ? (
              <>
                <CheckCircle className="h-16 w-16 text-success" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-medium">Email Verificado</h3>
                  <p>Seu email foi verificado com sucesso!</p>
                  <p className="text-muted-foreground">Você será redirecionado para o dashboard em instantes...</p>
                </div>
              </>
            ) : verified === false ? (
              <>
                <AlertCircle className="h-16 w-16 text-warning" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-medium">Verificação Pendente</h3>
                  <p>Seu email ainda não foi verificado.</p>
                  <p className="text-muted-foreground">
                    Por favor, verifique sua caixa de entrada e clique no link de verificação que enviamos para {user?.email}.
                  </p>
                  <p className="text-muted-foreground">
                    Também verifique a pasta de spam caso não encontre o email.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Mail className="h-16 w-16 text-primary animate-pulse" />
                <p className="text-center">Verificando o status do seu email...</p>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            {verified === false && (
              <Button 
                className="w-full" 
                onClick={resendVerificationEmail} 
                disabled={resending || countdown > 0}
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reenviando email...
                  </>
                ) : countdown > 0 ? (
                  `Aguarde ${countdown} segundos para reenviar`
                ) : (
                  'Reenviar Email de Verificação'
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              Voltar para o Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
};

export default EmailVerificationPage; 