#!/usr/bin/env node
/**
 * 生理期历史数据一次性写入（没有界面，没有接口）。
 *
 *   npm install ali-oss
 *   node scripts/cycle-history.js --file history.txt --dry-run
 *   node scripts/cycle-history.js --file history.txt --write
 *
 * 输入是一段文字，每行一期，只要有开始日即可：
 *   2026-11-06
 *   2026-10-08 – 2026-10-12
 *   10.8 / 10月8日 / 10/8 / 20260512 也认；没有年份时按「最近一次」推断。
 *
 * 解析在本地完成，结果先和现有文档合并、按开始日去重，再整份写一个文档：
 *   <root>/cycle/periods.json
 * 预测用 js/cycle.js 现算一次写进去 —— 这是唯一的重算点，和浏览器端一致。
 *
 * 安全：默认 --dry-run。只有 --write 才写。写前把原文档备份到 --backup 目录。
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

/* ---------- args ---------- */

function arg(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    if (at < 0) return fallback;
    const next = process.argv[at + 1];
    return next && !next.startsWith('--') ? next : true;
}

const filePath = arg('file');
const write = process.argv.includes('--write');
const root = arg('root', 'love-journey/db-test');
const backupDir = arg('backup', path.join(require('os').tmpdir(), 'cycle-history-backup'));
const source = arg('source', 'import');

if (!filePath || filePath === true) {
    console.error('用法：node scripts/cycle-history.js --file history.txt [--root love-journey/db] [--write]');
    process.exit(1);
}
if (!String(root).includes('test') && !process.argv.includes('--allow-prod')) {
    console.error(`目标 ${root} 不是测试库。确认要写生产库请加 --allow-prod。`);
    process.exit(1);
}

/* ---------- date parsing (mirrors the deleted js/cycle-import.js) ---------- */

function pad2(n) { return String(n).padStart(2, '0'); }
function dayKey(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }
function addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
}
function diffDays(a, b) {
    const x = new Date(a); x.setHours(0, 0, 0, 0);
    const y = new Date(b); y.setHours(0, 0, 0, 0);
    return Math.round((y - x) / 86400000);
}

