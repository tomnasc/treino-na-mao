import '../app/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "../components/ui/sonner";
import { AuthProvider } from "../contexts/AuthContext";
import { TrainingProvider } from "../contexts/TrainingContext";
import { AITrainingProvider } from "../contexts/AITrainingContext";

// Adicionar o arquivo _app.tsx para configuração global do Next.js
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TrainingProvider>
          <AITrainingProvider>
            <Component {...pageProps} />
            <Toaster position="top-center" />
          </AITrainingProvider>
        </TrainingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp; 