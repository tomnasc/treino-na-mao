// src/pages/LandingPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import PageLayout from "../components/layout/PageLayout";

// Hero image for landing page
const HERO_IMAGE_URL = "/assets/landing-hero.jpg";

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      title: "Treinos com Inteligência Artificial",
      description: "Treinos personalizados criados por IA com base nas suas preferências e objetivos",
      icon: "💪"
    },
    {
      title: "Acompanhamento em Tempo Real",
      description: "Registre seus treinos e acompanhe seu progresso diretamente no seu celular",
      icon: "📊"
    },
    {
      title: "Biblioteca de Exercícios",
      description: "Acesso a centenas de exercícios com instruções detalhadas e vídeos",
      icon: "📚"
    },
    {
      title: "Offline Mode",
      description: "Acesse seus treinos mesmo sem conexão com a internet",
      icon: "📵"
    }
  ];

  const pricing = [
    {
      title: "Básico",
      price: "Grátis",
      features: [
        "3 treinos salvos",
        "Biblioteca de exercícios básica",
        "1 treino gerado por IA por mês"
      ],
      buttonText: "Começar Grátis",
      buttonLink: "/auth/register",
      highlighted: false
    },
    {
      title: "Premium",
      price: "R$19,90/mês",
      features: [
        "Treinos ilimitados",
        "Biblioteca de exercícios completa",
        "Geração de treinos por IA ilimitada",
        "Suporte prioritário",
        "Estatísticas avançadas"
      ],
      buttonText: "Assinar Premium",
      buttonLink: "/auth/register",
      highlighted: true
    }
  ];

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background via-background to-muted">
        <div className="container px-4 md:px-6 flex flex-col lg:flex-row items-center gap-6">
          <div className="flex flex-col justify-center space-y-4 lg:w-1/2">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Treino na Mão
              </h1>
              <p className="text-muted-foreground text-xl">
                Seu assistente de treinos personalizado com tecnologia de IA
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <Button asChild>
                  <Link to="/dashboard">Ir para Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild>
                    <Link to="/auth/register">Cadastre-se</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/auth/login">Entrar</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="lg:w-1/2">
            <img
              src={HERO_IMAGE_URL}
              alt="Treino na Mão App Preview"
              className="rounded-lg shadow-xl w-full object-cover"
              width={600}
              height={400}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-12 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Recursos Principais</h2>
            <p className="text-muted-foreground">
              Tudo o que você precisa para treinar de forma eficiente
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-card text-card-foreground shadow rounded-lg p-6 flex flex-col items-center text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Planos e Preços</h2>
            <p className="text-muted-foreground">
              Escolha o plano que melhor se adapta às suas necessidades
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`flex flex-col p-6 bg-card text-card-foreground shadow rounded-lg ${
                  plan.highlighted
                    ? "ring-2 ring-primary"
                    : "border border-border"
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{plan.title}</h3>
                  <div className="mt-2 text-3xl font-bold">{plan.price}</div>
                </div>
                <ul className="space-y-2 mb-6 flex-grow">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-primary mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link to={plan.buttonLink}>{plan.buttonText}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="w-full py-12 bg-muted">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Pronto para transformar seus treinos?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Junte-se a milhares de usuários que já estão aproveitando o poder da
            inteligência artificial para otimizar seus treinos.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth/register">Comece agora - É grátis!</Link>
          </Button>
        </div>
      </section>
    </PageLayout>
  );
};

export default LandingPage;