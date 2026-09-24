/**
 * Support and licensing are separate. This module only describes where Stripe
 * Connect would attach later. It does not create charges, customers, or
 * Connect accounts.
 *
 * Support (report_supports)
 * - One-time reporter tips: after a support signal, collect a Connect
 *   destination charge or transfer to the report author's connected account.
 * - Recurring reporter support: a Stripe Subscription on the supporter,
 *   transferring a share to the reporter's connected account on each invoice.
 *
 * Licensing (licensing_transactions)
 * - Licensing payments: after status is `agreed`, create a Connect payment
 *   for the inquiry. Do not treat inquiry, discussing, or agreed as a grant
 *   of rights by themselves.
 *
 * Platform fee
 * - Apply an application_fee_amount (or transfer_data.amount) on those
 *   Connect payments. Do not store fee columns on reports or inquiries until
 *   a payment actually exists.
 *
 * Keep Stripe customer / account / payment ids in a dedicated payments table
 * keyed by report_supports.id or licensing_transactions.id when that work starts.
 */
export const PAYMENTS_NOT_IMPLEMENTED = true;
