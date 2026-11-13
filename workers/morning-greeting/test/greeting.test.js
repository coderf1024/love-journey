// Node's built-in runner only. All network/storage are in-memory mocks; no real pushes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
import worker from '../src/index.js';

const env = { OSS_REGION: 'oss-cn-beijing', OSS_BUCKET: 'example', DB_ROOT: 'love-journey/db', OSS_ACCESS_KEY_ID: 'test-id', OSS_ACCESS_KEY_SECRET: 'test-secret' };
const time = Date.parse('2026-11-12T00:14:00Z');
const space = () => ({ avatar: 'https://example.com/avatar.jpg', settings: {
    bark: { enabled: true, userKey: 'user-test', adminKey: 'admin-test' },
    links: { user: 'https://example.com/', admin: 'https://example.com/admin.html' },
    morningGreeting: { enabled: true, recipients: ['user', 'admin'], alertOnFail: true, homeReminder: true }
} });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
function harness(options = {}) {
    const config = options.space || space();
    const calls = { pushes: [], writes: [], quotes: 0, reads: 0 };
    let record = options.record || null;
    const fetch = async (url, init = {}) => {
        const u = new URL(url);
        if (u.hostname === 'api.open-meteo.com') return options.weatherFail ? json({}, 503) : json({ daily: { weather_code: [45], temperature_2m_min: [1.5], temperature_2m_max: [11.3] } });
        if (u.hostname === 'api.shadiao.pro') { calls.quotes++; return json({ data: { text: options.longQuote ? '很'.repeat(21) : '今天也喜欢你' } }); }
        if (u.pathname === '/push') {
            const payload = JSON.parse(init.body); calls.pushes.push(payload);
            return json({ code: payload.device_key === options.failKey ? 400 : 200 });
        }
        if (u.pathname.endsWith('/space.json')) { if (options.configFail) return json({}, 503); return json(config); }
        if (u.pathname.endsWith('/story.json')) return json({ startDate: '2020-12-20' });
        if (u.pathname.includes('/greeting/')) {
            if (init.method === 'PUT') {
                calls.writes.push({ url: String(url), headers: init.headers, record: JSON.parse(init.body) });
                if (options.writeFail) return json({}, 403);
                record = JSON.parse(init.body); return json({});
            }
            calls.reads++;
            if (options.readFail) return json({}, 503);
            return record ? json(record) : json({}, 404);
        }
        throw new Error(`Unexpected request: ${u.hostname}${u.pathname}`);
    };
    return { config, calls, fetch, get record() { return record; } };
}
async function run(options = {}, secrets = env) {
    const h = harness(options); const old = globalThis.fetch; globalThis.fetch = h.fetch;
    try { await worker.scheduled({ scheduledTime: time }, secrets); } catch (error) { h.error = error; }
    finally { globalThis.fetch = old; }
    return h;
}
const normalPushes = h => h.calls.pushes.filter(p => p.title.startsWith('宝宝早呀，在一起的第 '));
const alerts = h => h.calls.pushes.filter(p => p.title === '早安发送失败');
const partial = { status: 'partial', recipients: [{ audience: 'user', ok: true }, { audience: 'admin', ok: false, error: 'failed' }] };

