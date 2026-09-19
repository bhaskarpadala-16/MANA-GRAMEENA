import 'server-only';
import { logger } from '@/lib/observability/logger';
import prisma from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailDeliveryStatus = 'SENT' | 'UNVERIFIED' | 'FAILED';

export interface EmailSendResult {
  status: EmailDeliveryStatus;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentMethod: string;
  items?: {
    productName: string;
    quantity: number;
    totalPrice: number;
  }[];
  shippingAddress?: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface ShipmentEmailData {
  carrierName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

/**
 * Dispatches an email using the configured production provider.
 * Guarantees zero secret exposure and observable error logging.
 * Never throws exceptions that could disrupt database transactions.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'orders@managrameena.com';

  // Rule 9: If no real provider is configured, do not invent credentials or fake delivery.
  if (!apiKey) {
    logger.warn('Email', 'Email delivery unverified: No EMAIL_PROVIDER_API_KEY configured in environment', {
      to: payload.to,
      subject: payload.subject,
    });
    return {
      status: 'UNVERIFIED',
      provider: 'NONE',
      error: 'EMAIL_PROVIDER_API_KEY not configured. Email recorded in operational log.',
    };
  }

  try {
    // Modular REST API dispatch (compatible with Resend / transactional email APIs)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Mana Grameena <${fromAddress}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status} from email provider`;
      logger.error('Email', 'Email provider returned an error', {
        to: payload.to,
        subject: payload.subject,
        error: errorMsg,
      });
      return {
        status: 'FAILED',
        provider: 'RESEND_API',
        error: errorMsg,
      };
    }

    logger.info('Email', 'Transactional email successfully dispatched', {
      to: payload.to,
      subject: payload.subject,
      messageId: data.id,
    });

    return {
      status: 'SENT',
      provider: 'RESEND_API',
      messageId: data.id,
    };
  } catch (error: any) {
    // Rule 2: Email failure must never silently disappear; must generate observable structured error.
    logger.error('Email', 'Operational network failure while dispatching transactional email', {
      to: payload.to,
      subject: payload.subject,
      error: error?.message,
    });
    return {
      status: 'FAILED',
      provider: 'RESEND_API',
      error: error?.message || 'Network transport failure during email dispatch',
    };
  }
}

/**
 * Retrieves a customer's email and full name given their userId.
 * Safely accesses auth.users via admin client and profiles via Prisma.
 */
export async function getCustomerContact(
  userId: string
): Promise<{ email: string; name: string } | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!data?.user?.email) {
      return null;
    }

    const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
    return {
      email: data.user.email,
      name: name || 'Valued Customer',
    };
  } catch (err: any) {
    logger.warn('Email', 'Could not retrieve customer contact for email dispatch', {
      userId,
      error: err?.message,
    });
    return null;
  }
}

// ==========================================
// TEMPLATE BUILDERS (HERBAL BRANDED)
// ==========================================

function wrapEmailTemplate(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#fbf8f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#122619;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbf8f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7ddcf;border-radius:24px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1b3b26;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#fbf8f2;font-family:Georgia,serif;letter-spacing:0.5px;">Mana Grameena</h1>
              <p style="margin:4px 0 0 0;font-size:12px;color:#dfac50;letter-spacing:1px;text-transform:uppercase;">Authentic Homemade Herbal Essentials</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f4eee2;padding:24px 32px;text-align:center;border-top:1px solid #e7ddcf;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#45674f;">Handcrafted with pure devotion at our rural artisan centers.</p>
              <p style="margin:0;font-size:11px;color:#6b8773;">If you have any questions, reach out to <a href="mailto:care@managrameena.com" style="color:#255234;font-weight:600;text-decoration:none;">care@managrameena.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOrderPlacedEmail(order: OrderEmailData): EmailPayload {
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4eee2;font-size:13px;color:#122619;">
          <strong>${item.productName}</strong> × ${item.quantity}
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #f4eee2;font-size:13px;color:#122619;font-weight:600;">
          ₹${item.totalPrice.toLocaleString('en-IN')}
        </td>
      </tr>`
    )
    .join('');

  const shippingHtml = order.shippingAddress
    ? `<div style="background-color:#fbf8f2;padding:16px;border-radius:16px;border:1px solid #e7ddcf;margin-top:24px;">
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:bold;color:#122619;text-transform:uppercase;">Delivery Address</p>
        <p style="margin:0;font-size:13px;color:#3d6148;line-height:1.4;">
          ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}
        </p>
        <p style="margin:8px 0 0 0;font-size:12px;color:#597962;">Payment Method: <strong>${order.paymentMethod}</strong></p>
      </div>`
    : `<p style="margin:8px 0 0 0;font-size:12px;color:#597962;">Payment Method: <strong>${order.paymentMethod}</strong></p>`;

  const body = `
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#122619;font-family:Georgia,serif;">Order Confirmation</h2>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">Dear ${order.customerName},</p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Thank you for your devotion to authentic homemade herbal wellness. We have received your order 
      <strong style="color:#1b3b26;">#${order.orderNumber}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <thead>
        <tr>
          <th align="left" style="padding-bottom:8px;border-bottom:2px solid #e7ddcf;font-size:12px;text-transform:uppercase;color:#597962;">Item</th>
          <th align="right" style="padding-bottom:8px;border-bottom:2px solid #e7ddcf;font-size:12px;text-transform:uppercase;color:#597962;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding-top:12px;font-size:15px;font-weight:bold;color:#122619;">Total Amount</td>
          <td align="right" style="padding-top:12px;font-size:18px;font-weight:bold;color:#1b3b26;font-family:Georgia,serif;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    ${shippingHtml}
  `;

  return {
    to: order.customerEmail,
    subject: `Order Confirmed: #${order.orderNumber} | Mana Grameena`,
    html: wrapEmailTemplate(`Order Confirmed #${order.orderNumber}`, body),
  };
}

