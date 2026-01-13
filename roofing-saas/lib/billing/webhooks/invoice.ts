/**
 * Invoice Webhook Handlers
 *
 * Handles Stripe invoice events for:
 * - Storing invoice records
 * - Tracking payment success/failure
 * - Triggering notifications
 */

import type { StripeEvent } from '../stripe';
import { logSubscriptionEvent } from '../subscription';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/resend/email';
import {
  getTenantAdminEmail,
  startGracePeriod,
  getGracePeriodStatus,
  GRACE_PERIOD_DAYS,
} from '../grace-period';
import { createPaymentFailedEmail, getPaymentFailedSubject } from '../emails';

// Extended invoice type for webhook data
interface InvoiceData {
  id: string;
  number: string | null;
  status: string | null;
  customer: string | { id: string };
  subscription: string | { id: string } | null;
  payment_intent: string | { id: string } | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  period_start: number | null;
  period_end: number | null;
  due_date: number | null;
  attempt_count: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  lines: { data: Array<{ id: string; description: string | null; amount: number; quantity: number | null }> };
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Handle invoice events
 */
export async function handleInvoiceEvent(
  event: StripeEvent
): Promise<{ success: boolean; message: string }> {
  const invoice = event.data.object as unknown as InvoiceData;

  // Get tenant ID from subscription metadata or customer metadata
  const tenantId = await getTenantIdFromInvoice(invoice);

  if (!tenantId) {
    logger.warn('Invoice event missing tenant context', {
      eventType: event.type,
      invoiceId: invoice.id,
    });
    return { success: false, message: 'Cannot determine tenant from invoice' };
  }

  switch (event.type) {
    case 'invoice.paid':
      return await handleInvoicePaid(event, invoice, tenantId);

    case 'invoice.payment_failed':
      return await handleInvoicePaymentFailed(event, invoice, tenantId);

    case 'invoice.finalized':
      return await handleInvoiceFinalized(event, invoice, tenantId);

    case 'invoice.upcoming':
      return await handleInvoiceUpcoming(event, invoice, tenantId);

    default:
      return { success: true, message: `Unhandled invoice event: ${event.type}` };
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle successful payment
 */
async function handleInvoicePaid(
  event: StripeEvent,
  invoice: InvoiceData,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createAdminClient();

  logger.info('Processing invoice.paid', {
    invoiceId: invoice.id,
    tenantId,
    amount: invoice.amount_paid,
  });

  // Upsert invoice record
  await supabase.from('invoices').upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id:
        typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : invoice.payment_intent?.id,
      invoice_number: invoice.number,
      status: 'paid',
      amount_due_cents: invoice.amount_due,
      amount_paid_cents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      paid_at: new Date().toISOString(),
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf_url: invoice.invoice_pdf,
      line_items: invoice.lines?.data?.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })) || [],
    },
    { onConflict: 'stripe_invoice_id' }
  );

  // Get subscription ID for event logging
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  if (sub) {
    await logSubscriptionEvent(tenantId, sub.id, {
      event_type: 'payment_succeeded',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      amount_cents: invoice.amount_paid,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.number,
      },
      initiated_by: 'stripe_webhook',
    });
  }

  return {
    success: true,
    message: `Invoice paid: ${invoice.id}`,
  };
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(
  event: StripeEvent,
  invoice: InvoiceData,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createAdminClient();

  logger.warn('Processing invoice.payment_failed', {
    invoiceId: invoice.id,
    tenantId,
    amount: invoice.amount_due,
  });

  // Update invoice status
  await supabase.from('invoices').upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      status: 'open', // Still open, payment failed
      amount_due_cents: invoice.amount_due,
      amount_paid_cents: invoice.amount_paid || 0,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  // Get subscription ID for event logging
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  if (sub) {
    await logSubscriptionEvent(tenantId, sub.id, {
      event_type: 'payment_failed',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      amount_cents: invoice.amount_due,
      metadata: {
        invoice_id: invoice.id,
        attempt_count: invoice.attempt_count,
      },
      initiated_by: 'stripe_webhook',
    });
  }

  // Start grace period if not already started
  const gracePeriodStatus = await getGracePeriodStatus(tenantId);
  if (!gracePeriodStatus.isInGracePeriod) {
    await startGracePeriod(tenantId, 'payment_failed');
  }

  // Calculate grace period end date for email
  const gracePeriodEndDate = gracePeriodStatus.isInGracePeriod
    ? gracePeriodStatus.gracePeriodEndsAt!
    : new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const daysRemaining = gracePeriodStatus.isInGracePeriod
    ? gracePeriodStatus.daysRemaining!
    : GRACE_PERIOD_DAYS;

  // Send notification email about failed payment
  const adminInfo = await getTenantAdminEmail(tenantId);
  if (adminInfo) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
    const updatePaymentUrl = `${baseUrl}/settings?tab=billing`;

    // Format amount in dollars
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency.toUpperCase(),
    }).format(invoice.amount_due / 100);

    const html = createPaymentFailedEmail({
      tenantName: adminInfo.tenantName,
      amount: amountFormatted,
      updatePaymentUrl,
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      attemptNumber: invoice.attempt_count,
      gracePeriodDays: daysRemaining,
      gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    try {
      await sendEmail({
        to: adminInfo.email,
        subject: getPaymentFailedSubject(invoice.attempt_count),
        html,
      });

      logger.info('Sent payment failed email', {
        tenantId,
        to: adminInfo.email,
        attemptCount: invoice.attempt_count,
      });
    } catch (emailError) {
      logger.error('Failed to send payment failed email', { tenantId, error: emailError });
    }
  }

  return {
    success: true,
    message: `Invoice payment failed: ${invoice.id}`,
  };
}

/**
 * Handle invoice finalized (ready for payment)
 */
async function handleInvoiceFinalized(
  event: StripeEvent,
  invoice: InvoiceData,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createAdminClient();

  logger.info('Processing invoice.finalized', {
    invoiceId: invoice.id,
    tenantId,
    amount: invoice.amount_due,
  });

  // Create/update invoice record
  await supabase.from('invoices').upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number,
      status: invoice.status || 'open',
      amount_due_cents: invoice.amount_due,
      amount_paid_cents: invoice.amount_paid || 0,
      currency: invoice.currency.toUpperCase(),
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      due_date: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf_url: invoice.invoice_pdf,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  return {
    success: true,
    message: `Invoice finalized: ${invoice.id}`,
  };
}

/**
 * Handle upcoming invoice notification
 */
async function handleInvoiceUpcoming(
  event: StripeEvent,
  invoice: InvoiceData,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  logger.info('Processing invoice.upcoming', {
    invoiceId: invoice.id,
    tenantId,
    amount: invoice.amount_due,
  });

  // Note: Upcoming invoice reminder emails are handled by Stripe's built-in
  // email system. No action needed here, just logging for observability.

  return {
    success: true,
    message: 'Upcoming invoice notification processed',
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get tenant ID from invoice (via subscription or customer metadata)
 */
async function getTenantIdFromInvoice(
  invoice: InvoiceData
): Promise<string | null> {
  const supabase = await createAdminClient();

  // Try subscription metadata first
  if (invoice.subscription) {
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;

    const { data } = await supabase
      .from('subscriptions')
      .select('tenant_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (data?.tenant_id) {
      return data.tenant_id;
    }
  }

  // Try customer metadata
  if (invoice.customer) {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer.id;

    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (data?.id) {
      return data.id;
    }
  }

  return null;
}
