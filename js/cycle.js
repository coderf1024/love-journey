/* ============================================================
   生理期 · 纯计算层
   No DOM, no storage. Everything here is a pure function so the
   browser and the future reminder Worker can share one source.
   ============================================================ */

const CYCLE_DAY_MS = 86400000;
const CYCLE_WINDOW_OPTIONS = [3, 6, 12];
const CYCLE_LAMBDA_OPTIONS = [0.7, 0.85, 1.0];
const CYCLE_CENTER_OPTIONS = ['wmedian', 'wmean', 'blend'];
const CYCLE_DEFAULT_WINDOW = 6;
const CYCLE_DEFAULT_LAMBDA = 0.85;
const CYCLE_DEFAULT_CENTER = 'wmedian';
const CYCLE_MIN_SAMPLES = 3;
const CYCLE_MAX_GAP_DAYS = 90;
const CYCLE_SHORT_LIMIT = 15;
const CYCLE_LONG_LIMIT = 60;
const CYCLE_LUTEAL_DAYS = 14;
const CYCLE_OVULATION_BEFORE = 5;
const CYCLE_OVULATION_AFTER = 1;

function cyclePad2(value) {
    return String(value).padStart(2, '0');
}

/* Parse "YYYY-MM-DD" as a local-midnight Date. Safari chokes on the
   dash form unless it is normalised, and we never want UTC drift. */