test('scheduled sends identical content and signs only status metadata', async () => {
    const h = await run(); assert.equal(h.error, undefined); assert.equal(normalPushes(h).length, 2);
    assert.equal(h.record.status, 'sent'); assert.equal(h.record.sentAt, '2026-11-12T08:14:00+08:00');
    assert.equal(h.calls.pushes[0].title, '宝宝早呀，在一起的第 2153 天！');
    assert.ok(normalPushes(h).every(p => !Object.hasOwn(p, 'url')));
    assert.ok(normalPushes(h).every(p => p.icon === h.config.avatar));
    assert.equal(h.calls.pushes[0].subtitle, '2026年11月12日 周四 · 雾 2℃-11℃');
    assert.equal(h.calls.pushes[0].body, h.calls.pushes[1].body);
    assert.deepEqual(Object.keys(h.record).sort(), ['date', 'kind', 'recipients', 'sentAt', 'status']);
    const w = h.calls.writes[0];
    const signature = createHmac('sha1', env.OSS_ACCESS_KEY_SECRET).update(`PUT\n\napplication/json\n${w.headers.Date}\n/example/love-journey/db/greeting/2026-11-12.json`).digest('base64');
    assert.equal(w.headers.Authorization, `OSS test-id:${signature}`);
});
for (const status of ['sent', 'resent']) test(`scheduled skips ${status}`, async () => {
    const h = await run({ record: { status } }); assert.equal(h.calls.pushes.length, 0); assert.equal(h.calls.writes.length, 0);
});
test('scheduled retry sends only failed recipient and preserves success', async () => {
    const h = await run({ record: partial }); assert.deepEqual(normalPushes(h).map(p => p.device_key), ['admin-test']);
    assert.equal(h.record.status, 'sent'); assert.equal(h.record.recipients.length, 2);
});
test('Bark application error becomes partial and alerts', async () => {
    const h = await run({ failKey: 'user-test' }); assert.equal(h.record.status, 'partial'); assert.equal(alerts(h).length, 1);
    assert.equal(alerts(h)[0].url, h.config.settings.links.admin);
});
test('quote exhaustion caps retries and alerts without sending greeting', async () => {
    const h = await run({ longQuote: true }); assert.equal(h.calls.quotes, 10); assert.equal(h.record.status, 'failed');
    assert.equal(normalPushes(h).length, 0); assert.equal(alerts(h).length, 1);
});
test('weather failure degrades to date only', async () => {
    const h = await run({ weatherFail: true }); assert.equal(h.record.status, 'sent'); assert.equal(alerts(h).length, 0);
    assert.equal(normalPushes(h)[0].subtitle, '2026年11月12日 周四');
});
for (const field of ['morningGreeting', 'bark']) test(`${field} disabled skips all sends and writes`, async () => {
    const s = space(); s.settings[field].enabled = false;
    const h = await run({ space: s }); assert.equal(h.calls.pushes.length, 0); assert.equal(h.calls.writes.length, 0);
});
test('alert switch suppresses alert', async () => {
    const s = space(); s.settings.morningGreeting.alertOnFail = false;
    const h = await run({ space: s, longQuote: true }); assert.equal(alerts(h).length, 0); assert.equal(h.record.status, 'failed');
});
test('record read failure stops sends, alerts and never overwrites unknown state', async () => {
    const h = await run({ readFail: true }); assert.ok(h.error); assert.equal(normalPushes(h).length, 0);
    assert.equal(alerts(h).length, 1); assert.equal(h.calls.writes.length, 0);
});
test('record write failure alerts even after delivery and fails invocation', async () => {
    const h = await run({ writeFail: true }); assert.ok(h.error); assert.equal(normalPushes(h).length, 2); assert.equal(alerts(h).length, 1);
    assert.match(alerts(h)[0].body, /可能已收到/);
});
test('missing secret stops sends with alert when config is accessible', async () => {
    const h = await run({}, { ...env, OSS_ACCESS_KEY_SECRET: '' }); assert.ok(h.error); assert.equal(normalPushes(h).length, 0); assert.equal(alerts(h).length, 1);
});
test('unavailable config fails invocation; no invented alert recipient', async () => {
    const h = await run({ configFail: true }); assert.ok(h.error); assert.equal(h.calls.pushes.length, 0);
});
test('no public sending endpoint', async () => { assert.equal((await worker.fetch()).status, 404); });

