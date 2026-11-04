/**
 * WhatsApp Cloud API webhook.
 *
 * GET  /api/public/whatsapp/webhook — subscription verification (hub.challenge)
 * POST /api/public/whatsapp/webhook — delivery/read/failed status updates,
 *      authenticated with X-Hub-Signature-256 (HMAC of the raw body using the
 *      Meta app secret). The raw body is captured in server/index.js.
 */

import { Router } from 'express';
import {
  processWhatsAppWebhookPayload,
  resolveWhatsAppConfig,
  verifyWhatsAppWebhookSignature,
} from './whatsapp.js';

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get('/webhook', (req, res) => {
  const config = resolveWhatsAppConfig();
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  if (config.verifyToken && mode === 'subscribe' && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Webhook verification failed.' });
});

whatsappWebhookRouter.post('/webhook', (req, res) => {
  const config = resolveWhatsAppConfig();
  if (!config.appSecret) {
    return res.status(503).json({ error: 'WhatsApp webhook secret is not configured.', code: 'WEBHOOK_NOT_CONFIGURED' });
  }
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ? JSON.stringify(req.body) : '');
  const signature = req.get('x-hub-signature-256') || '';
  if (!verifyWhatsAppWebhookSignature({ rawBody, signature, secret: config.appSecret })) {
    return res.status(400).json({ error: 'Invalid webhook signature.', code: 'INVALID_SIGNATURE' });
  }
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed webhook payload.', code: 'INVALID_PAYLOAD' });
  }
  const updates = processWhatsAppWebhookPayload(payload);
  return res.status(200).json({ ok: true, updates: updates.length });
});

export default whatsappWebhookRouter;
