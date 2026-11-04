import test from 'node:test';
import assert from 'node:assert/strict';
import { hmacSha256Hex, verifyHmacSha256Hex, safeEqualHex } from '../razorpay.js';

test('Razorpay HMAC verification accepts a valid SHA-256 signature',()=>{
  const secret='unit-test-secret';
  const raw='{"event":"payment.captured","id":"evt_123"}';
  const signature=hmacSha256Hex(secret,raw);
  assert.equal(verifyHmacSha256Hex(secret,raw,signature),true);
});

test('Razorpay HMAC verification rejects altered payloads and signatures',()=>{
  const secret='unit-test-secret';
  const raw='{"event":"payment.captured"}';
  const signature=hmacSha256Hex(secret,raw);
  assert.equal(verifyHmacSha256Hex(secret,raw+' ',signature),false);
  assert.equal(verifyHmacSha256Hex(secret,raw,'0'.repeat(64)),false);
  assert.equal(verifyHmacSha256Hex('',raw,signature),false);
});

test('constant-time hex compare rejects malformed values',()=>{
  assert.equal(safeEqualHex('bad','bad'),false);
  assert.equal(safeEqualHex('a'.repeat(64),'a'.repeat(64)),true);
  assert.equal(safeEqualHex('a'.repeat(64),'b'.repeat(64)),false);
});