function cycleParseDay(value) {
    if (!value) return null;
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        const date = new Date(text.replace(/-/g, '/'));
        return isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function cycleDayKey(date) {
    if (!date) return '';
    return `${date.getFullYear()}-${cyclePad2(date.getMonth() + 1)}-${cyclePad2(date.getDate())}`;
}

function cycleToday(now) {
    const value = now instanceof Date ? now : (now ? new Date(now) : new Date());
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function cycleAddDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
}

function cycleDiffDays(a, b) {
    return Math.round((cycleToday(b) - cycleToday(a)) / CYCLE_DAY_MS);
}

/* ---------- records ---------- */

function cycleNormalizePeriods(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map(item => {
            const start = cycleParseDay(item && item.start);
            if (!start) return null;
            const end = cycleParseDay(item && item.end);
            return {
                id: String((item && item.id) || `pd_${cycleDayKey(start).replace(/-/g, '')}`),
                start: cycleDayKey(start),
                end: end && cycleDiffDays(start, end) >= 0 ? cycleDayKey(end) : '',
                flow: ['light', 'normal', 'heavy'].includes(item && item.flow) ? item.flow : '',
                symptoms: Array.isArray(item && item.symptoms) ? item.symptoms.slice(0, 8).map(String) : [],
                mood: ['low', 'normal', 'good'].includes(item && item.mood) ? item.mood : '',
                source: (item && item.source) === 'import' ? 'import' : 'app',
                note: String((item && item.note) || '').slice(0, 60),
                uncertain: !!(item && item.uncertain),
                createdAt: String((item && item.createdAt) || ''),
                updatedAt: String((item && item.updatedAt) || '')
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.start.localeCompare(b.start));
}

function cyclePeriodLength(period) {
    if (!period || !period.end) return 0;
    return cycleDiffDays(period.start, period.end) + 1;
}

/* A period still running: no end, and it did not start absurdly long ago. */
function cycleIsActive(period, today) {
    if (!period || period.end) return false;
    const start = cycleParseDay(period.start);
    if (!start) return false;
    const days = cycleDiffDays(start, today);
    return days >= 0 && days <= 30;
}

function cycleActivePeriod(items, today) {
    return cycleNormalizePeriods(items).filter(item => cycleIsActive(item, today)).pop() || null;
}

/* ---------- cycle lengths ---------- */

/* Length = this start - previous start. Only closed, plausible gaps count. */
function cycleLengthSeries(items) {
    const periods = cycleNormalizePeriods(items);
    const out = [];
    for (let i = 1; i < periods.length; i += 1) {
        const gap = cycleDiffDays(periods[i - 1].start, periods[i].start);
        if (!(gap > 0)) continue;
        out.push({
            index: i,
            start: periods[i].start,
            previousStart: periods[i - 1].start,
            length: gap,
            abnormal: gap < CYCLE_SHORT_LIMIT || gap > CYCLE_LONG_LIMIT,
            uncertain: !!periods[i].uncertain || !!periods[i - 1].uncertain
        });
    }
    return out;
}

/* ---------- estimators ---------- */

function cycleWeights(count, lambda) {
    const weights = [];
    for (let i = 0; i < count; i += 1) {
        const age = count - 1 - i; // 0 = newest
        weights.push(Math.pow(lambda, age));
    }
    return weights;
}

function cycleWeightedMedian(values, weights) {
    const pairs = values
        .map((value, index) => ({ value, weight: weights[index] }))
        .sort((a, b) => a.value - b.value);
    const total = pairs.reduce((sum, pair) => sum + pair.weight, 0);
    if (!total) return null;
    let acc = 0;
    for (const pair of pairs) {
        acc += pair.weight;
        if (acc >= total / 2) return pair.value;
    }
    return pairs[pairs.length - 1].value;
}

function cycleWeightedMean(values, weights) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!total) return null;
    const sum = values.reduce((acc, value, index) => acc + value * weights[index], 0);
    return sum / total;
}

function cycleEstimate(values, algorithm) {
    if (!values.length) return null;
    const weights = cycleWeights(values.length, algorithm.lambda);
    if (algorithm.center === 'wmean') return cycleWeightedMean(values, weights);
    if (algorithm.center === 'blend') {
        const median = cycleWeightedMedian(values, weights);
        const last = values[values.length - 1];
        return median * 0.7 + last * 0.3;
    }
    return cycleWeightedMedian(values, weights);
}

function cycleMad(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const devs = sorted.map(value => Math.abs(value - median)).sort((a, b) => a - b);
    return devs[Math.floor(devs.length / 2)];
}

/* ---------- prediction ---------- */

function cycleAlgorithmKey(algorithm) {
    return `${algorithm.center}:${algorithm.lambda}:${algorithm.window}`;
}

function cycleDefaultAlgorithm() {
    return { center: CYCLE_DEFAULT_CENTER, lambda: CYCLE_DEFAULT_LAMBDA, window: CYCLE_DEFAULT_WINDOW };
}

function cycleAllAlgorithms() {
    const list = [];
    CYCLE_CENTER_OPTIONS.forEach(center => {
        CYCLE_LAMBDA_OPTIONS.forEach(lambda => {
            CYCLE_WINDOW_OPTIONS.forEach(window => {
                list.push({ center, lambda, window });
            });
        });
    });
    return list;
}

function cycleUsableLengths(series) {
    return series.filter(entry => !entry.abnormal && !entry.uncertain);
}

/* Walk-forward: predict each period from only what came before it. */
function cycleBacktest(items, algorithm) {
    const periods = cycleNormalizePeriods(items);
    const series = cycleLengthSeries(items);
    const usable = cycleUsableLengths(series);
    let hit = 0;
    let total = 0;
    let errorSum = 0;
    const runs = [];

    periods.forEach((period, index) => {
        const prior = usable.filter(entry => entry.index < index);
        if (prior.length < CYCLE_MIN_SAMPLES) return;
        const values = prior.slice(-algorithm.window).map(entry => entry.length);
        const estimate = cycleEstimate(values, algorithm);
        if (estimate == null) return;
        const predicted = cycleAddDays(cycleParseDay(periods[index - 1].start), Math.round(estimate));
        const actual = cycleParseDay(period.start);
        const error = Math.abs(cycleDiffDays(predicted, actual));
        total += 1;
        errorSum += error;
        if (error <= 1) hit += 1;
        runs.push({ start: period.start, error, hit: error <= 1 });
    });

    return {
        hit,
        total,
        mae: total ? Math.round((errorSum / total) * 10) / 10 : null,
        runs: runs.slice(-12)
    };
}

/* ---- period-length stats used by the hero ---- */

function cyclePeriodStats(items) {
    const closed = cycleNormalizePeriods(items).filter(item => item.end);
    const lengths = closed.map(item => cyclePeriodLength(item)).filter(n => n > 0);
    if (!lengths.length) return { average: 5, median: 5, samples: 0 };
    const sorted = [...lengths].sort((a, b) => a - b);
    return {
        average: Math.round(lengths.reduce((sum, n) => sum + n, 0) / lengths.length),
        median: sorted[Math.floor(sorted.length / 2)],
        samples: lengths.length
    };
}

function cyclePickAlgorithm(items, settings) {
    const override = settings && settings.algorithmOverride;
    if (override && override.center) {
        return { algorithm: override, backtest: cycleBacktest(items, override), auto: false };
    }
    if (settings && settings.autoTune === false) {
        const algorithm = cycleDefaultAlgorithm();
        return { algorithm, backtest: cycleBacktest(items, algorithm), auto: false };
    }

    const favorite = cycleDefaultAlgorithm();
    let best = favorite;
    let bestBacktest = cycleBacktest(items, favorite);

    if (bestBacktest.total >= 8) {
        cycleAllAlgorithms().forEach(candidate => {
            if (cycleAlgorithmKey(candidate) === cycleAlgorithmKey(favorite)) return;
            const result = cycleBacktest(items, candidate);
            if (result.total < 8 || result.mae == null) return;
            if (bestBacktest.mae == null || result.mae <= bestBacktest.mae - 0.5) {
                best = candidate;
                bestBacktest = result;
            }
        });
    }
    return { algorithm: best, backtest: bestBacktest, auto: true };
}

function cycleConfidence(sampleSize, mad) {
    if (sampleSize < CYCLE_MIN_SAMPLES) return 'none';
    if (sampleSize >= 6 && mad <= 2) return 'high';
    if (mad <= 4) return 'mid';
    return 'low';
}

function cyclePredict(items, settings, today) {
    const now = cycleToday(today);
    const periods = cycleNormalizePeriods(items);
    const series = cycleLengthSeries(items);
    const usable = cycleUsableLengths(series);
    const last = periods[periods.length - 1] || null;

    const empty = {
        status: 'none',
        reason: 'no-data',
        asOf: cycleDayKey(now),
        sampleSize: usable.length,
        cycles: series.length
    };

    if (!last) return empty;

    const sinceLast = cycleDiffDays(last.start, now);
    if (series.length < CYCLE_MIN_SAMPLES) {
        return { ...empty, reason: 'few-samples', lastStart: last.start, lastEnd: last.end || '' };
    }
    if (sinceLast > CYCLE_MAX_GAP_DAYS) {
        return { ...empty, reason: 'stale', lastStart: last.start, lastEnd: last.end || '' };
    }

    const picked = cyclePickAlgorithm(items, settings);
    const values = usable.slice(-picked.algorithm.window).map(entry => entry.length);
    const estimate = cycleEstimate(values, picked.algorithm);
    const length = Math.round(estimate);
    const center = cycleAddDays(cycleParseDay(last.start), length);
    const from = cycleAddDays(center, -1);
    const to = cycleAddDays(center, 1);
    const mad = cycleMad(values);
    const abnormalRecent = series.slice(-3).filter(entry => entry.abnormal).length;
    const confidence = abnormalRecent >= 2 ? 'low' : cycleConfidence(values.length, mad);

    return {
        status: 'ok',
        asOf: cycleDayKey(now),
        center: cycleDayKey(center),
        range: [cycleDayKey(from), cycleDayKey(to)],
        cycleLength: length,
        sampleSize: values.length,
        mad,
        average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        confidence,
        algorithm: picked.algorithm,
        auto: picked.auto,
        backtest: picked.backtest,
        lastStart: last.start,
        lastEnd: last.end || '',
        overdueDays: Math.max(0, cycleDiffDays(to, now)),
        dataVersion: ''
    };
}

/* ---------- ovulation ---------- */

function cycleOvulation(prediction) {
    if (!prediction || prediction.status !== 'ok' || !prediction.center) return null;
    const center = cycleParseDay(prediction.center);
    if (!center) return null;
    const ovulation = cycleAddDays(center, -CYCLE_LUTEAL_DAYS);
    return {
        day: cycleDayKey(ovulation),
        from: cycleDayKey(cycleAddDays(ovulation, -CYCLE_OVULATION_BEFORE)),
        to: cycleDayKey(cycleAddDays(ovulation, CYCLE_OVULATION_AFTER))
    };
}

/* ---------- calendar ---------- */

/* Monday-first month grid. Each cell carries its own state so the
   renderer stays dumb. */
function cycleMonthCells(year, month, items, prediction, options = {}) {
    const periods = cycleNormalizePeriods(items);
    const today = cycleToday(options.today);
    const ovulation = options.showOvulation === false ? null : cycleOvulation(prediction || options.prediction);
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const states = new Map();
    periods.forEach(period => {
        const start = cycleParseDay(period.start);
        const end = period.end ? cycleParseDay(period.end) : (cycleIsActive(period, today) ? today : cycleParseDay(period.start));
        if (!start || !end) return;
        for (let cursor = new Date(start); cursor <= end; cursor = cycleAddDays(cursor, 1)) {
            states.set(cycleDayKey(cursor), { kind: 'period', source: period.source, period });
        }
    });

    if (prediction && prediction.status === 'ok' && !cycleActivePeriod(items, today)) {
        const from = cycleParseDay(prediction.range[0]);
        const to = cycleParseDay(prediction.range[1]);
        if (prediction.overdueDays > 0) {
            for (let cursor = new Date(from); cursor <= to; cursor = cycleAddDays(cursor, 1)) {
                if (!states.has(cycleDayKey(cursor))) states.set(cycleDayKey(cursor), { kind: 'prediction', overdue: true });
            }
        } else {
            for (let cursor = new Date(from); cursor <= to; cursor = cycleAddDays(cursor, 1)) {
                if (!states.has(cycleDayKey(cursor))) states.set(cycleDayKey(cursor), { kind: 'prediction' });
            }
        }
    }

    if (ovulation) {
        const from = cycleParseDay(ovulation.from);
        const to = cycleParseDay(ovulation.to);
        // Ovulation wins over the surrounding band, so mark it first.
        if (!states.has(ovulation.day)) states.set(ovulation.day, { kind: 'ovulation' });
        for (let cursor = new Date(from); cursor <= to; cursor = cycleAddDays(cursor, 1)) {
            if (!states.has(cycleDayKey(cursor))) states.set(cycleDayKey(cursor), { kind: 'fertile' });
        }
    }

    const cells = [];
    for (let i = 0; i < offset; i += 1) {
        cells.push({ day: prevDays - offset + 1 + i, muted: true, key: '' });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const key = cycleDayKey(new Date(year, month, day));
        const state = states.get(key) || { kind: 'none' };
        cells.push({
            day,
            key,
            muted: false,
            today: key === cycleDayKey(today),
            ...state
        });
    }
    while (cells.length % 7 !== 0) {
        cells.push({ day: cells.length - offset - daysInMonth + 1, muted: true, key: '' });
    }
    return cells;
}

function cycleMonthLabel(year, month) {
    return `${year} 年 ${month + 1} 月`;
}

/* ---------- misc helpers used by the UI ---------- */

function cycleFmtAgree(confidence) {
    return { high: '高', mid: '中', low: '低', none: '—' }[confidence] || '—';
}

function cycleCenterLabel(algorithm) {
    return { wmedian: '加权中位数', wmean: '加权均值', blend: '中位数 + 上次' }[algorithm.center] || '加权中位数';
}

function cycleFmtShort(dayKey) {
    const date = cycleParseDay(dayKey);
    if (!date) return '—';
    return `${cyclePad2(date.getMonth() + 1)}.${cyclePad2(date.getDate())}`;
}

function cycleFmtLong(dayKey) {
    const date = cycleParseDay(dayKey);
    if (!date) return '—';
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

const CYCLE_WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function cycleWeekday(dayKey) {
    const date = cycleParseDay(dayKey);
    return date ? CYCLE_WEEKDAY_LABELS[date.getDay()] : '';
}