export function buildPaymentProofReceivedEmail(order: OrderEmailData, transactionRef: string): EmailPayload {
  const body = `
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#122619;font-family:Georgia,serif;">Payment Proof Received</h2>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">Dear ${order.customerName},</p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      We have successfully received your payment proof for order <strong style="color:#1b3b26;">#${order.orderNumber}</strong>.
    </p>
    <div style="background-color:#fbf8f2;padding:16px;border-radius:16px;border:1px solid #e7ddcf;margin:20px 0;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:bold;color:#122619;text-transform:uppercase;">Submission Details</p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#3d6148;">Order Amount: <strong>₹${order.totalAmount.toLocaleString('en-IN')}</strong></p>
      <p style="margin:0;font-size:13px;color:#3d6148;">UTR / Transaction Reference: <strong style="font-family:monospace;">${transactionRef}</strong></p>
    </div>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Our accounts team is reviewing your transaction screenshot and banking reference. Once verified, your order will be confirmed and processed for dispatch.
    </p>
  `;

  return {
    to: order.customerEmail,
    subject: `Payment Proof Received: Order #${order.orderNumber} | Mana Grameena`,
    html: wrapEmailTemplate(`Payment Proof Received #${order.orderNumber}`, body),
  };
}

export function buildPaymentApprovedEmail(order: OrderEmailData): EmailPayload {
  const body = `
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#122619;font-family:Georgia,serif;">UPI Payment Verified</h2>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">Dear ${order.customerName},</p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Your manual UPI transfer for order <strong style="color:#1b3b26;">#${order.orderNumber}</strong> 
      (₹${order.totalAmount.toLocaleString('en-IN')}) has been verified and confirmed against our merchant account.
    </p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Our rural artisans are now preparing your natural formulations for packaging and dispatch.
    </p>
  `;

  return {
    to: order.customerEmail,
    subject: `Payment Verified for Order #${order.orderNumber} | Mana Grameena`,
    html: wrapEmailTemplate(`Payment Verified #${order.orderNumber}`, body),
  };
}

export function buildPaymentRejectedEmail(order: OrderEmailData, reason: string): EmailPayload {
  const body = `
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#b91c1c;font-family:Georgia,serif;">Action Required: Payment Verification Notice</h2>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">Dear ${order.customerName},</p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      We were unable to verify your manual UPI transfer for order <strong style="color:#1b3b26;">#${order.orderNumber}</strong>.
    </p>
    <div style="background-color:#fef2f2;padding:16px;border-radius:16px;border:1px solid #fecaca;margin:16px 0;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:bold;color:#991b1b;text-transform:uppercase;">Reason Noted by Finance Team</p>
      <p style="margin:0;font-size:13px;color:#7f1d1d;">${reason}</p>
    </div>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Please visit your order portal to submit the updated 12-digit UTR reference or contact our support team at 
      <a href="mailto:care@managrameena.com" style="color:#255234;font-weight:600;">care@managrameena.com</a> so we can assist you.
    </p>
  `;

  return {
    to: order.customerEmail,
    subject: `Important: Payment Update Needed for Order #${order.orderNumber} | Mana Grameena`,
    html: wrapEmailTemplate(`Payment Verification Update #${order.orderNumber}`, body),
  };
}

export function buildShipmentDispatchedEmail(order: OrderEmailData, shipment: ShipmentEmailData): EmailPayload {
  const body = `
    <h2 style="margin:0 0 12px 0;font-size:20px;color:#122619;font-family:Georgia,serif;">Your Herbal Essentials are on the Way!</h2>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">Dear ${order.customerName},</p>
    <p style="font-size:14px;color:#3d6148;line-height:1.5;">
      Great news! Your order <strong style="color:#1b3b26;">#${order.orderNumber}</strong> has been packaged with care and dispatched.
    </p>
    <div style="background-color:#fbf8f2;padding:16px;border-radius:16px;border:1px solid #e7ddcf;margin:20px 0;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:bold;color:#122619;text-transform:uppercase;">Courier Details</p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#3d6148;">Courier Partner: <strong>${shipment.carrierName}</strong></p>
      ${
        shipment.trackingNumber
          ? `<p style="margin:0;font-size:13px;color:#3d6148;">Tracking Number: <strong style="font-family:monospace;">${shipment.trackingNumber}</strong></p>`
          : ''
      }
    </div>
  `;

  return {
    to: order.customerEmail,
    subject: `Shipped: Order #${order.orderNumber} is on its way | Mana Grameena`,
    html: wrapEmailTemplate(`Order Dispatched #${order.orderNumber}`, body),
  };
}
