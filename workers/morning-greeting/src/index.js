const REQUEST_TIMEOUT_MS = 8000;
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=1';
const QUOTE_URL = 'https://api.shadiao.pro/chp';
const QUOTE_MAX_CHARS = 20;
const QUOTE_MAX_ATTEMPTS = 10;
const DEFAULT_START_DATE = '2020-12-20';
const DONE_STATUSES = ['sent', 'resent'];
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WMO_WEATHER = {
    0: '晴', 1: '大部晴', 2: '多云', 3: '阴',
    45: '雾', 48: '雾',
    51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨', 56: '冻毛毛雨', 57: '冻毛毛雨',
    61: '雨', 63: '雨', 65: '雨', 66: '冻雨', 67: '冻雨',
    71: '雪', 73: '雪', 75: '雪', 77: '雪粒',
    80: '阵雨', 81: '阵雨', 82: '阵雨', 85: '阵雪', 86: '阵雪',
    95: '雷暴', 96: '雷暴伴冰雹', 99: '雷暴伴冰雹'
};

export default {
    async fetch() {
        return new Response('Not Found', { status: 404 });
    },

    async scheduled(event, env) {
        await runMorningGreeting(env, new Date(event.scheduledTime || Date.now()));
    }
};

async function runMorningGreeting(env, now) {
    const today = beijingNow(now);
    // Load config first so later failures can use the configured alert recipient.
    // If OSS itself is unreachable no recipient is available; surface a failed run.
    const space = await readPublicJson(env, `${env.DB_ROOT}/space.json`);
    if (!space) throw new Error('空间配置不存在，无法发送早安或确定告警收件人');
    const greeting = space && space.settings && space.settings.morningGreeting;
    const bark = (space && space.settings && space.settings.bark) || {};
    if (!greeting || greeting.enabled !== true) {
        console.log('[morning-greeting] 早安未开启，跳过');
        return;
    }
    if (bark.enabled === false) {
        console.log('[morning-greeting] Bark 总开关关闭，跳过');
        return;
    }
    const audiences = [...new Set(Array.isArray(greeting.recipients) ? greeting.recipients : [])].filter(a => a === 'user' || a === 'admin');
    if (audiences.length === 0) {
        console.log('[morning-greeting] 未选择收件人，跳过');
        return;
    }

    const links = (space.settings && space.settings.links) || {};
    const avatar = space.avatar || '';
    const context = { bark, links, avatar, audiences, alertOnFail: greeting.alertOnFail !== false };

    let existing;
    try {
        if (!env.OSS_ACCESS_KEY_ID || !env.OSS_ACCESS_KEY_SECRET) {
            throw new Error('缺少 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET，请用 wrangler secret put 注入');
        }
        existing = await readPublicJson(env, `${env.DB_ROOT}/greeting/${today.date}.json`);
    } catch (error) {
        await alertFailure(today, context, `无法确认发送记录，已停止发送：${error.message}`);
        throw error;
    }
    if (existing && DONE_STATUSES.includes(existing.status)) {
        console.log(`[morning-greeting] ${today.date} 已发送（${existing.status}），跳过`);
        return;
    }
    const previous = existing && Array.isArray(existing.recipients) ? existing.recipients : [];
    const successful = previous.filter(item => item.ok);
    const pending = audiences.filter(audience => !successful.some(item => item.audience === audience));
    const startDate = await readStartDate(env);
    const days = dayDiff(today.date, startDate);
    const weather = await fetchWeather();
    const subtitle = `${today.label} ${today.weekday}${weather ? ` · ${weather}` : ''}`;
    const title = `宝宝早安 · 今天是我们在一起的第 ${days} 天`;

    let body;
    try {
        if (pending.length) body = await fetchQuote();
    } catch (error) {
        return finishRun(env, today, {
            ...context,
            status: successful.length ? 'partial' : 'failed',
            recipients: [...successful, ...pending.map(audience => ({ audience, ok: false, error: '一句话未取到' }))],
            error: error.message
        });
    }

    const results = successful.slice();
    for (const audience of pending) {
        const key = String(audience === 'user' ? (bark.userKey || '') : (bark.adminKey || '')).trim();
        if (!key) {
            results.push({ audience, ok: false, error: '缺少密钥' });
            continue;
        }
        const url = audience === 'user' ? links.user : links.admin;
        try {
            await pushBark(bark, key, buildPayload({ title, subtitle, body, url, avatar, links }));
            results.push({ audience, ok: true });
        } catch (error) {
            results.push({ audience, ok: false, error: error.message });
        }
    }

    const complete = audiences.every(audience => results.some(r => r.audience === audience && r.ok));
    const status = complete ? 'sent' : (results.some(r => r.ok) ? 'partial' : 'failed');
    const error = status === 'sent'
        ? undefined
        : results.filter(r => !r.ok).map(r => `${audienceLabel(r.audience)}：${r.error}`).join('；');
    await finishRun(env, today, { ...context, status, recipients: results, error });
}

