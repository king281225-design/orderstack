import "server-only";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { WHATSAPP_URL, PHONE_DISPLAY, SUPPORT_RESPONSE_TARGET, buildWhatsAppUrl } from "@/lib/contact";
import type { TrialFollowUpStepId } from "@/lib/trial-followup";
import { escapeHtml, isEmailConfigured, sendEmailRaw } from "@/lib/notifications/email";

/**
 * Trial-to-paid follow-up emails (schedule: src/lib/trial-followup.ts, who
 * gets what: src/lib/data/trial-followups.ts). Same fire-and-forget contract
 * as the rest of the notifications — never throws, dormant without email
 * credentials.
 */
export type TrialFollowUpEmailInput = {
  to: string;
  step: TrialFollowUpStepId;
  restaurantName: string;
  slug: string;
  origin: string;
  menuItemCount: number;
  orderCount: number;
  trialDaysLeft: number;
  /** False once the one-time WELCOME100 discount has already been used. */
  welcomeOfferAvailable: boolean;
  unsubscribeUrl: string;
};

function layout(opts: {
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;line-height:1.55">
      <h2 style="margin:0 0 12px;font-size:20px;color:#111827">${opts.heading}</h2>
      ${opts.bodyHtml}
      <p style="margin:24px 0">
        <a href="${opts.ctaUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">${opts.ctaLabel}</a>
      </p>
      <p style="font-size:14px">Questions? Reply to this email, or WhatsApp us on <a href="${WHATSAPP_URL}">${PHONE_DISPLAY}</a> — we aim to respond within ${SUPPORT_RESPONSE_TARGET}.</p>
      <p style="font-size:14px;margin-top:18px">— Team BhojSetu</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 10px">
      <p style="font-size:12px;color:#6b7280">You're receiving this because you started a free trial on BhojSetu. <a href="${opts.unsubscribeUrl}" style="color:#6b7280">Stop these emails</a>.</p>
    </div>`;
}

export function buildTrialFollowUpEmail(input: TrialFollowUpEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.restaurantName);
  const dash = `${input.origin}/dashboard`;
  const billing = `${dash}/billing`;
  const starter = PLAN_DEFINITIONS.STARTER;
  const price = `₹${(starter.priceCents / 100).toLocaleString("en-IN")}`;
  const storefront = `${input.origin}/r/${input.slug}`;
  const hasMenu = input.menuItemCount > 0;
  const offer = input.welcomeOfferAvailable
    ? `<p>Use code <strong>WELCOME100</strong> on your Billing page for <strong>₹100 off</strong> your first plan purchase (any plan) — a one-time offer for new restaurants.</p>`
    : "";

  let subject: string;
  let heading: string;
  let body: string;
  let ctaLabel: string;
  let ctaUrl: string;

  switch (input.step) {
    case "setup_menu":
      subject = hasMenu
        ? `${input.restaurantName}: your menu is in — now share your ordering link`
        : `Set up ${input.restaurantName} on BhojSetu in 10 minutes`;
      heading = hasMenu ? "Great start — your menu is live" : "Let's get your menu online";
      body = hasMenu
        ? `<p>Hi! <strong>${name}</strong> already has ${input.menuItemCount} menu item${input.menuItemCount === 1 ? "" : "s"} on BhojSetu. Next, add your logo and brand colours so your ordering page looks like <em>your</em> restaurant, then share this link with customers:</p><p><a href="${storefront}">${storefront}</a></p>`
        : `<p>Hi! You started a free trial for <strong>${name}</strong> — thank you. The quickest way to begin is your menu:</p><ul><li>Photograph your paper menu — we read it for you (AI menu import)</li><li>Or load a sample menu and edit it</li><li>Or add items one by one with photos</li></ul><p>It takes about 10 minutes, and then customers can order straight from your own link.</p>`;
      ctaLabel = hasMenu ? "Open dashboard" : "Add my menu";
      ctaUrl = hasMenu ? dash : `${dash}/menu`;
      break;
    case "first_orders":
      subject = `Get your first online order at ${input.restaurantName}`;
      heading =
        input.orderCount > 0
          ? `You've received ${input.orderCount} order${input.orderCount === 1 ? "" : "s"} — keep it going`
          : "Three ways to get your first order";
      body = `<p>Restaurants that get orders in the first week do three things:</p><ol><li><strong>Print your table QR codes</strong> — dine-in customers scan and order from their phone.</li><li><strong>Share your link</strong> on WhatsApp status and Instagram: <a href="${storefront}">${storefront}</a></li><li><strong>Create a coupon</strong> for first-time customers.</li></ol><p>Also try <strong>New Bill</strong>, KOT printing and inventory — all included in your trial.</p>`;
      ctaLabel = "Print my QR codes";
      ctaUrl = `${dash}/tables`;
      break;
    case "two_days_left": {
      const left =
        input.trialDaysLeft > 0
          ? `${input.trialDaysLeft} day${input.trialDaysLeft === 1 ? "" : "s"}`
          : "Less than a day";
      subject = `${left} left in your BhojSetu trial — ${input.restaurantName}`;
      heading = "Your free trial is almost over";
      body = `<p>The free trial for <strong>${name}</strong> ends soon. After that the dashboard pauses until you pick a plan — your menu and data stay safe either way.</p><p>Plans start at <strong>${price}/month</strong> (${starter.label}) — menu, orders, billing, QR ordering, inventory and KOT all included.</p>${offer}`;
      ctaLabel = "Choose a plan";
      ctaUrl = billing;
      break;
    }
    case "trial_ended":
      subject = `Your BhojSetu trial has ended — keep ${input.restaurantName} running`;
      heading = "Your free trial has ended";
      body = `<p>The trial for <strong>${name}</strong> is over, so your dashboard is paused. Nothing is lost — your menu, settings and orders are saved, and picking a plan switches everything back on instantly.</p><p>${starter.label} plan: <strong>${price}/month</strong>. No setup fees.</p>${offer}`;
      ctaLabel = "Reactivate my restaurant";
      ctaUrl = billing;
      break;
    case "welcome_offer":
      subject = input.welcomeOfferAvailable
        ? `₹100 off to bring ${input.restaurantName} back on BhojSetu`
        : `${input.restaurantName} is waiting on BhojSetu`;
      heading = input.welcomeOfferAvailable ? "₹100 off your first month" : "Your restaurant is waiting";
      body = `<p>We've saved <strong>${name}</strong>'s menu and settings for you.</p>${
        input.welcomeOfferAvailable
          ? `<p>Use code <strong>WELCOME100</strong> on the Billing page — <strong>₹100 off</strong> your first plan purchase (any plan, from ${price}/month), valid once.</p>`
          : `<p>Pick a plan from ${price}/month and your ordering page, billing and KOT are back instantly.</p>`
      }`;
      ctaLabel = "Go to Billing";
      ctaUrl = billing;
      break;
    case "need_help":
      subject = `Need a hand setting up ${input.restaurantName}?`;
      heading = "Can we help you get going?";
      body = `<p>We noticed <strong>${name}</strong> hasn't continued after the trial. If something wasn't clear, didn't work, or the price wasn't right — tell us. We can walk you through setup on a call, help import your menu, or answer anything about pricing.</p><p>Reply to this email or WhatsApp us — a real person will help.</p>`;
      ctaLabel = "Chat with us on WhatsApp";
      ctaUrl = buildWhatsAppUrl(`Hi, I need help with BhojSetu for ${input.restaurantName}`);
      break;
    case "plans_recap":
      subject = `What ${input.restaurantName} gets from ${price}/month on BhojSetu`;
      heading = "Everything in one simple plan";
      body = `<p>A quick recap of what <strong>${name}</strong> can switch back on:</p><ul><li>Your own online ordering page with UPI &amp; cash on delivery</li><li>Fast billing with GST invoices and thermal printing</li><li>QR table ordering for dine-in</li><li>KOT slips for the kitchen, plus inventory &amp; low-stock alerts</li></ul><p>From <strong>${price}/month</strong>, or save with the yearly plan.</p>${offer}`;
      ctaLabel = "See plans";
      ctaUrl = billing;
      break;
    case "last_note":
      subject = `A last note from BhojSetu about ${input.restaurantName}`;
      heading = "This is our last email";
      body = `<p>We don't want to crowd your inbox, so this is the final reminder about <strong>${name}</strong>. Your menu and data are still saved, and you can come back any time by choosing a plan.</p><p>Thank you for trying BhojSetu — we hope to serve your restaurant soon.</p>`;
      ctaLabel = "Choose a plan";
      ctaUrl = billing;
      break;
  }

  return {
    subject,
    html: layout({ heading, bodyHtml: body, ctaLabel, ctaUrl, unsubscribeUrl: input.unsubscribeUrl }),
  };
}

/** Resolves true only if the email was actually handed to the mail backend; never throws. */
export async function sendTrialFollowUpEmail(input: TrialFollowUpEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const { subject, html } = buildTrialFollowUpEmail(input);
    await sendEmailRaw(input.to, subject, html);
    return true;
  } catch (err) {
    console.error("sendTrialFollowUpEmail failed:", err);
    return false;
  }
}
