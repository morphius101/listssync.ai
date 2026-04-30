// Twilio inbound SMS webhook — A2P 10DLC double-opt-in state machine.
//
// Security order (do not reorder):
//   1. Express urlencoded parser (route-level, defense against global drift)
//   2. validateRequest BEFORE any DB call
//   3. Rate limit BEFORE any DB call (drop above cap, no audit row)
//   4. Idempotency check (audit insert; partial unique index on message_sid
//      raises 23505 on Twilio retries)
//   5. State transition + queue claim in ONE transaction with the audit insert
//   6. Post-commit SMS sends via Promise.allSettled (TWO-PHASE: sends are
//      side effects outside the DB transaction)
//   7. 200 + empty TwiML response

import express, { Router, type Express, type Request, type Response } from 'express';
import twilio from 'twilio';
import { and, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  consentAuditLog,
  pendingShareSms,
  recipientSmsConsent,
  type RecipientSmsConsentStatus,
} from '@shared/schema';
import { normalizeInboundPhone } from '../utils/phone';
import { sendShareSMS } from '../services/verificationService';

// ─── Body classification ─────────────────────────────────────────────────────
// YES: STRICT match — entire trimmed/uppercased body equals "YES".
// STOP: TOKEN-PRESENCE — any token (after splitting on whitespace + stripping
//       non-alpha) is a STOP keyword. "stop." opts out. "stopwatch" does not.
//       "STOP YES" → STOP wins.
// HELP: TOKEN-PRESENCE — same tokenizer, against HELP keyword set.
//
// Order: STOP > HELP > YES > OTHER. STOP must always win over YES per CTIA
// "honor opt-out under any ambiguity" guidance.

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const HELP_KEYWORDS = new Set(['HELP', 'INFO']);

export type Classification = 'YES' | 'STOP' | 'HELP' | 'OTHER';

export function classifyBody(body: string): Classification {
  const trimmed = body.trim();
  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Za-z]/g, '').toUpperCase())
    .filter(Boolean);

  if (tokens.some((t) => STOP_KEYWORDS.has(t))) return 'STOP';
  if (tokens.some((t) => HELP_KEYWORDS.has(t))) return 'HELP';
  if (trimmed.toUpperCase() === 'YES') return 'YES';
  return 'OTHER';
}

// ─── Per-phone rate limit (defense in depth) ─────────────────────────────────
// 10 inbound messages per phone per 60s rolling window. Drops above the cap
// are NOT recorded in consent_audit_log (per Phase 3a Q3). console.warn only.
// Memory: bounded by # of unique phones that have texted us in the last 60s.
// Sig validation runs first, so the From cannot be spoofed by attackers.

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateMap = new Map<string, number[]>();

function checkRateLimit(phoneE164: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (rateMap.get(phoneE164) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_MAX) {
    rateMap.set(phoneE164, recent);
    return false;
  }
  recent.push(now);
  rateMap.set(phoneE164, recent);
  return true;
}

// ─── Webhook URL construction ────────────────────────────────────────────────
// Twilio computes its signature against the EXACT URL it POSTed to. Behind
// Railway's proxy, req.protocol must reflect X-Forwarded-Proto — handled by
// `app.set('trust proxy', 1)` in server/index.ts. If you remove that line,
// every legitimate Twilio request will 403.

