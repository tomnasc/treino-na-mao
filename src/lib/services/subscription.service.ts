import supabase from '../supabase';
import { UserSubscription, SubscriptionStatus, SubscriptionTier } from '../../types';

export interface SubscriptionResponse {
  subscription: UserSubscription | null;
  error: string | null;
}

export interface StatusResponse {
  success: boolean;
  error: string | null;
}

export interface CheckoutResponse {
  checkoutUrl: string | null;
  error: string | null;
}

export const SubscriptionService = {
  /**
   * Obter status da assinatura do usuário
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionResponse> {
    try {
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);

      return { subscription, error: null };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return { subscription: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar assinatura' };
    }
  },

  /**
   * Criar uma sessão de checkout do Stripe
   */
  async createCheckoutSession(userId: string, planId: string): Promise<CheckoutResponse> {
    try {
      // Em produção, isto seria uma chamada para uma função serverless que interagiria com a API do Stripe
      // Aqui estamos simulando uma chamada para a nossa API
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro no checkout');
      }

      const data = await response.json();
      return { checkoutUrl: data.url, error: null };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { checkoutUrl: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao iniciar checkout' };
    }
  },

  /**
   * Processar webhook do Stripe (em produção, isso seria feito no servidor)
   */
  async handleStripeWebhook(event: any): Promise<StatusResponse> {
    try {
      const eventType = event.type;

      switch (eventType) {
        case 'checkout.session.completed': {
          // Finalização bem-sucedida de checkout
          const session = event.data.object;
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const userId = session.client_reference_id; // O ID do usuário seria passado como client_reference_id

          // Criar ou atualizar registro de assinatura
          await this.createOrUpdateSubscription(userId, customerId, subscriptionId, SubscriptionStatus.Active, SubscriptionTier.Monthly);
          break;
        }
        case 'customer.subscription.updated': {
          // Atualização de assinatura
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          // Obter usuário pelo customerId
          const { data: user } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (!user) throw new Error('Usuário não encontrado para o customer_id: ' + customerId);

          // Mapear status do Stripe para nosso enum
          let status: SubscriptionStatus;
          switch (subscription.status) {
            case 'active':
              status = SubscriptionStatus.Active;
              break;
            case 'canceled':
              status = SubscriptionStatus.Canceled;
              break;
            case 'past_due':
              status = SubscriptionStatus.PastDue;
              break;
            case 'unpaid':
              status = SubscriptionStatus.Unpaid;
              break;
            case 'trialing':
              status = SubscriptionStatus.Trialing;
              break;
            default:
              status = SubscriptionStatus.Canceled;
          }

          // Atualizar assinatura
          await this.updateSubscriptionStatus(user.user_id, status);
          break;
        }
        case 'customer.subscription.deleted': {
          // Cancelamento de assinatura
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          // Obter usuário pelo customerId
          const { data: user } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (!user) throw new Error('Usuário não encontrado para o customer_id: ' + customerId);

          // Atualizar assinatura
          await this.updateSubscriptionStatus(user.user_id, SubscriptionStatus.Canceled);
          break;
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook' };
    }
  },

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(userId: string): Promise<StatusResponse> {
    try {
      // Em produção, isto seria uma chamada para uma função serverless que interagiria com a API do Stripe
      // Aqui estamos simulando uma chamada para a nossa API
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cancelar assinatura');
      }

      // Localmente, apenas atualizamos o status
      await this.updateSubscriptionStatus(userId, SubscriptionStatus.Canceled);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao cancelar assinatura' };
    }
  },

  /**
   * Método auxiliar para criar ou atualizar uma assinatura
   */
  async createOrUpdateSubscription(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
    tier: SubscriptionTier
  ): Promise<void> {
    // Verificar se já existe uma assinatura
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const currentPeriodStart = now.toISOString();
    
    // Definir fim do período (1 mês no futuro para planos mensais, 1 ano para anuais)
    const futureDate = new Date(now);
    if (tier === SubscriptionTier.Monthly) {
      futureDate.setMonth(futureDate.getMonth() + 1);
    } else if (tier === SubscriptionTier.Yearly) {
      futureDate.setFullYear(futureDate.getFullYear() + 1);
    }
    const currentPeriodEnd = futureDate.toISOString();

    if (existingSubscription) {
      // Atualizar assinatura existente
      await supabase
        .from('user_subscriptions')
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status,
          tier,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          auto_renew: true
        })
        .eq('id', existingSubscription.id);
    } else {
      // Criar nova assinatura
      await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status,
          tier,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          auto_renew: true
        });
    }

    // Atualizar o nível de acesso do usuário
    await supabase
      .from('users')
      .update({ role: 'premium' })
      .eq('id', userId);
  },

  /**
   * Método auxiliar para atualizar apenas o status de uma assinatura
   */
  async updateSubscriptionStatus(userId: string, status: SubscriptionStatus): Promise<void> {
    // Atualizar status da assinatura
    await supabase
      .from('user_subscriptions')
      .update({ 
        status,
        // Se o status for cancelado, definir auto_renew como false
        ...(status === SubscriptionStatus.Canceled ? { auto_renew: false } : {})
      })
      .eq('user_id', userId);
    
    // Se o status for cancelado, atualizar o nível de acesso do usuário
    if (status === SubscriptionStatus.Canceled) {
      await supabase
        .from('users')
        .update({ role: 'free' })
        .eq('id', userId);
    }
  }
};

export default SubscriptionService; 