function dayFromParts(year, month, day) {
    const y = Number(year), m = Number(month), d = Number(day);
    if (!(y >= 1990 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return '';
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date.getDate() !== d) return '';
    return dayKey(date);
}

/* Accepts 2026-11-06 / 2026/11/6 / 2026.11.6 / 2026年11月6日 / 20261106 / ms epoch. */
function dayFromValue(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'number') {
        if (value > 1e12 && value < 4e12) {
            const date = new Date(value);
            return isNaN(date.getTime()) ? '' : dayKey(date);
        }
        const text = String(value);
        return /^20\d{6}$/.test(text) ? dayFromParts(text.slice(0, 4), text.slice(4, 6), text.slice(6, 8)) : '';
    }
    const text = String(value).trim();
    const compact = text.match(/^(20\d{2})(\d{2})(\d{2})$/);
    if (compact) return dayFromParts(compact[1], compact[2], compact[3]);
    const separated = text.match(/(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/);
    if (separated) return dayFromParts(separated[1], separated[2], separated[3]);
    if (/^\d{13}$/.test(text)) return dayFromValue(Number(text));
    return '';
}

const PREDICT_RE = /predict|forecast|expect|next|预测|预计/i;

/* JSON payloads: prefer start/end pairs, skip prediction-looking keys. */
function pairsFromJson(node, keyHint, out, depth) {
    const bucket = out || [];
    if (!node || (depth || 0) > 12) return bucket;
    if (keyHint && PREDICT_RE.test(keyHint)) return bucket;
    if (Array.isArray(node)) {
        node.forEach(item => pairsFromJson(item, keyHint, bucket, (depth || 0) + 1));
        return bucket;
    }
    if (typeof node !== 'object') return bucket;

    const keys = Object.keys(node);
    let start = '', end = '';
    keys.forEach(key => {
        const value = node[key];
        if (value == null || typeof value === 'object') return;
        const day = dayFromValue(value);
        if (!day) return;
        if (!start && /^(start|begin|first|on|开始|起始|首日)/i.test(key)) start = day;
        else if (!end && /^(end|finish|last|off|结束|末)/i.test(key)) end = day;
        else if (!start) start = day;
        else if (!end) end = day;
    });
    if (start) bucket.push({ start, end: end && end >= start ? end : '' });
    keys.forEach(key => {
        const value = node[key];
        if (value && typeof value === 'object') pairsFromJson(value, key, bucket, (depth || 0) + 1);
    });
    return bucket;
}

/* Plain text: full dates, then year-less ones anchored to "most recent past". */
function pairsFromText(text) {
    const source = String(text == null ? '' : text);
    const spots = [];
    let match;

    const isoRe = /(20\d{2})\s*(?:[-/.]|年)\s*(\d{1,2})\s*(?:[-/.]|月)\s*(\d{1,2})\s*日?(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?/g;
    while ((match = isoRe.exec(source))) {
        const key = dayFromParts(match[1], match[2], match[3]);
        if (key) spots.push({ key, at: match.index, length: match[0].length });
    }
    const compactRe = /(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/g;
    while ((match = compactRe.exec(source))) {
        const key = dayFromParts(match[1], match[2], match[3]);
        if (key) spots.push({ key, at: match.index, length: match[0].length });
    }
    const epochRe = /(?<!\d)(1[6-9]\d{11})(?!\d)/g;
    while ((match = epochRe.exec(source))) {
        const key = dayFromValue(Number(match[1]));
        if (key) spots.push({ key, at: match.index, length: match[0].length });
    }
    const shortRe = /(?<![\d.])(\d{1,2})\s*(?:月\s*(\d{1,2})\s*[日号]?|[-/.](\d{1,2}))(?!\d)/g;
    while ((match = shortRe.exec(source))) {
        const before = source.slice(Math.max(0, match.index - 5), match.index);
        if (/\d{4}\s*[-/.月]\s*$/.test(before)) continue;
        spots.push({ key: '', month: Number(match[1]), day: Number(match[2] || match[3]),
            at: match.index, length: match[0].length, short: true });
    }

    spots.sort((a, b) => a.at - b.at || b.length - a.length);
    const unique = [];
    spots.forEach(spot => {
        if (!unique.find(item => Math.abs(item.at - spot.at) < 3)) unique.push(spot);
    });

    const now = new Date();
    const futureLimit = dayKey(addDays(now, 30));
    unique.forEach(spot => {
        if (!spot.short) return;
        const thisYear = dayFromParts(now.getFullYear(), spot.month, spot.day);
        spot.key = thisYear && thisYear <= futureLimit
            ? thisYear
            : dayFromParts(now.getFullYear() - 1, spot.month, spot.day);
    });

    const pairs = [];
    let cursor = 0;
    while (cursor < unique.length) {
        const first = unique[cursor];
        const second = unique[cursor + 1];
        if (second) {
            const between = source.slice(first.at + first.length, second.at);
            if (/^\s*(?:[-–—~～]|至|到|to)\s*$/i.test(between) && second.key >= first.key) {
                pairs.push({ start: first.key, end: second.key });
                cursor += 2;
                continue;
            }
        }
        pairs.push({ start: first.key, end: '' });
        cursor += 1;
    }
    return pairs;
}

function mergeRuns(pairs) {
    pairs.sort((a, b) => a.start.localeCompare(b.start));
    const entries = [];
    let current = null;
    pairs.forEach(pair => {
        const start = pair.start;
        const end = pair.end && pair.end >= start ? pair.end : '';
        if (current && diffDays(current.end, start) <= 1) {
            if (end && end > current.end) current.end = end;
            else if (!end && start > current.end) current.end = start;
            return;
        }
        if (current) entries.push(current);
        current = { start, end: end || start };
    });
    if (current) entries.push(current);
    return entries.map(run => ({ start: run.start, end: run.end === run.start ? '' : run.end }));
}

function parseHistory(text) {
    const trimmed = String(text || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const pairs = pairsFromJson(JSON.parse(trimmed));
            if (pairs.length) return { entries: mergeRuns(pairs), shape: 'json' };
        } catch (error) { /* fall through to text */ }
    }
    const pairs = pairsFromText(trimmed);
    if (!pairs.length) return null;
    return { entries: mergeRuns(pairs), shape: 'text' };
}

/* ---------- storage ---------- */

function decryptConfig(encrypted) {
    const obfuscated = Buffer.from(encrypted, 'base64').toString('latin1');
    let reversed = '';
    for (let i = 0; i < obfuscated.length; i++) reversed += String.fromCharCode(obfuscated.charCodeAt(i) - 3);
    return Buffer.from(reversed.split('').reverse().join(''), 'base64').toString('utf8');
}

function client() {
    const OSS = require('ali-oss');
    const configSource = fs.readFileSync(path.join(ROOT_DIR, 'js', 'oss-config.js'), 'utf8');
    const config = new Function(`${configSource}; return OSS_CONFIG;`)();
    return {
        oss: new OSS({
            region: process.env.OSS_REGION || config.region,
            bucket: process.env.OSS_BUCKET || config.bucket,
            accessKeyId: process.env.OSS_ACCESS_KEY_ID || decryptConfig(config.ak),
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || decryptConfig(config.sk)
        }),
        config
    };
}

function cycleMath() {
    const source = fs.readFileSync(path.join(ROOT_DIR, 'js', 'cycle.js'), 'utf8');
    const sandbox = {};
    new Function('exports', `${source}\n;exports.normalize = cycleNormalizePeriods; exports.predict = cyclePredict; exports.today = cycleDayKey;`)(sandbox);
    return sandbox;
}

(async () => {
    const text = fs.readFileSync(filePath, 'utf8');
    const parsed = parseHistory(text);
    if (!parsed) {
        console.error('没找到能用的日期。输入至少要有开始日，例如 2026-11-06。');
        process.exit(1);
    }

    const math = cycleMath();
    const now = new Date();
    const stamp = `${dayKey(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const { oss, config } = client();
    const periodsKey = `${root}/cycle/periods.json`;
    const settingsKey = `${root}/cycle/settings.json`;

    let existing = { version: 1, updatedAt: '', items: [], prediction: null };
    try {
        const got = await oss.get(periodsKey);
        existing = JSON.parse(got.content.toString());
    } catch (error) {
        if (error.code !== 'NoSuchKey' && error.status !== 404) throw error;
        console.log(`（${periodsKey} 不存在，将新建）`);
    }

    let settings = {};
    try {
        const got = await oss.get(settingsKey);
        settings = JSON.parse(got.content.toString());
    } catch (error) { /* absent is fine */ }

    const existingStarts = new Set((existing.items || []).map(item => item.start));
    const incoming = parsed.entries.filter(entry => !existingStarts.has(entry.start));
    const skipped = parsed.entries.length - incoming.length;

    const items = math.normalize([
        ...(existing.items || []),
        ...incoming.map(entry => ({
            id: `pd_${entry.start.replace(/-/g, '')}`,
            start: entry.start,
            end: entry.end || '',
            source,
            uncertain: false,
            createdAt: stamp,
            updatedAt: stamp
        }))
    ]);

    const prediction = math.predict(items, settings, math.today(now));
    prediction.dataVersion = stamp;
    const doc = { version: 1, updatedAt: stamp, items, prediction };

    console.log(`\n目标：${periodsKey}`);
    console.log(`解析：${parsed.shape === 'json' ? 'JSON 配对' : '文本日期'}，共 ${parsed.entries.length} 期`);
    console.log(`新增：${incoming.length} 期${skipped ? `（跳过已存在的 ${skipped} 期）` : ''}`);
    console.log(`合并后：${items.length} 期，${items[0] ? items[0].start : '-'} → ${items[items.length - 1] ? items[items.length - 1].start : '-'}`);
    console.log(`预测：${prediction.status === 'ok'
        ? `${prediction.range[0]} – ${prediction.range[1]}（中心 ${prediction.center}，${prediction.confidence}，回测 ${prediction.backtest.hit}/${prediction.backtest.total}）`
        : `${prediction.status} / ${prediction.reason}`}`);

    if (!incoming.length) {
        console.log('\n没有新数据，不写。');
        return;
    }
    if (!write) {
        console.log('\n[dry-run] 未写入。加 --write 才会写。');
        return;
    }

    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `periods-${stamp.replace(/[: ]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(existing, null, 2));
    console.log(`\n已备份原文档 → ${backupFile}`);

    await oss.put(periodsKey, Buffer.from(JSON.stringify(doc, null, 2)), {
        headers: { 'Content-Type': 'application/json' }
    });
    const back = JSON.parse((await oss.get(periodsKey)).content.toString());
    console.log(`✅ 已写入。回读：${back.items.length} 期，updatedAt ${back.updatedAt}`);
    void config;
})().catch(error => {
    console.error('写入失败：', error.message);
    process.exit(1);
});
