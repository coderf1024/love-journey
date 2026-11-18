import test from 'node:test';
import assert from 'node:assert/strict';

import {
    decide,
    normalizeSettings,
    shanghaiToday,
    diffDays,
    render
} from '../src/index.js';

const RANGE = ['2026-12-09', '2026-12-11'];

function periods(range = RANGE, items = []) {
    return { items, prediction: { status: 'ok', range } };
}

function settings(extra = {}) {
    return {
        remindDaysBefore: [1, 0],
        overdueRemindDays: [3, 5, 7, 10],
        ...extra
    };
}

test('提前一天提醒', () => {
    const result = decide(periods(), settings(), '2026-12-08');
    assert.equal(result.kind, 'before');
    assert.equal(result.variables.days, '1');
    assert.equal(result.variables.range, '12.09 – 12.11');
});

test('当天提醒', () => {
    const result = decide(periods(), settings(), '2026-12-09');
    assert.equal(result.kind, 'start');
});

test('区间内静默，不等同于过期', () => {
    assert.equal(decide(periods(), settings(), '2026-12-10').skip, 'inside-window');
});

test('过期第 3 天提醒', () => {
    const result = decide(periods(), settings(), '2026-12-14');
    assert.equal(result.kind, 'overdue');
    assert.equal(result.variables.overdue, '3');
});

test('过期但不在提醒日就不推', () => {
    assert.equal(decide(periods(), settings(), '2026-12-15').skip, 'not-an-overdue-day');
});

test('过期第 5 / 7 / 10 天各推一次', () => {
    assert.equal(decide(periods(), settings(), '2026-12-16').kind, 'overdue');
    assert.equal(decide(periods(), settings(), '2026-12-18').kind, 'overdue');
    assert.equal(decide(periods(), settings(), '2026-12-21').kind, 'overdue');
    // 第 11 天起永远静默
    assert.equal(decide(periods(), settings(), '2026-12-22').skip, 'not-an-overdue-day');
});

test('不是提醒日', () => {
    assert.equal(decide(periods(), settings(), '2026-12-07').skip, 'not-a-remind-day');
});

test('当天已推过就不再推', () => {
    const result = decide(periods(), settings({ lastPush: { date: '2026-12-08', kind: 'before', ok: true } }), '2026-12-08');
    assert.equal(result.skip, 'already-pushed');
});

test('上次推送失败不会挡住今天', () => {
    const result = decide(periods(), settings({ lastPush: { date: '2026-12-08', kind: 'before', ok: false } }), '2026-12-08');
    assert.equal(result.kind, 'before');
});

test('经期进行中不打扰', () => {
    const items = [{ start: '2026-12-07', end: '' }];
    assert.equal(decide(periods(RANGE, items), settings(), '2026-12-08').skip, 'period-running');
});

test('已结束的经期不影响判断', () => {
    const items = [{ start: '2026-12-01', end: '2026-12-05' }];
    assert.equal(decide(periods(RANGE, items), settings(), '2026-12-08').kind, 'before');
});

test('提醒开关关闭', () => {
    assert.equal(decide(periods(), settings({ remindEnabled: false }), '2026-12-08').skip, 'reminders-off');
    assert.equal(decide(periods(), settings({ enabled: false }), '2026-12-08').skip, 'cycle-disabled');
});

test('没有可用预测', () => {
    assert.equal(decide({ items: [], prediction: { status: 'none' } }, settings(), '2026-12-08').skip, 'no-prediction');
    assert.equal(decide(null, settings(), '2026-12-08').skip, 'no-prediction');
    assert.equal(decide({ prediction: { status: 'ok', range: ['2026-12-09'] } }, settings(), '2026-12-08').skip, 'no-prediction');
});

test('自定义提前天数', () => {
    const custom = settings({ remindDaysBefore: [3, 1, 0] });
    assert.equal(decide(periods(), custom, '2026-12-06').kind, 'before');
    assert.equal(decide(periods(), custom, '2026-12-07').skip, 'not-a-remind-day');
});

test('时区：08:00 UTC 前后分属不同北京时间日期', () => {
    assert.equal(shanghaiToday(Date.UTC(2026, 10, 11, 16, 30)), '2026-11-12');
    assert.equal(shanghaiToday(Date.UTC(2026, 10, 11, 15, 30)), '2026-11-11');
});

test('diffDays 方向：b 更晚为正', () => {
    assert.equal(diffDays('2026-12-09', '2026-12-14'), 5);
    assert.equal(diffDays('2026-12-14', '2026-12-09'), -5);
    assert.equal(diffDays('bad', '2026-12-09'), null);
});

test('模板变量替换，未知变量变空串', () => {
    assert.equal(render('还有 {days} 天', { days: 2 }), '还有 2 天');
    assert.equal(render('{missing}尾', {}), '尾');
});

test('设置归一化：非法值回落默认', () => {
    const normalized = normalizeSettings({
        remindDaysBefore: [99],
        overdueRemindDays: [0, -1],
        templates: { before: { title: '自定义' } }
    });
    assert.deepEqual(normalized.remindDaysBefore, [1, 0]);
    assert.deepEqual(normalized.overdueRemindDays, [3, 5, 7, 10]);
    assert.equal(normalized.templates.before.title, '自定义');
    assert.equal(normalized.templates.before.body, '预计 {range} 开始。\n记得的话点一下记录。');
});

/* ---------- 没有 HTTP 入口 ---------- */

test('fetch 一律 404，不暴露任何调度入口', async () => {
    const worker = (await import('../src/index.js')).default;
    for (const path of ['/', '/run', '/run?dry=0', '/whatever']) {
        const response = await worker.fetch(new Request(`https://example.workers.dev${path}`), {});
        assert.equal(response.status, 404, `${path} 不应该返回 200`);
    }
});

test('设置文档不存在时 fail closed，绝不推送', () => {
    assert.equal(decide(periods(), null, '2026-12-08').skip, 'no-settings');
    assert.equal(decide(periods(), undefined, '2026-12-08').skip, 'no-settings');
    // 空的设置对象算「配置过并采用默认值」，与「文档不存在」不同
    assert.equal(decide(periods(), {}, '2026-12-08').kind, 'before');
});
