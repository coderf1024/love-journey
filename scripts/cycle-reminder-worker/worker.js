/* ============================================================
   生理期每日提醒 · Cloudflare Worker
   ------------------------------------------------------------
   Runs once a day (cron `0 1 * * *` = 09:00 Asia/Shanghai).

   What it does:
     1. reads cycle/periods.json and cycle/settings.json from OSS
        (plain anonymous GET — the bucket is public-read);
     2. decides whether today is a reminder day, using the cached
        prediction. It NEVER recalculates the prediction: this Worker
        cannot tell "the forecast was wrong" from "she did not log it";
     3. pushes one Bark notification;
     4. writes only settings.lastPush back to OSS.

   It never writes cycle/periods.json.

   Deploy: see README.md in this folder. Both the dashboard paste flow
   and `wrangler deploy` are supported by this single file.
   ============================================================ */

const DEFAULT_DB_ROOT = 'love-journey/db';
const DEFAULT_BARK_SERVER = 'https://api.day.app';
const TZ_OFFSET_MINUTES = 8 * 60; // Asia/Shanghai, no DST

/* ---------- date helpers (all dates are "YYYY-MM-DD" strings) ---------- */

function shanghaiToday(now = Date.now()) {
  const shifted = new Date(now + TZ_OFFSET_MINUTES * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumber(key) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

/* days from `a` to `b` (positive when b is later) */
function diffDays(a, b) {
  const x = dayNumber(a);
  const y = dayNumber(b);
  if (x == null || y == null) return null;
  return y - x;
}

function shortDay(key) {
  const m = String(key || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}.${m[2]}` : '';
}

/* ---------- OSS (anonymous read, signed write) ---------- */

function ossBase(env) {
  const region = env.OSS_REGION;
  const bucket = env.OSS_BUCKET;
  if (!region || !bucket) throw new Error('缺少 OSS_REGION / OSS_BUCKET');
  return { bucket, endpoint: `https://${bucket}.${region}.aliyuncs.com` };
}

async function readJson(env, path) {
  const { endpoint } = ossBase(env);
  const root = (env.OSS_DB_ROOT || DEFAULT_DB_ROOT).replace(/\/+$/, '');
  const response = await fetch(`${endpoint}/${root}/${path}`, {
    // OSS sends no Cache-Control; ask for a fresh copy so yesterday's
    // settings never leak into today's decision.
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`读取 ${path} 失败：HTTP ${response.status}`);
  return response.json();
}

async function hmacSha1Base64(secret, text) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
  let binary = '';
  const bytes = new Uint8Array(signature);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* OSS V1 URL signature: the signature goes in the query string with an
   `Expires` stamp instead of an `Authorization` header. Workers forbid
   setting the `Date` header, so the header-based form cannot be used. */
async function writeJson(env, path, data) {
  const { bucket, endpoint } = ossBase(env);
  const root = (env.OSS_DB_ROOT || DEFAULT_DB_ROOT).replace(/\/+$/, '');
  const key = `${root}/${path}`;
  const body = JSON.stringify(data, null, 2);
  const contentType = 'application/json';
  const expires = Math.floor(Date.now() / 1000) + 300;
  const stringToSign = ['PUT', '', contentType, String(expires), `/${bucket}/${key}`].join('\n');
  const signature = await hmacSha1Base64(env.OSS_ACCESS_KEY_SECRET, stringToSign);

  const query = new URLSearchParams({
    OSSAccessKeyId: env.OSS_ACCESS_KEY_ID,
    Expires: String(expires),
    Signature: signature
  });
  const response = await fetch(`${endpoint}/${key}?${query.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`写入 ${path} 失败：HTTP ${response.status} ${text.slice(0, 200)}`);
  }
}

/* ---------- settings normalisation (mirror of the browser defaults) ---------- */

const DEFAULT_TEMPLATES = {
  before: {
    title: '还有 {days} 天',
    subtitle: '生理期',
    body: '预计 {range} 开始。\n记得的话点一下记录。',
    url: '{url}'
  },
  start: {
    title: '预计今天开始',
    subtitle: '生理期',
    body: '预计 {range}。\n如果已经来了，记一下就好。',
    url: '{url}'
  },
  overdue: {
    title: '已经过了 {overdue} 天',
    subtitle: '生理期',
    body: '当时预计 {range}。\n如果来了，记一下为准。',
    url: '{url}'
  }
};

function normalizeSettings(raw) {
  const value = raw || {};
  const templates = {};
  Object.keys(DEFAULT_TEMPLATES).forEach(name => {
    const fallback = DEFAULT_TEMPLATES[name];
    const configured = (value.templates && value.templates[name]) || {};
    templates[name] = {
      title: String(configured.title == null ? fallback.title : configured.title),
      subtitle: String(configured.subtitle == null ? fallback.subtitle : configured.subtitle),
      body: String(configured.body == null ? fallback.body : configured.body),
      url: String(configured.url == null ? fallback.url : configured.url)
    };
  });
  return {
    enabled: value.enabled !== false,
    remindEnabled: value.remindEnabled !== false,
    remindDaysBefore: Array.isArray(value.remindDaysBefore) && value.remindDaysBefore.length
      ? value.remindDaysBefore.map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 14)
      : [1, 0],
    overdueRemindDays: Array.isArray(value.overdueRemindDays) && value.overdueRemindDays.length
      ? value.overdueRemindDays.map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 30)
      : [3, 5, 7, 10],
    templates,
    lastPush: value.lastPush || { date: '', kind: '', ok: null }
  };
}

/* ---------- the decision ---------- */

/* Returns { kind, variables } or null. Pure — no network, easy to test. */
function decide(periodsDoc, settingsRaw, today) {
  const settings = normalizeSettings(settingsRaw);
  if (!settings.enabled || !settings.remindEnabled) return { skip: 'disabled' };

  const prediction = periodsDoc && periodsDoc.prediction;
  if (!prediction || prediction.status !== 'ok' || !Array.isArray(prediction.range)) {
    return { skip: 'no-prediction' };
  }

  const items = Array.isArray(periodsDoc.items) ? periodsDoc.items : [];
  const open = items.find(item => item && item.start && !item.end && diffDays(item.start, today) >= 0 && diffDays(item.start, today) <= 30);
  if (open) return { skip: 'period-running' };

  const lastPush = settings.lastPush || {};
  if (lastPush.date === today && lastPush.ok === true) return { skip: 'already-pushed' };

  const [from, to] = prediction.range;
  const untilStart = diffDays(today, from);
  if (untilStart == null) return { skip: 'bad-range' };

  const range = `${shortDay(from)} – ${shortDay(to)}`;

  if (untilStart >= 0) {
    if (!settings.remindDaysBefore.includes(untilStart)) return { skip: 'not-a-remind-day' };
    if (untilStart === 0) {
      return { kind: 'start', variables: { days: '0', range }, range };
    }
    return { kind: 'before', variables: { days: String(untilStart), range }, range };
  }

  // Window already open and she has not logged it: stay quiet, this is what
  // the overdue reminders are for.
  const overdue = diffDays(to, today);
  if (overdue <= 0) return { skip: 'inside-window' };
  if (!settings.overdueRemindDays.includes(overdue)) return { skip: 'not-an-overdue-day' };
  return { kind: 'overdue', variables: { days: String(overdue), overdue: String(overdue), range }, range };
}

function render(template, variables) {
  return String(template == null ? '' : template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) =>
    variables[key] == null ? '' : String(variables[key])
  );
}

/* ---------- Bark ---------- */

async function sendBark(env, settings, space, kind, variables) {
  const bark = (space && space.settings && space.settings.bark) || {};
  if (bark.enabled === false) return { ok: false, reason: 'bark-disabled' };
  const key = String(bark.userKey || bark.key || env.BARK_USER_KEY || '').trim();
  if (!key) return { ok: false, reason: 'no-key' };

  const template = settings.templates[kind] || DEFAULT_TEMPLATES[kind];
  const pageUrl = env.USER_URL || (bark.links && bark.links.user) || '';
  const vars = { ...variables, url: pageUrl };
  const server = String(bark.server || env.BARK_SERVER || DEFAULT_BARK_SERVER).replace(/\/+$/, '').replace(/\/push$/, '');

  const payload = {
    device_key: key,
    group: '恋爱空间',
    isArchive: '1',
    title: render(template.title, vars),
    subtitle: render(template.subtitle, vars),
    body: render(template.body, vars),
    url: render(template.url, vars)
  };
  if (space && space.avatar && !/\.svg($|[?#])/i.test(space.avatar)) {
    payload.icon = /^https?:\/\//i.test(space.avatar)
      ? space.avatar
      : new URL(space.avatar, pageUrl || 'https://coderf.site/index.html').href;
  }

  const response = await fetch(`${server}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const text = await response.text().catch(() => '');
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (error) {}
  const ok = response.ok && (!parsed || parsed.code === 200);
  return { ok, reason: ok ? 'ok' : `HTTP ${response.status} ${text.slice(0, 120)}` };
}

/* ---------- handler ---------- */

async function run(env, options = {}) {
  const today = options.today || shanghaiToday();
  const dry = !!options.dry;

  const [periodsDoc, settingsRaw, space] = await Promise.all([
    readJson(env, 'cycle/periods.json'),
    readJson(env, 'cycle/settings.json'),
    readJson(env, 'space.json').catch(() => null)
  ]);

  const decision = decide(periodsDoc, settingsRaw, today);
  if (decision.skip) {
    return { today, pushed: false, reason: decision.skip };
  }

  if (dry) {
    return {
      today,
      pushed: false,
      wouldPush: decision.kind,
      variables: decision.variables,
      template: normalizeSettings(settingsRaw).templates[decision.kind]
    };
  }

  const settings = normalizeSettings(settingsRaw);
  const result = await sendBark(env, settings, space, decision.kind, decision.variables);

  // Only settings.json is ever written, and only this one field.
  const nextSettings = {
    ...normalizeSettings(settingsRaw),
    ...(settingsRaw || {}),
    lastPush: { date: today, kind: decision.kind, ok: result.ok }
  };
  try {
    await writeJson(env, 'cycle/settings.json', nextSettings);
  } catch (error) {
    return { today, pushed: result.ok, kind: decision.kind, reason: result.reason, writeError: String(error.message || error) };
  }
  return { today, pushed: result.ok, kind: decision.kind, reason: result.reason };
}

export default {
  async scheduled(controller, env, ctx) {
    const result = await run(env);
    console.log('cycle-reminder', JSON.stringify(result));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/run') {
      const dry = url.searchParams.get('dry') !== '0';
      try {
        const result = await run(env, { dry, today: url.searchParams.get('today') || undefined });
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error.message || error) }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }
    return new Response('cycle-reminder worker', { status: 200 });
  }
};

export { decide, normalizeSettings, shanghaiToday, diffDays, render };
