// ================================================
// AI Tools Daily — 푸시 알림 발송 Edge Function
// VAPID 인증 기반 Web Push
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64url } from 'https://deno.land/std@0.208.0/encoding/base64url.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@ai-tools-daily.com';

const supabase = createClient(supabaseUrl, supabaseKey);

// ---- VAPID JWT 생성 (Deno Web Crypto) ----
async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12시간 유효
    sub: vapidSubject,
  };

  const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // VAPID private key (URL-safe base64) → CryptoKey
  const rawKey = urlBase64ToUint8Array(vapidPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    convertRawToP256Pkcs8(rawKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // DER → raw r||s 형식으로 변환
  const rawSig = derToRaw(new Uint8Array(signature));
  const sigB64 = base64url(rawSig);

  return `${unsignedToken}.${sigB64}`;
}

// ---- Base64url → Uint8Array ----
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

// ---- 32바이트 raw key → PKCS8 DER 래퍼 ----
function convertRawToP256Pkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 wrapper for P-256 EC private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07,
    0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
    0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x6d, 0x30,
    0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

// ---- DER 서명 → raw (r||s) 변환 ----
function derToRaw(der: Uint8Array): Uint8Array {
  // ECDSA DER 서명을 64바이트 raw (r||s)로 변환
  const raw = new Uint8Array(64);

  let offset = 3; // sequence tag(1) + length(1) + integer tag(1)
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), rDest);

  offset += rLen + 1; // skip r data + integer tag
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), sDest);

  return raw;
}

// ---- Web Push 전송 ----
async function sendPushNotification(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience);
  const vapidKeyB64 = vapidPublicKey; // URL-safe base64

  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidKeyB64}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'normal',
    },
    body: new TextEncoder().encode(payload),
  });

  return { ok: response.ok || response.status === 201, status: response.status };
}

// ---- 메인 핸들러 ----
Deno.serve(async (req) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // 수동 호출 시 페이로드 커스텀 가능
  let customPayload: { title?: string; body?: string; url?: string } | null = null;
  if (req.method === 'POST') {
    try {
      customPayload = await req.json();
    } catch {
      // 빈 바디 무시
    }
  }

  // 오늘 수집된 도구 수 확인
  const today = new Date().toISOString().split('T')[0];
  const { count: todayCount } = await supabase
    .from('ai_tools')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const toolCount = todayCount || 0;

  if (toolCount === 0 && !customPayload) {
    return new Response(
      JSON.stringify({ sent: 0, reason: '오늘 수집된 도구가 없습니다' }),
      { headers: corsHeaders }
    );
  }

  // 푸시 페이로드 생성
  const payload = JSON.stringify({
    title: customPayload?.title || '⚡ AI Tools Daily',
    body: customPayload?.body || `오늘의 새로운 AI 툴 ${toolCount}개가 도착했습니다!`,
    url: customPayload?.url || '/',
  });

  // 활성 구독 조회
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true);

  if (subError || !subscriptions || subscriptions.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, reason: '활성 구독자가 없습니다' }),
      { headers: corsHeaders }
    );
  }

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  // 동시에 최대 10개씩 배치 전송
  const BATCH_SIZE = 10;
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );

        if (result.ok) {
          sent++;
        } else if (result.status === 404 || result.status === 410) {
          // 구독 만료/삭제됨
          expiredIds.push(sub.id);
          failed++;
        } else {
          failed++;
        }
      })
    );
  }

  // 만료된 구독 비활성화
  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expiredIds);
  }

  // 발송 로그 기록
  await supabase.from('agent_runs').insert({
    source: 'send-push',
    status: 'completed',
    tools_found: sent,
    tools_saved: 0,
    details: { sent, failed, expired: expiredIds.length, total: subscriptions.length },
  });

  return new Response(
    JSON.stringify({
      sent,
      failed,
      expired: expiredIds.length,
      total: subscriptions.length,
    }),
    { headers: corsHeaders }
  );
});