const storeSource = readFileSync(new URL('../../../js/store.js', import.meta.url), 'utf8');
function domain(options = {}) {
    const h = harness(options); let record = options.record || null; const writes = [];
    const context = vm.createContext({ console, fetch: h.fetch, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
        isTestEnv: () => options.testEnv || false, window: { location: { search: '' } },
        dbGetOrNull: async () => record,
        dbPut: async (path, value) => { if (options.writeFail) throw new Error('write failed'); writes.push({ path, value }); record = value; }
    });
    vm.runInContext(storeSource, context);
    return { h, context, writes, get record() { return record; } };
}
const args = (d, recipients = ['user', 'admin']) => ({ space: d.h.config, story: { startDate: '2020-12-20' }, recipients });
test('manual resend only retries failed person and records no message snapshot', async () => {
    const d = domain({ record: partial }); const r = await d.context.resendMorningGreeting(args(d));
    assert.equal(r.status, 'resent'); assert.deepEqual(normalPushes(d.h).map(p => p.device_key), ['admin-test']);
    assert.equal(d.record.recipients.length, 2); assert.equal(d.record.body, undefined);
    assert.ok(normalPushes(d.h).every(p => !Object.hasOwn(p, 'url')));
});
test('manual completed record prevents duplicate delivery', async () => {
    const d = domain({ record: { status: 'sent' } }); await assert.rejects(d.context.resendMorningGreeting(args(d)), /已经发出/);
    assert.equal(d.h.calls.pushes.length, 0); assert.equal(d.writes.length, 0);
});
test('manual quote failure writes failed outcome and preserves prior successes', async () => {
    const d = domain({ record: partial, longQuote: true }); const r = await d.context.resendMorningGreeting(args(d));
    assert.equal(r.status, 'partial'); assert.equal(d.record.recipients.find(r => r.audience === 'user').ok, true);
    assert.equal(normalPushes(d.h).length, 0);
});
test('manual record write failure explains ambiguous delivery', async () => {
    const d = domain({ writeFail: true }); await assert.rejects(d.context.resendMorningGreeting(args(d)), /可能已收到/);
});
test('test recipients independent and test never changes daily status', async () => {
    const d = domain(); await d.context.sendGreetingTest(args(d, ['admin']));
    assert.deepEqual(normalPushes(d.h).map(p => p.device_key), ['admin-test']); assert.equal(d.writes.length, 0);
    assert.ok(normalPushes(d.h).every(p => !Object.hasOwn(p, 'url')));
});
test('other Bark notifications retain their click destinations', async () => {
    const d = domain();
    for (const audience of ['user', 'admin']) {
        assert.equal(await d.context.sendBark(d.h.config, { audience, title: 'Other notification', body: 'Test' }), true);
        assert.equal(d.h.calls.pushes.at(-1).url, d.h.config.settings.links[audience]);
    }
});
for (const mode of ['testEnv', 'disabled']) test(`${mode} fails before requests or status writes`, async () => {
    const s = space(); if (mode === 'disabled') s.settings.bark.enabled = false;
    const d = domain({ space: s, testEnv: mode === 'testEnv' });
    await assert.rejects(d.context.resendMorningGreeting(args(d)));
    await assert.rejects(d.context.sendGreetingTest(args(d)));
    assert.equal(d.h.calls.pushes.length, 0); assert.equal(d.h.calls.quotes, 0); assert.equal(d.writes.length, 0);
});
test('empty recipient selection cannot send', async () => {
    const d = domain(); await assert.rejects(d.context.resendMorningGreeting(args(d, [])), /请选择/);
    assert.equal(d.h.calls.pushes.length, 0); assert.equal(d.writes.length, 0);
});
test('browser and Worker generate same message for fixed Beijing day', async () => {
    const d = domain(); const m = await d.context.buildGreetingMessage({ startDate: '2020-12-20' }, new Date(time));
    const h = await run(); const p = normalPushes(h)[0];
    for (const key of ['title', 'subtitle', 'body']) assert.equal(m[key], p[key]);
    const day = d.context.beijingDay(new Date('2026-11-12T16:00:00Z')); assert.equal(day.date, '2026-11-13'); assert.equal(day.minutes, 0);
});
test('browser weather timeout cannot hold up an otherwise valid greeting', async () => {
    const d = domain();
    d.context.setTimeout = (fn, ms) => setTimeout(fn, Math.min(ms, 10));
    d.context.fetch = (url, options) => String(url).includes('open-meteo')
        ? new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout'))))
        : d.h.fetch(url, options);
    const message = await d.context.buildGreetingMessage({ startDate: '2020-12-20' }, new Date(time));
    assert.equal(message.subtitle, '2026年11月12日 周四'); assert.equal(message.body, '今天也喜欢你');
});
test('browser quote timeout terminates, persists failure, and sends no greeting', async () => {
    const d = domain();
    d.context.setTimeout = (fn, ms) => setTimeout(fn, Math.min(ms, 10));
    let attempts = 0;
    d.context.fetch = (url, options) => {
        if (!String(url).includes('shadiao')) return d.h.fetch(url, options);
        attempts++;
        return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout'))));
    };
    const r = await d.context.resendMorningGreeting(args(d));
    assert.equal(attempts, 10); assert.equal(r.status, 'failed'); assert.equal(d.h.calls.pushes.length, 0);
});
test('manual resend completes before a delayed job: job sends nothing', async () => {
    const d = domain();
    const result = await d.context.resendMorningGreeting(args(d));
    assert.equal(result.status, 'resent');
    assert.equal(normalPushes(d.h).length, 2);
    // Feed the actual browser-produced record to the resumed scheduled handler.
    const h = harness({ record: d.record });
    const old = globalThis.fetch;
    globalThis.fetch = h.fetch;
    try {
        await worker.scheduled({ scheduledTime: Date.parse(`${d.record.date}T00:14:00Z`) }, env);
    } finally {
        globalThis.fetch = old;
    }
    assert.equal(h.calls.reads, 1);
    assert.equal(h.calls.pushes.length, 0);
    assert.equal(h.calls.writes.length, 0);
    assert.equal(h.calls.quotes, 0);
});
