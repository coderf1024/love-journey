/* ============================================================
   生理期每日提醒（LJ-20261110-001）
   ------------------------------------------------------------
   Cloudflare Cron `0 1 * * *`（UTC）= 北京时间 09:00。

   做三件事：
     1. 匿名读 OSS 的 cycle/periods.json、cycle/settings.json、space.json；
     2. 按**缓存的**预测判断今天该不该推（提前 N 天 / 当天 / 过期第 3·5·7·10 天）；
     3. 推一条 Bark，只把 lastPush 写回 settings.json。

   **绝不重算预测，也绝不写 periods.json。** 预测算错和她没记，从这里分不出来。

   与 morning-greeting 是各自独立的 Worker：时机不同（08:14 / 09:00）、
   依赖不同（天气+一言+告警 / 只读缓存）。不要合并。
   ============================================================ */

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_DB_ROOT = 'love-journey/db';
const DEFAULT_BARK_SERVER = 'https://api.day.app';
const TZ_OFFSET_MINUTES = 8 * 60; // Asia/Shanghai，无夏令时
const DEFAULT_PUSH_GROUP = '恋爱空间';

/* ---------- 日期：全部用 "YYYY-MM-DD" 字符串，避开时区 ---------- */

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

/** 从 a 到 b 相差几天；b 更晚为正。 */
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

/* ---------- OSS ---------- */

function ossEndpoint(env) {
    if (!env.OSS_REGION || !env.OSS_BUCKET) {
        throw new Error('缺少 OSS_REGION / OSS_BUCKET');
    }
    return `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com`;
}

function dbRoot(env) {
    return String(env.DB_ROOT || DEFAULT_DB_ROOT).replace(/\/+$/, '');
}

async function readPublicJson(env, key) {
    // OSS 不返回 Cache-Control；加时间戳避免读到几分钟前的旧文档。
    const response = await fetch(`${ossEndpoint(env)}/${key}?_=${Date.now()}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`读取 ${key} 失败（${response.status}）`);
    return response.json();
}

async function hmacSha1Base64(secret, message) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    let binary = '';
    for (const byte of new Uint8Array(signed)) binary += String.fromCharCode(byte);
    return btoa(binary);
}

/* 与 morning-greeting 同一套 V1 头签名（已在该 Worker 上跑通）。 */
async function putObjectV1(env, key, body) {
    const date = new Date().toUTCString();
    const contentType = 'application/json';
    const canonicalResource = `/${env.OSS_BUCKET}/${key}`;
    const stringToSign = `PUT\n\n${contentType}\n${date}\n${canonicalResource}`;
    const signature = await hmacSha1Base64(env.OSS_ACCESS_KEY_SECRET, stringToSign);
    const response = await fetch(`${ossEndpoint(env)}/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType,
            Date: date,
            Authorization: `OSS ${env.OSS_ACCESS_KEY_ID}:${signature}`
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`OSS 写入 ${key} 失败（${response.status}）`);
}

/* ---------- 设置：与 js/store.js 的默认值保持一致 ---------- */

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
    for (const name of Object.keys(DEFAULT_TEMPLATES)) {
        const fallback = DEFAULT_TEMPLATES[name];
        const configured = (value.templates && value.templates[name]) || {};
        templates[name] = {
            title: String(configured.title == null ? fallback.title : configured.title),
            subtitle: String(configured.subtitle == null ? fallback.subtitle : configured.subtitle),
            body: String(configured.body == null ? fallback.body : configured.body),
            url: String(configured.url == null ? fallback.url : configured.url)
        };
    }
    // 过滤后为空同样回落默认值：一个空的提醒日列表等于永远不推。
    const validLeadDays = Array.isArray(value.remindDaysBefore)
        ? value.remindDaysBefore.map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 14)
        : [];
    const validOverdueDays = Array.isArray(value.overdueRemindDays)
        ? value.overdueRemindDays.map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 30)
        : [];
    const leadDays = validLeadDays.length ? validLeadDays : [1, 0];
    const overdueDays = validOverdueDays.length ? validOverdueDays : [3, 5, 7, 10];
    return {
        enabled: value.enabled !== false,
        remindEnabled: value.remindEnabled !== false,
        remindDaysBefore: leadDays,
        overdueRemindDays: overdueDays,
        templates,
        lastPush: value.lastPush || { date: '', kind: '', ok: null }
    };
}

