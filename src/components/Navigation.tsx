// src/components/Navigation.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { NavItem } from "../types";
import { ThemeToggle } from "./ui/theme-toggle";

const Navigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      requiresAuth: true,
    },
    {
      title: "Treinos",
      href: "/workouts",
      requiresAuth: true,
    },
    {
      title: "Exercícios",
      href: "/exercises",
      requiresAuth: true,
    },
    {
      title: "Tarefas",
      href: "/todos",
      requiresAuth: true,
    },
    {
      title: "Histórico",
      href: "/history",
      requiresAuth: true,
    },
    {
      title: "IA",
      href: "/ai-training",
      requiresAuth: true,
      requiresPremium: true,
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Treino na Mão</SheetTitle>
                <SheetDescription>
                  Seu assistente de treinos personalizado
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {navItems
                  .filter(item => !item.requiresAuth || user)
                  .map((item, index) => (
                    <Button
                      key={index}
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="w-full justify-start text-left"
                      onClick={() => {
                        navigate(item.href);
                      }}
                    >
                      {item.title}
                      {item.requiresPremium && (
                        <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary-foreground">
                          Premium
                        </span>
                      )}
                    </Button>
                  ))}
              </div>
              {user && (
                <div className="mt-auto border-t pt-4">
                  <Button variant="destructive" onClick={handleSignOut} className="w-full">
                    Sair
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold">Treino na Mão</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navItems
            .filter(item => !item.requiresAuth || user)
            .map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.title}
                {item.requiresPremium && (
                  <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                    Premium
                  </span>
                )}
              </Link>
            ))}
        </nav>
        <div className="flex items-center">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                  <Avatar>
                    <AvatarFallback>
                      {user.user_metadata?.full_name
                        ? getInitials(user.user_metadata.full_name)
                        : "UN"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user.user_metadata?.full_name || user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/subscription")}>
                  Assinatura
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/auth/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/auth/register">Cadastre-se</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;