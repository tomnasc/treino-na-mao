// src/components/layout/PageLayout.tsx
import React from "react";
import Navigation from "../Navigation";

interface PageLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, showFooter = true }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      {showFooter && (
        <footer className="bg-muted py-6">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h2 className="font-bold text-lg">Treino na Mão</h2>
                <p className="text-sm text-muted-foreground">
                  Seu assistente de treinos personalizado com IA
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Recursos</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a href="/features" className="hover:underline">
                        Funcionalidades
                      </a>
                    </li>
                    <li>
                      <a href="/pricing" className="hover:underline">
                        Planos e preços
                      </a>
                    </li>
                    <li>
                      <a href="/exercises" className="hover:underline">
                        Biblioteca de exercícios
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Empresa</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a href="/about" className="hover:underline">
                        Sobre nós
                      </a>
                    </li>
                    <li>
                      <a href="/contact" className="hover:underline">
                        Contato
                      </a>
                    </li>
                    <li>
                      <a href="/blog" className="hover:underline">
                        Blog
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Legal</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a href="/terms" className="hover:underline">
                        Termos de serviço
                      </a>
                    </li>
                    <li>
                      <a href="/privacy" className="hover:underline">
                        Política de privacidade
                      </a>
                    </li>
                    <li>
                      <a href="/cookies" className="hover:underline">
                        Política de cookies
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 border-t pt-6">
              <p className="text-sm text-center text-muted-foreground">
                &copy; {new Date().getFullYear()} Treino na Mão. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PageLayout;