/* ---------- 判定（纯函数，便于 node:test） ---------- */

/**
 * @returns {{ skip: string } | { kind: 'before'|'start'|'overdue', variables: object }}
 */
function decide(periodsDoc, settingsRaw, today) {
    // 缺设置文档 = 从没配置过 = 不发。
    // 浏览器的 normalizeCycleSettings 缺省是「开」，但那是给已配置的空间用的；
    // Worker 面对的是一个可能根本还没启用的功能，必须 fail closed，
    // 否则部署当天就可能开始推送。
    if (!settingsRaw) return { skip: 'no-settings' };

    const settings = normalizeSettings(settingsRaw);
    if (!settings.enabled) return { skip: 'cycle-disabled' };
    if (!settings.remindEnabled) return { skip: 'reminders-off' };

    const prediction = periodsDoc && periodsDoc.prediction;
    if (!prediction || prediction.status !== 'ok' || !Array.isArray(prediction.range) || prediction.range.length !== 2) {
        return { skip: 'no-prediction' };
    }

    // 有进行中的经期就不打扰：她已经在记了。
    const items = Array.isArray(periodsDoc.items) ? periodsDoc.items : [];
    const running = items.some(item => {
        if (!item || !item.start || item.end) return false;
        const age = diffDays(item.start, today);
        return age != null && age >= 0 && age <= 30;
    });
    if (running) return { skip: 'period-running' };

    // 同一天已经推成功过就不再推。
    const lastPush = settings.lastPush || {};
    if (lastPush.date === today && lastPush.ok === true) return { skip: 'already-pushed' };

    const [from, to] = prediction.range;
    const untilStart = diffDays(today, from);
    if (untilStart == null) return { skip: 'bad-range' };

    const range = `${shortDay(from)} – ${shortDay(to)}`;

    if (untilStart >= 0) {
        if (!settings.remindDaysBefore.includes(untilStart)) return { skip: 'not-a-remind-day' };
        if (untilStart === 0) return { kind: 'start', variables: { days: '0', range } };
        return { kind: 'before', variables: { days: String(untilStart), range } };
    }

    // 已经进入预测区间但还没过期：等她自己记，交给过期提醒。
    const overdue = diffDays(to, today);
    if (overdue <= 0) return { skip: 'inside-window' };
    if (!settings.overdueRemindDays.includes(overdue)) return { skip: 'not-an-overdue-day' };
    return { kind: 'overdue', variables: { days: String(overdue), overdue: String(overdue), range } };
}

function render(template, variables) {
    return String(template == null ? '' : template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) =>
        variables[key] == null ? '' : String(variables[key]));
}

/* ---------- Bark ---------- */

function barkTarget(space, audience = 'user') {
    const settings = (space && space.settings) || {};
    const bark = settings.bark || {};
    if (bark.enabled === false) return null;
    const key = String(audience === 'user'
        ? (bark.userKey || bark.key || '')
        : (bark.adminKey || bark.key || '')).trim();
    if (!key) return null;
    const server = String(bark.server || DEFAULT_BARK_SERVER)
        .replace(/\/+$/, '')
        .replace(/\/push$/, '');
    return { key, server };
}