async function finishRun(env, today, run) {
    const { status, recipients, error } = run;
    const record = {
        date: today.date,
        kind: 'scheduled',
        status,
        sentAt: today.sentAt,
        recipients,
        ...(error ? { error } : {})
    };
    let writeFailure;
    try {
        await putObjectV1(env, `${env.DB_ROOT}/greeting/${today.date}.json`, JSON.stringify(record, null, 2));
    } catch (writeError) {
        writeFailure = writeError;
        console.error(`[morning-greeting] 写入发送记录失败：${writeError.message}`);
    }
    console.log(`[morning-greeting] ${today.date} ${status}${error ? `：${error}` : ''}`);
    if (writeFailure) {
        await alertFailure(today, run, `${error ? `${error}；` : ''}发送记录保存失败，部分或全部收件人可能已收到，请确认后再补发`);
        throw writeFailure;
    }
    if (status !== 'sent') await alertFailure(today, run, error || '未知原因');
}

async function alertFailure(today, run, error) {
    if (run.alertOnFail === false) return;
    const adminKey = run.bark && run.bark.adminKey;
    if (!adminKey) {
        console.error('[morning-greeting] 无管理员密钥，无法发送失败告警');
        return;
    }
    try {
        await pushBark(run.bark, adminKey, {
            title: '早安发送失败',
            subtitle: today.date,
            body: Array.from(error).slice(0, 200).join(''),
            ...(run.links.admin ? { url: run.links.admin } : {}),
            ...(barkIcon(run.avatar, run.links) ? { icon: barkIcon(run.avatar, run.links) } : {})
        });
    } catch (alertError) {
        console.error(`[morning-greeting] 失败告警发送失败：${alertError.message}`);
    }
}

function buildPayload({ title, subtitle, body, url, avatar, links }) {
    const payload = { title, subtitle, body };
    if (url) payload.url = url;
    const icon = barkIcon(avatar, links);
    if (icon) payload.icon = icon;
    return payload;
}

function barkIcon(avatar, links) {
    const value = String(avatar || '').trim();
    if (!value || /\.svg($|[?#])/i.test(value)) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (!links.user) return '';
    try {
        return new URL(value, links.user).href;
    } catch (error) {
        return '';
    }
}

function audienceLabel(audience) {
    return audience === 'user' ? '用户' : '管理员';
}

async function pushBark(bark, deviceKey, payload) {
    const server = String(bark.server || 'https://api.day.app').replace(/\/+$/, '').replace(/\/push$/, '');
    const response = await fetch(`${server}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ device_key: deviceKey, group: '恋爱空间', isArchive: '1', ...payload }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || json.code !== 200) {
        throw new Error(`Bark 返回 ${json && json.code || response.status}${json && json.message ? `：${json.message}` : ''}`);
    }
}

function beijingNow(now) {
    const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth() + 1;
    const d = shifted.getUTCDate();
    const date = `${y}-${pad(m)}-${pad(d)}`;
    const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    return {
        date,
        label: `${y}年${m}月${d}日`,
        weekday: WEEKDAYS[shifted.getUTCDay()],
        sentAt: `${date}T${time}+08:00`
    };
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function dayDiff(dateA, dateB) {
    const toDay = value => {
        const [y, m, d] = value.split('-').map(Number);
        return Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000);
    };
    return Math.round(toDay(dateA) - toDay(dateB));
}

async function readStartDate(env) {
    try {
        const story = await readPublicJson(env, `${env.DB_ROOT}/content/story.json`);
        const value = story && typeof story.startDate === 'string' ? story.startDate.slice(0, 10) : '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    } catch (error) {
        console.error(`[morning-greeting] 读取恋爱开始日期失败，使用默认值：${error.message}`);
    }
    return DEFAULT_START_DATE;
}

async function fetchWeather() {
    try {
        const response = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!response.ok) return null;
        const json = await response.json();
        const daily = json && json.daily;
        const code = daily?.weather_code?.[0];
        const max = daily?.temperature_2m_max?.[0];
        const min = daily?.temperature_2m_min?.[0];
        if (code == null || max == null || min == null) return null;
        return `${WMO_WEATHER[code] || '天气'} ${Math.round(min)}℃-${Math.round(max)}℃`;
    } catch (error) {
        console.error(`[morning-greeting] 天气未取到，副标题省略天气：${error.message}`);
        return null;
    }
}

async function fetchQuote() {
    let lastError = '一句话接口无响应';
    for (let attempt = 1; attempt <= QUOTE_MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(QUOTE_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
            if (!response.ok) {
                lastError = `一句话接口返回 ${response.status}`;
                continue;
            }
            const json = await response.json();
            const text = json && json.data && json.data.text;
            if (typeof text !== 'string' || !text.trim()) {
                lastError = '一句话接口返回格式不对';
                continue;
            }
            if (Array.from(text).length <= QUOTE_MAX_CHARS) return text;
            lastError = `一句话超过 ${QUOTE_MAX_CHARS} 字`;
        } catch (error) {
            lastError = `一句话接口出错：${error.message}`;
        }
    }
    throw new Error(`${lastError}（已重试 ${QUOTE_MAX_ATTEMPTS} 次）`);
}

function ossEndpoint(env) {
    return `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com`;
}

async function readPublicJson(env, key) {
    const response = await fetch(`${ossEndpoint(env)}/${key}?_=${Date.now()}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`读取 ${key} 失败（${response.status}）`);
    return response.json();
}

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
    if (!response.ok) throw new Error(`OSS 写入失败（${response.status}）`);
}

async function hmacSha1Base64(secret, message) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    let binary = '';
    for (const byte of new Uint8Array(signed)) binary += String.fromCharCode(byte);
    return btoa(binary);
}
