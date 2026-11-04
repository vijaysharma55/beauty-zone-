import crypto from 'node:crypto';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const razorpayEnabled = () => Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_WEBHOOK_SECRET && SUPABASE_URL && SERVICE_ROLE);
const basicAuth = () => 'Basic ' + Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');

async function razorpayRequest(path, options={}) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) throw new Error('Razorpay is not configured. Add the server-side Razorpay keys.');
  const response = await fetch('https://api.razorpay.com/v1' + path, {
    ...options, headers: { Authorization: basicAuth(), 'Content-Type':'application/json', ...(options.headers||{}) },
  });
  const text = await response.text(); let value=null;
  if(text){try{value=JSON.parse(text);}catch{value={message:text.slice(0,300)};}}
  if(!response.ok) throw new Error('Razorpay API failed ('+response.status+'): '+(value?.error?.description||value?.message||'Unknown error'));
  return value;
}

export async function fetchRazorpayOrder(orderId) {
  return razorpayRequest('/orders/'+encodeURIComponent(orderId));
}

export async function createRazorpayOrder({amountPaise,receipt,notes}) {
  const amount=Math.round(Number(amountPaise));
  if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000) throw new Error('Payment amount is invalid.');
  const order=await razorpayRequest('/orders',{method:'POST',body:JSON.stringify({amount,currency:'INR',receipt:String(receipt).slice(0,40),payment_capture:1,notes:notes||{}})});
  if(!order?.id||Number(order.amount)!==amount||order.currency!=='INR') throw new Error('Razorpay returned an invalid order.');
  return order;
}

export function safeEqualHex(actual,expected) {
  if(typeof actual!=='string'||typeof expected!=='string'||! /^[a-f0-9]{64}$/i.test(actual)||! /^[a-f0-9]{64}$/i.test(expected)) return false;
  const a=Buffer.from(actual,'hex'),b=Buffer.from(expected,'hex');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function hmacSha256Hex(secret,value){
  return crypto.createHmac('sha256',secret).update(value).digest('hex');
}
export function verifyHmacSha256Hex(secret,value,signature){
  if(!secret||typeof value!=='string'||typeof signature!=='string')return false;
  return safeEqualHex(hmacSha256Hex(secret,value),signature);
}
export function verifyCheckoutSignature(orderId,paymentId,signature) {
  if(!RAZORPAY_KEY_SECRET||!orderId||!paymentId||!signature)return false;
  return verifyHmacSha256Hex(RAZORPAY_KEY_SECRET,String(orderId)+'|'+String(paymentId),signature);
}
export function verifyWebhookSignature(rawBody,signature) {
  if(!RAZORPAY_WEBHOOK_SECRET||!Buffer.isBuffer(rawBody)||!signature)return false;
  return verifyHmacSha256Hex(RAZORPAY_WEBHOOK_SECRET,rawBody.toString('utf8'),signature);
}

export async function fetchCapturedPayment(paymentId,expectedOrderId,expectedAmount) {
  const payment=await razorpayRequest('/payments/'+encodeURIComponent(paymentId));
  if(payment.order_id!==expectedOrderId) throw new Error('Payment does not belong to this Razorpay order.');
  if(payment.status!=='captured') throw new Error('Payment is not captured yet. Current status: '+payment.status);
  if(payment.currency!=='INR'||Number(payment.amount)!==Number(expectedAmount)) throw new Error('Captured payment amount or currency does not match the BeautyZone order.');
  return payment;
}

async function serviceRequest(path,options={}) {
  if(!SUPABASE_URL||!SERVICE_ROLE) throw new Error('Supabase service-role configuration is missing on the server.');
  const response=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:SERVICE_ROLE,Authorization:'Bearer '+SERVICE_ROLE,'Content-Type':'application/json',...(options.headers||{})}});
  const text=await response.text();let value=null;if(text){try{value=JSON.parse(text);}catch{value=text;}}
  if(!response.ok)throw new Error('Supabase payment operation failed ('+response.status+'): '+(value?.message||value?.hint||JSON.stringify(value).slice(0,300)));
  return value;
}
export async function processRazorpayEvent(eventId,event) {
  return serviceRequest('/rest/v1/rpc/process_razorpay_webhook',{method:'POST',body:JSON.stringify({p_event_id:eventId,p_event:event})});
}
export async function readServiceRow(table,query) {
  const rows=await serviceRequest('/rest/v1/'+table+'?'+query,{method:'GET'});
  return Array.isArray(rows)?rows[0]||null:null;
}
export async function insertServiceRow(table,row) {
  const rows=await serviceRequest('/rest/v1/'+table,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
  return Array.isArray(rows)?rows[0]||null:null;
}
export async function patchServiceRow(table,query,patch) {
  return serviceRequest('/rest/v1/'+table+'?'+query,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
}

export async function razorpayWebhookHandler(req,res) {
  const raw=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
  const signature=req.get('x-razorpay-signature')||'';
  const eventId=req.get('x-razorpay-event-id')||'';
  if(!verifyWebhookSignature(raw,signature)) return res.status(401).json({error:'Invalid Razorpay webhook signature.'});
  if(!eventId||eventId.length>200) return res.status(400).json({error:'Missing Razorpay event ID.'});
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{return res.status(400).json({error:'Invalid JSON webhook payload.'});}
  try {
    const result=await processRazorpayEvent(eventId,event);
    return res.status(200).json({received:true,result});
  } catch(error) {
    console.error('[razorpay webhook] processing failed:',error.message);
    // 5xx makes Razorpay retry. The webhook-event insert is transactional with processing.
    return res.status(500).json({error:'Webhook processing failed. Provider may retry.'});
  }
}