async function sendBark(env, settings, space, kind, variables) {
    const target = barkTarget(space);
    if (!target) return { ok: false, reason: 'bark-disabled' };

    const template = settings.templates[kind] || DEFAULT_TEMPLATES[kind];
    const links = (space && space.settings && space.settings.links) || {};
    const pageUrl = env.USER_URL || links.user || 'https://coderf.site/index.html';
    const vars = { ...variables, url: pageUrl };

    const payload = {
        device_key: target.key,
        group: DEFAULT_PUSH_GROUP,
        isArchive: '1',
        title: render(template.title, vars),
        subtitle: render(template.subtitle, vars),
        body: render(template.body, vars),
        url: render(template.url, vars)
    };

    const avatar = String((space && space.avatar) || '').trim();
    if (avatar && !/\.svg($|[?#])/i.test(avatar)) {
        try {
            payload.icon = /^https?:\/\//i.test(avatar) ? avatar : new URL(avatar, pageUrl).href;
        } catch (error) {
            // 头像地址不合法就省略，不影响推送。
        }
    }

    const response = await fetch(`${target.server}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const text = await response.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (error) { parsed = null; }
    const ok = response.ok && (!parsed || parsed.code === 200);
    return { ok, reason: ok ? 'ok' : `HTTP ${response.status} ${text.slice(0, 120)}` };
}

/* ---------- 主流程 ---------- */

async function run(env, options = {}) {
    const today = options.today || shanghaiToday();
    const dry = !!options.dry;
    const root = dbRoot(env);

    const [periodsDoc, settingsRaw, space] = await Promise.all([
        readPublicJson(env, `${root}/cycle/periods.json`),
        readPublicJson(env, `${root}/cycle/settings.json`),
        readPublicJson(env, `${root}/space.json`).catch(() => null)
    ]);

    const decision = decide(periodsDoc, settingsRaw, today);
    if (decision.skip) {
        return { today, pushed: false, reason: decision.skip };
    }

    const settings = normalizeSettings(settingsRaw);
    if (dry) {
        return {
            today,
            pushed: false,
            dryRun: true,
            wouldPush: decision.kind,
            variables: decision.variables,
            template: settings.templates[decision.kind]
        };
    }

    const result = await sendBark(env, settings, space, decision.kind, decision.variables);

    // 只写 settings.json，且只改 lastPush 这一个字段。
    const nextSettings = {
        ...normalizeSettings(settingsRaw),
        ...(settingsRaw || {}),
        lastPush: { date: today, kind: decision.kind, ok: result.ok }
    };
    try {
        await putObjectV1(env, `${root}/cycle/settings.json`, JSON.stringify(nextSettings, null, 2));
    } catch (error) {
        return {
            today,
            pushed: result.ok,
            kind: decision.kind,
            reason: result.reason,
            writeError: String(error.message || error)
        };
    }
    return { today, pushed: result.ok, kind: decision.kind, reason: result.reason };
}

export default {
    async scheduled(event, env) {
        const result = await run(env);
        console.log('[cycle-reminder]', JSON.stringify(result));
    },

    /**
     * 人工验证入口，只在 workers_dev 域上可达：
     *   GET /run?token=...             dry run，只看判断结果，不发通知、不写 OSS
     *   GET /run?token=...&dry=0       真的推一次并写 lastPush
     *   GET /run?token=...&today=YYYY-MM-DD  指定某天，便于验证各分支
     *
     * 安全默认：**没有配置 RUN_TOKEN 时只允许 dry run**，`dry=0` 一律拒绝。
     * 不能把「记得设 token」当成防线——忘了设就等于把真推送暴露在公网。
     */
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname !== '/' && url.pathname !== '/run') {
            return new Response('cycle-reminder', { status: 200 });
        }

        const expectsToken = Boolean(env.RUN_TOKEN);
        const tokenOk = !expectsToken || url.searchParams.get('token') === env.RUN_TOKEN;
        const wantsRealPush = url.searchParams.get('dry') === '0';

        // 无 token：只允许 dry run。带 token 且校验通过才允许真推。
        const dry = !wantsRealPush || !tokenOk;
        if (!dry && !expectsToken) {
            return jsonResponse({
                error: 'RUN_TOKEN 未配置，只允许 dry run',
                hint: 'wrangler secret put RUN_TOKEN 之后再传 dry=0'
            }, 403);
        }

        try {
            const result = await run(env, {
                dry,
                today: url.searchParams.get('today') || undefined
            });
            return jsonResponse(expectsToken && !tokenOk ? { ...result, warning: 'token 不匹配，已降级为 dry run' } : result);
        } catch (error) {
            return jsonResponse({ error: String(error.message || error) }, 500);
        }
    }
};

function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

export { decide, normalizeSettings, shanghaiToday, diffDays, render };