function buildFullUrl(req: Request): string {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${req.originalUrl}`;
}

// ─── The handler ─────────────────────────────────────────────────────────────

async function handleInboundSms(req: Request, res: Response): Promise<void> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('twilio webhook: TWILIO_AUTH_TOKEN not set — rejecting');
    res.status(500).send('Server misconfigured');
    return;
  }

  // Step 2: signature validation — BEFORE any DB call
  const signature = req.header('X-Twilio-Signature');
  if (!signature) {
    res.status(403).send('Missing signature');
    return;
  }

  const fullUrl = buildFullUrl(req);
  const isValid = twilio.validateRequest(authToken, signature, fullUrl, req.body ?? {});
  if (!isValid) {
    console.warn(`twilio webhook: invalid signature for url=${fullUrl}`);
    res.status(403).send('Invalid signature');
    return;
  }

  // Twilio always sends application/x-www-form-urlencoded with at least:
  // From, Body, MessageSid, AccountSid
  const fromRaw = (req.body?.From ?? '') as string;
  const body = (req.body?.Body ?? '') as string;
  const messageSid = (req.body?.MessageSid ?? '') as string;

  if (!fromRaw || !messageSid) {
    res.status(400).send('Missing required Twilio fields');
    return;
  }

  // Defensive E.164 normalization (Twilio always sends E.164 but we re-parse).
  // Inbound accepts any country — non-US recipients texting STOP must be honored.
  const normalized = normalizeInboundPhone(fromRaw);
  if (!normalized.ok) {
    console.error(`twilio webhook: unparseable From=${fromRaw} sid=${messageSid}`);
    res.status(400).send('Unparseable From');
    return;
  }
  const phoneE164 = normalized.e164;

  // Step 3: rate limit — BEFORE any DB call. Drops are NOT audit-logged.
  if (!checkRateLimit(phoneE164)) {
    console.warn(`twilio webhook: rate-limited phone=${phoneE164} sid=${messageSid}`);
    res.set('Content-Type', 'text/xml').send('<Response/>');
    return;
  }

  const classification = classifyBody(body);
  const sourceIp = (req.headers['x-forwarded-for'] as string || req.ip || '')
    .split(',')[0]
    .trim() || null;

  // Steps 4–5: idempotency + state transition + queue claim — ONE transaction.
  // The audit insert is the idempotency guard (partial unique index on
  // message_sid raises 23505 on Twilio retries → tx aborts → no double-action).
  let queuedToSend: Array<{ id: number; shareToken: string }> = [];
  let isDuplicate = false;

  try {
    await db.transaction(async (tx) => {
      // Read current state (needed to distinguish 'inbound_yes' from
      // 'inbound_orphan_yes' and to know whether to flip status).
      const existing = await tx
        .select()
        .from(recipientSmsConsent)
        .where(eq(recipientSmsConsent.phoneE164, phoneE164))
        .limit(1);
      const current = existing[0];

      // Decide event_type and intended state mutation.
      let eventType: string;

      if (classification === 'YES') {
        if (!current) {
          eventType = 'inbound_orphan_yes';
        } else {
          eventType = 'inbound_yes';
        }
      } else if (classification === 'STOP') {
        eventType = 'inbound_stop';
      } else if (classification === 'HELP') {
        eventType = 'inbound_help';
      } else {
        eventType = 'inbound_other';
      }

      // Audit log INSERT — first DB write in the tx, idempotency check.
      // On duplicate MessageSid the partial unique index raises 23505,
      // the entire transaction aborts, no state mutation occurs.
      await tx.insert(consentAuditLog).values({
        phoneE164,
        eventType,
        messageSid,
        body,
        sourceIp,
        ownerId: null,
      });

      // Apply state transition. Order: STOP → opted_out (terminal),
      // YES on pending → opted_in + drain, others → no-op (touch lastMessageSid).
      const now = new Date();

      if (classification === 'STOP') {
        if (current && current.status !== 'opted_out') {
          await tx
            .update(recipientSmsConsent)
            .set({
              status: 'opted_out',
              optOutTimestamp: now,
              lastMessageSid: messageSid,
              updatedAt: now,
            })
            .where(eq(recipientSmsConsent.phoneE164, phoneE164));
          // Drop queued entries that haven't been sent or already-dropped.
          // Don't overwrite sent_at — we don't rewrite delivery history.
          await tx
            .update(pendingShareSms)
            .set({ droppedReason: 'recipient_opted_out' })
            .where(
              and(
                eq(pendingShareSms.phoneE164, phoneE164),
                isNull(pendingShareSms.sentAt),
                isNull(pendingShareSms.droppedReason)
              )
            );
        } else if (current) {
          await tx
            .update(recipientSmsConsent)
            .set({ lastMessageSid: messageSid, updatedAt: now })
            .where(eq(recipientSmsConsent.phoneE164, phoneE164));
        }
        // No record + STOP → audit only, no record created. Twilio's Advanced
        // Opt-Out at the carrier level prevents future delivery anyway.
      } else if (classification === 'YES' && current && current.status === 'pending') {
        // The transition that drains the queue.
        await tx
          .update(recipientSmsConsent)
          .set({
            status: 'opted_in',
            optInMessageSid: messageSid,
            optInTimestamp: now,
            lastMessageSid: messageSid,
            updatedAt: now,
          })
          .where(eq(recipientSmsConsent.phoneE164, phoneE164));

        // Atomic claim: UPDATE … RETURNING inside the tx. Concurrent YES
        // requests cannot double-claim the same row — the first UPDATE takes
        // a row lock; the second sees sent_at IS NOT NULL and matches nothing.
        const claimed = await tx
          .update(pendingShareSms)
          .set({ sentAt: now })
          .where(
            and(
              eq(pendingShareSms.phoneE164, phoneE164),
              gt(pendingShareSms.queuedAt, sql`now() - interval '72 hours'`),
              isNull(pendingShareSms.sentAt),
              isNull(pendingShareSms.droppedReason)
            )
          )
          .returning({ id: pendingShareSms.id, shareToken: pendingShareSms.shareToken });
        queuedToSend = claimed;

        // Mark older entries (>72h) as expired. Same WHERE-not-null guards
        // prevent overwriting prior states.
        await tx
          .update(pendingShareSms)
          .set({ droppedReason: 'expired_72h' })
          .where(
            and(
              eq(pendingShareSms.phoneE164, phoneE164),
              lte(pendingShareSms.queuedAt, sql`now() - interval '72 hours'`),
              isNull(pendingShareSms.sentAt),
              isNull(pendingShareSms.droppedReason)
            )
          );
      } else if (current) {
        // YES on opted_in/opted_out, HELP, OTHER — touch lastMessageSid,
        // no state change.
        await tx
          .update(recipientSmsConsent)
          .set({ lastMessageSid: messageSid, updatedAt: now })
          .where(eq(recipientSmsConsent.phoneE164, phoneE164));
      }
      // else: no record + (YES|HELP|OTHER) → audit-only, no record created.
    });
  } catch (err: any) {
    // Postgres error code 23505 = unique_violation. Our partial unique index
    // on consent_audit_log.message_sid catches Twilio retries.
    if (err?.code === '23505') {
      isDuplicate = true;
    } else {
      console.error('twilio webhook: tx failed', { sid: messageSid, phone: phoneE164, err });
      res.status(500).send('Transaction failed');
      return;
    }
  }

  if (isDuplicate) {
    // Idempotent no-op: identical SID was processed earlier. Don't re-dispatch
    // queued sends; the original request already did (or is doing) so.
    res.set('Content-Type', 'text/xml').send('<Response/>');
    return;
  }

  // Step 6: post-commit, two-phase. Sends are side effects outside the DB
  // transaction. Failures are recorded with a separate write; we never try
  // to roll back consent state because of an SMS failure.
  // TODO: If recipient queues regularly exceed N entries, move sends to a
  // background job queue. The webhook timeout is ~15s; serial sends in a
  // big drain will time out. Promise.allSettled keeps it parallel.
  if (queuedToSend.length > 0) {
    const results = await Promise.allSettled(
      queuedToSend.map(async ({ shareToken }) => sendShareSMS(phoneE164, shareToken))
    );
    const failedIds: number[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const id = queuedToSend[i].id;
      if (r.status === 'rejected') {
        console.error(`twilio webhook: sendShareSMS threw for queue id=${id}`, r.reason);
        failedIds.push(id);
      } else if (r.value === false) {
        failedIds.push(id);
      }
    }
    if (failedIds.length > 0) {
      try {
        await db
          .update(pendingShareSms)
          .set({ droppedReason: 'send_failed' })
          .where(inArray(pendingShareSms.id, failedIds));
      } catch (e) {
        console.error('twilio webhook: failed to record send_failed', { failedIds, e });
      }
    }
  }

  // Step 7: empty TwiML. Twilio Advanced Opt-Out generates the user-facing
  // STOP/HELP replies at the carrier level; we must not double-reply.
  res.set('Content-Type', 'text/xml').send('<Response/>');
}

// Loud boot-time guard: a misconfigured webhook silently rejects every
// real Twilio request (signature validation fails). We'd rather see a
// banner in deploy logs than discover it via missing audit rows.
const DEV_PLACEHOLDERS = new Set([
  'changeme',
  'change_me',
  'placeholder',
  'your_twilio_auth_token',
  'todo',
  'xxx',
  'test',
  'dev',
  'secret',
]);

function assertTwilioAuthTokenSane(): void {
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const banner = '\n*********************************************************\n';
  if (!tok) {
    console.error(`${banner}* TWILIO WEBHOOK: TWILIO_AUTH_TOKEN is NOT SET.        *\n* Inbound SMS signature validation will reject ALL     *\n* requests with 403. Set the token before deploying.   *${banner}`);
    return;
  }
  if (DEV_PLACEHOLDERS.has(tok.toLowerCase()) || tok.length < 16) {
    console.error(`${banner}* TWILIO WEBHOOK: TWILIO_AUTH_TOKEN looks like a       *\n* placeholder/dev value (len=${String(tok.length).padEnd(3)}). Refusing to boot. *${banner}`);
    throw new Error('TWILIO_AUTH_TOKEN appears to be a placeholder/dev value — refusing to start');
  }
}

export function registerTwilioWebhookRoutes(app: Express): void {
  assertTwilioAuthTokenSane();
  const router = Router();

  // Route-level urlencoded parser. The global parser in server/index.ts also
  // handles this Content-Type, but mounting it inline keeps the route's
  // expectations explicit and survives future refactors of the global stack.
  router.post(
    '/inbound-sms',
    express.urlencoded({ extended: false }),
    handleInboundSms
  );

  // 405 for any non-POST method on the same path (per Phase 3a Q4).
  router.all('/inbound-sms', (_req, res) => {
    res.set('Allow', 'POST').status(405).send('Method Not Allowed');
  });

  app.use('/api/twilio', router);

  // TODO (deferred per Phase 1 Q7): Twilio Status Callback URL would register
  // here, e.g. router.post('/status-callback', ...). Revisit after Twilio
  // campaign clears — captures delivery state (delivered/undelivered/failed).
}

// Test-only export for unit tests / diag scripts that need to reset state.
export function _resetRateLimitForTesting(): void {
  rateMap.clear();
}
