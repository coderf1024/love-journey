/* ============================================================
   生理期 · 界面层
   Owns the home strip, the 空间 sub-page (calendar / forecast /
   records), the record sheets, the import flow and the saved dialog.
   Data comes from js/store.js; maths comes from js/cycle.js.
   ============================================================ */

const CYCLE_XLSX_SRC = 'assets/vendor/xlsx.mini.min.js?v=20261112-01';

const CycleUI = (() => {
    const ui = {
        loaded: false,
        loading: null,
        items: [],
        settings: null,
        prediction: null,
        view: 'calendar',
        month: null,
        lastSaved: null,
        importStep: null,
        importFile: null,
        importTable: null,
        importMapping: null,
        importEntries: null,
        busy: false
    };

    const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

    /* ---------- helpers ---------- */

    function $(id) { return document.getElementById(id); }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function today() { return cycleToday(); }

    function settingsSafe() { return ui.settings || normalizeCycleSettings(null); }

    /* ---------- loading ---------- */

    function load(force) {
        if (!force && ui.loaded) return Promise.resolve(ui);
        if (ui.loading) return ui.loading;
        ui.loading = loadCycle()
            .then(data => {
                ui.items = data.items;
                ui.settings = data.settings;
                ui.prediction = data.prediction;
                ui.loaded = true;
                ui.loading = null;
                return ui;
            })
            .catch(error => {
                ui.loading = null;
                console.warn('读取生理期数据失败:', error);
                throw error;
            });
        return ui.loading;
    }

    function apply(data) {
        ui.items = data.items;
        if (data.settings) ui.settings = data.settings;
        ui.prediction = data.prediction;
        ui.loaded = true;
        ui.lastSaved = { items: data.items, prediction: data.prediction };
        render();
    }

    /* ---------- home strip ---------- */

    function stripModel() {
        const settings = settingsSafe();
        if (!settings.enabled) return null;
        const prediction = ui.prediction;
        const items = ui.items;
        const now = today();
        const active = cycleActivePeriod(items, now);

        if (active) {
            const dayIndex = cycleDiffDays(active.start, now) + 1;
            return {
                live: true,
                ghost: false,
                mark: String(dayIndex),
                markSub: '天',
                title: `经期第 ${dayIndex} 天`,
                sub: `${cycleFmtShort(active.start)} 开始${active.source === 'import' ? ' · 美柚导入' : ''}`,
                cta: '结束了',
                action: 'end'
            };
        }

        if (!prediction || prediction.status !== 'ok') {
            return {
                live: false,
                ghost: false,
                mark: '?',
                markSub: '',
                title: '开始记录吧',
                sub: '记满 3 次就能预测',
                cta: '今天来了',
                action: 'start'
            };
        }

        if (prediction.overdueDays > 0) {
            return {
                live: false,
                ghost: false,
                overdue: true,
                mark: String(prediction.overdueDays),
                markSub: '天',
                title: `已过 ${prediction.overdueDays} 天`,
                sub: `当时预计 ${cycleFmtShort(prediction.range[0])} – ${cycleFmtShort(prediction.range[1])}`,
                cta: '记录',
                action: 'start'
            };
        }

        const days = cycleDiffDays(now, prediction.range[0]);
        if (days > Number(settings.homeStripThresholdDays)) return null;

        return {
            live: days <= 3,
            ghost: days > 3,
            mark: days <= 0 ? '今' : String(days),
            markSub: days <= 0 ? '' : '天后',
            title: days <= 0 ? '可能就是今天' : `大概快来了`,
            sub: `预计 ${cycleFmtShort(prediction.range[0])} – ${cycleFmtShort(prediction.range[1])} · ${prediction.sampleSize} 个周期`,
            cta: '记录',
            action: 'start'
        };
    }

    /* The Worker writes settings.lastPush; a failed push must be visible
       instead of silent, otherwise the only signal is "no notification". */
    function renderPushWarning() {
        const box = $('cycle-push-warning');
        if (!box) return;
        const settings = settingsSafe();
        const lastPush = settings.lastPush || {};
        const kind = lastPush.kind || '';
        const failed = lastPush.ok === false && (lastPush.date || '');
        // Only nag once: if the failure is older than three days the data has
        // moved on and a banner would just be noise.
        const age = failed ? cycleDiffDays(lastPush.date, cycleDayKey(today())) : 0;
        if (!failed || age > 3) {
            box.hidden = true;
            return;
        }
        const labels = { before: '即将开始', start: '当天', overdue: '过期补录' };
        box.hidden = false;
        const text = $('cycle-push-warning-text');
        if (text) {
            text.textContent = `「${labels[kind] || '提醒'}」那条没送到手机上`;
        }
    }

    function renderStrip() {
        const strip = $('cycle-strip');
        renderPushWarning();
        if (!strip) return;
        const model = stripModel();
        if (!model) {
            strip.hidden = true;
            return;
        }
        strip.hidden = false;
        strip.classList.toggle('is-live', !!model.live);
        strip.classList.toggle('is-overdue', !!model.overdue);
        strip.classList.toggle('is-ghost', !!model.ghost);
        strip.dataset.cycleAction = model.action;

        const mark = $('cycle-strip-mark');
        if (mark) mark.innerHTML = `${esc(model.mark)}${model.markSub ? `<small>${esc(model.markSub)}</small>` : ''}`;
        const title = $('cycle-strip-title');
        if (title) title.textContent = model.title;
        const sub = $('cycle-strip-sub');
        if (sub) sub.textContent = model.sub;
        const cta = $('cycle-strip-cta');
        if (cta) cta.textContent = model.cta;
    }

    function renderMeRow() {
        const sub = $('me-menu-cycle-sub');
        const value = $('me-menu-cycle-value');
        if (!sub || !value) return;
        const now = today();
        const active = cycleActivePeriod(ui.items, now);
        const prediction = ui.prediction;
        if (active) {
            sub.textContent = `${cycleFmtShort(active.start)} 开始 · 第 ${cycleDiffDays(active.start, now) + 1} 天`;
            value.textContent = '进行中';
            return;
        }
        if (!prediction || prediction.status !== 'ok') {
            sub.textContent = ui.items.length ? '数据还不够，再记几次' : '还没开始记录';
            value.textContent = '';
            return;
        }
        if (prediction.overdueDays > 0) {
            sub.textContent = `当时预计 ${cycleFmtShort(prediction.range[0])} – ${cycleFmtShort(prediction.range[1])}`;
            value.textContent = `已过 ${prediction.overdueDays} 天`;
            return;
        }
        const days = cycleDiffDays(now, prediction.range[0]);
        sub.textContent = `预计 ${cycleFmtShort(prediction.range[0])} – ${cycleFmtShort(prediction.range[1])}`;
        value.textContent = days <= 0 ? '就这几天' : `还有 ${days} 天`;
    }

    /* ---------- hero panes ---------- */

    function heroHTML() {
        const now = today();
        const active = cycleActivePeriod(ui.items, now);
        const prediction = ui.prediction;
        const settings = settingsSafe();

        if (active) {
            const dayIndex = cycleDiffDays(active.start, now) + 1;
            const typical = prediction && prediction.status === 'ok'
                ? cyclePeriodLengthAverage()
                : 5;
            const expectedEnd = cycleDayKey(cycleAddDays(cycleParseDay(active.start), Math.max(0, typical - 1)));
            const progress = Math.min(100, Math.round((dayIndex / Math.max(1, typical)) * 100));
            return `
                <div class="cycle-hero is-live">
                    <div class="cycle-hero-label">经期中</div>
                    <div class="cycle-hero-main"><b>第 ${dayIndex} 天</b></div>
                    <div class="cycle-hero-range">${esc(cycleFmtShort(active.start))} 开始 · 通常 ${typical} 天，预计 ${esc(cycleFmtShort(expectedEnd))} 结束</div>
                    <div class="cycle-hero-meta">${escapeMeta(active, prediction)}</div>
                    <div class="cycle-track"><i style="width:${progress}%"></i><b style="left:${progress}%"></b></div>
                    <div class="cycle-scale">
                        <span>${esc(cycleFmtShort(active.start))} 开始</span>
                        <span>今天 ${esc(cycleFmtShort(cycleDayKey(now)))}</span>
                        <span>${esc(cycleFmtShort(expectedEnd))} 预计结束</span>
                    </div>
                </div>
                <div class="cycle-btn-row cycle-actions">
                    <button class="cycle-btn primary" type="button" data-cycle-action="end">今天结束了</button>
                    <button class="cycle-btn ghost" type="button" data-cycle-action="edit-active">记录细节</button>
                </div>`;
        }

        if (!prediction || prediction.status !== 'ok') {
            const count = ui.items.length;
            const stale = prediction && prediction.reason === 'stale';
            // A dash in place of a number reads as a broken card. Show the
            // progress toward the minimum instead; it is the only number that
            // exists before a prediction does.
            const need = 3;
            const filled = Math.min(count, need);
            return `
                <div class="cycle-hero is-empty">
                    <div class="cycle-hero-label">还不预测</div>
                    <div class="cycle-empty-main">
                        <b>${filled}<span>/${need}</span></b>
                        <small>${count ? '次记录' : '还没有记录'}</small>
                    </div>
                    <div class="cycle-empty-dots" aria-hidden="true">
                        ${Array.from({ length: need }, (_, i) => `<i class="${i < filled ? 'is-on' : ''}"></i>`).join('')}
                    </div>
                    <div class="cycle-hero-range">${stale
                        ? '最近一次记录在 90 天以前，补几次就能重新预测'
                        : count >= need ? '记录够了，但周期还不够稳定' : `再记 ${need - count} 次就能开始预测`}</div>
                    <div class="cycle-hero-meta">数据不够时不硬给日期，日历上也不画预测</div>
                </div>
                <div class="cycle-btn-row cycle-actions">
                    <button class="cycle-btn primary" type="button" data-cycle-action="start">今天来了</button>
                    ${settings.allowUserImport ? '<button class="cycle-btn ghost" type="button" data-cycle-action="import">从美柚导入</button>' : ''}
                </div>`;
        }

        if (prediction.overdueDays > 0) {
            return `
                <div class="cycle-hero is-overdue">
                    <div class="cycle-hero-label">已过预计时间</div>
                    <div class="cycle-hero-main"><b>${prediction.overdueDays}</b><span>天</span></div>
                    <div class="cycle-hero-range">当时预计 ${esc(cycleFmtShort(prediction.range[0]))} – ${esc(cycleFmtShort(prediction.range[1]))}</div>
                    <div class="cycle-hero-meta">预测于 ${esc(cycleFmtShort(prediction.asOf))} 生成 · 没有重算</div>
                    <div class="cycle-track"><i style="width:100%;background:rgba(255,253,248,.32)"></i></div>
                    <div class="cycle-scale">
                        <span>${esc(cycleFmtShort(prediction.range[0]))} 预计</span>
                        <span>${esc(cycleFmtShort(prediction.range[1]))} 区间末</span>
                        <span>今天 ${esc(cycleFmtShort(cycleDayKey(now)))}</span>
                    </div>
                </div>
                <div class="cycle-banner is-plain">
                    <b>预测没有变，只是过期了。</b><br>
                    如果已经来了，记一下为准；如果确实还没来，也可以再等等。<br>
                    过期第 ${settings.overdueRemindDays.join(' / ')} 天各提醒一次，之后不再提。
                </div>
                <div class="cycle-btn-row cycle-actions">
                    <button class="cycle-btn primary" type="button" data-cycle-action="start">今天来了</button>
                    <button class="cycle-btn ghost" type="button" data-cycle-action="backfill">补记前几天</button>
                </div>`;
        }

        const days = cycleDiffDays(now, prediction.range[0]);
        const lastStart = prediction.lastStart;
        const windowStart = cycleParseDay(prediction.range[0]);
        const total = Math.max(1, cycleDiffDays(cycleParseDay(lastStart), windowStart));
        const done = Math.max(0, Math.min(total, cycleDiffDays(cycleParseDay(lastStart), now)));
        const progress = Math.round((done / total) * 100);
        return `
            <div class="cycle-hero">
                <div class="cycle-hero-label">距离下次</div>
                <div class="cycle-hero-main"><b>${days > 0 ? days : '今'}</b><span>${days > 0 ? '天' : '天'}</span></div>
                <div class="cycle-hero-range">预计 ${esc(cycleFmtShort(prediction.range[0]))} – ${esc(cycleFmtShort(prediction.range[1]))}</div>
                <div class="cycle-hero-meta">基于最近 ${prediction.sampleSize} 个周期 · 平均 ${prediction.average} 天 · 波动 ±${prediction.mad} 天</div>
                <div class="cycle-track"><i style="width:${progress}%"></i><b style="left:${progress}%"></b></div>
                <div class="cycle-scale">
                    <span>${esc(cycleFmtShort(lastStart))} 上次</span>
                    <span>今天 ${esc(cycleFmtShort(cycleDayKey(now)))}</span>
                    <span>${esc(cycleFmtShort(prediction.center))} 预计</span>
                </div>
            </div>
            <div class="cycle-actions">
                <button class="cycle-btn primary" type="button" data-cycle-action="start">今天来了</button>
            </div>`;
    }

    function escapeMeta(active, prediction) {
        if (!prediction || prediction.status !== 'ok') return '持续天数按 5 天估算';
        const late = cycleDiffDays(prediction.range[0], active.start);
        if (late === 0) return '和预计同一天';
        return late < 0 ? `比预计早 ${Math.abs(late)} 天` : `比预计晚 ${late} 天`;
    }

    function cyclePeriodLengthAverage() {
        return cyclePeriodStats(ui.items).average;
    }

    /* ---------- evidence card ---------- */

    function evidenceHTML() {
        const prediction = ui.prediction;
        if (!prediction || prediction.status !== 'ok') return '';
        const backtest = prediction.backtest || {};
        const algorithm = prediction.algorithm || cycleDefaultAlgorithm();
        const why = prediction.auto
            ? `试了 27 种算法，这一种在你的数据上误差最小${backtest.mae != null ? `（${backtest.mae} 天）` : ''}。`
            : '算法已由管理端固定。';
        return `
            <div class="cycle-card cycle-evidence">
                <div class="cycle-card-head">怎么算出来的<span class="cycle-chev" data-cycle-why-toggle>为什么 ›</span></div>
                <div class="cycle-meta">
                    <div><span>样本</span><b>${prediction.sampleSize} 个周期</b></div>
                    <div><span>平均</span><b>${prediction.average} 天</b></div>
                    <div><span>波动</span><b>±${prediction.mad} 天</b></div>
                    <div><span>置信度</span><b>${cycleFmtAgree(prediction.confidence)}</b></div>
                </div>
                <div class="cycle-why" id="cycle-why" hidden>
                    <div class="cycle-kv"><span>算法</span><b>${esc(cycleCenterLabel(algorithm))} · 近 ${algorithm.window} 次</b></div>
                    <p class="cycle-note">${esc(why)}</p>
                    <p class="cycle-note">预测于 ${esc(cycleFmtShort(prediction.asOf))} 生成，只算下一次，不会每次打开都变。</p>
                </div>
            </div>`;
    }

    /* The backtest used to be a bar chart. With three runs it drew three
       200px slabs, and the bars encoded a value ("days off") that nobody reads
       at a glance. A short list reads the same at 2 rows or 12. */
    function backtestHTML() {
        const prediction = ui.prediction;
        if (!prediction || prediction.status !== 'ok') return '';
        const backtest = prediction.backtest || {};
        if (!backtest.total) {
            return `
                <div class="cycle-card">
                    <div class="cycle-card-head">还没有足够的回测</div>
                    <p class="cycle-note">至少要有 4 次记录才能回测。现在还不能说它准不准。</p>
                </div>`;
        }
        const rate = Math.round((backtest.hit / backtest.total) * 100);
        const runs = (Array.isArray(backtest.runs) ? backtest.runs : []).slice(-6).reverse();
        const tone = rate >= 70 ? 'is-good' : rate >= 50 ? 'is-mid' : 'is-bad';
        return `
            <div class="cycle-card">
                <div class="cycle-card-head">它准不准</div>
                <div class="cycle-bt">
                    <div class="cycle-bt-rate ${tone}">
                        <b>${rate}<span>%</span></b>
                        <small>落在区间内</small>
                    </div>
                    <div class="cycle-bt-facts">
                        <div class="cycle-kv"><span>回测</span><b>${backtest.total} 次</b></div>
                        <div class="cycle-kv"><span>平均偏差</span><b>${backtest.mae} 天</b></div>
                        <div class="cycle-kv"><span>命中</span><b>${backtest.hit} / ${backtest.total}</b></div>
                    </div>
                </div>
                ${runs.length ? `
                    <div class="cycle-bt-runs">
                        ${runs.map(run => `
                            <span class="cycle-bt-run ${run.hit ? 'is-hit' : ''}" title="${esc(run.start)}：偏差 ${run.error} 天">
                                <i></i>${esc(cycleFmtShort(run.start))}
                                <b>${run.error === 0 ? '正好' : `+${run.error} 天`}</b>
                            </span>
                        `).join('')}
                    </div>` : ''}
                <p class="cycle-note">每次记录后重算一次回测。3 天窗口本来就很窄，命中率低不代表没用。</p>
            </div>`;
    }

    /* ---------- records ---------- */

    function recordsHTML(limit) {
        const items = [...ui.items].reverse();
        const shown = limit ? items.slice(0, limit) : items;
        if (!shown.length) {
            return '<div class="cycle-empty">还没有记录。<br>点上面的「今天来了」记一笔。</div>';
        }
        const now = today();
        return `
            <div class="cycle-card">
                <div class="cycle-card-head">最近 ${shown.length} 次${items.length > shown.length ? ' · 共 ' + items.length + ' 次' : ''}</div>
                <div class="cycle-records">
                    ${shown.map(item => recordRowHTML(item, now)).join('')}
                </div>
            </div>`;
    }

    function recordRowHTML(item, now) {
        const active = cycleIsActive(item, now);
        const length = cyclePeriodLength(item);
        const index = ui.items.findIndex(entry => entry.id === item.id);
        const previous = index > 0 ? ui.items[index - 1] : null;
        const gap = previous ? cycleDiffDays(previous.start, item.start) : null;
        const classes = ['cycle-record'];
        if (active) classes.push('is-active');
        if (item.source === 'import') classes.push('is-import');
        return `
            <button class="${classes.join(' ')}" type="button" data-cycle-record="${esc(item.id)}">
                <span class="cycle-record-dot"></span>
                <span class="cycle-record-main">
                    <b>${esc(cycleFmtShort(item.start))}${item.end ? ` – ${esc(cycleFmtShort(item.end))}` : active ? ' – 至今' : ' – 单日'}</b>
                    <small>${active ? `第 ${cycleDiffDays(item.start, now) + 1} 天 · 进行中` : `${length} 天`}${item.source === 'import' ? ' · 美柚导入' : ''}${item.uncertain ? ' · 记不清' : ''}</small>
                </span>
                <span class="cycle-record-val">
                    <b>${active ? '—' : gap != null ? gap : '—'}</b>${active ? '进行中' : gap != null ? '天周期' : ''}
                </span>
            </button>`;
    }

    /* ---------- calendar ---------- */

    function monthMeta() {
        if (!ui.month) {
            const now = today();
            ui.month = { year: now.getFullYear(), month: now.getMonth() };
        }
        return ui.month;
    }

    function calendarHTML() {
        const { year, month } = monthMeta();
        const settings = settingsSafe();
        const cells = cycleMonthCells(year, month, ui.items, ui.prediction, {
            today: today(),
            showOvulation: settings.showOvulation
        });
        const ovulation = settings.showOvulation ? cycleOvulation(ui.prediction) : null;
        const prediction = ui.prediction;
        const active = cycleActivePeriod(ui.items, today());
        const upcoming = prediction && prediction.status === 'ok'
            ? `<div class="cycle-kv"><span>下一次</span><b style="color:var(--cycle-deep)">${esc(cycleFmtShort(prediction.range[0]))} – ${esc(cycleFmtShort(prediction.range[1]))}</b></div>`
            : '<div class="cycle-kv"><span>下一次</span><b>数据还不够</b></div>';
        const ovuRow = ovulation
            ? `<div class="cycle-kv"><span>排卵日</span><b style="color:var(--cycle-ovu)">${esc(cycleFmtShort(ovulation.day))}</b></div>`
            : '';

        return `
            <div class="cycle-card">
                <div class="cycle-cal-head">
                    <b>${esc(cycleMonthLabel(year, month))}</b>
                    <div class="cycle-cal-nav">
                        <button type="button" data-cycle-month="-1" aria-label="上个月">‹</button>
                        <button type="button" data-cycle-month="1" aria-label="下个月">›</button>
                    </div>
                </div>
                <div class="cycle-cal-week" aria-hidden="true">
                    ${WEEK_LABELS.map(label => `<span>${label}</span>`).join('')}
                </div>
                <div class="cycle-cal-grid">
                    ${cells.map(cell => dayCellHTML(cell)).join('')}
                </div>
                <div class="cycle-cal-legend">
                    <span><i class="is-solid"></i>已记录</span>
                    <span><i class="is-ring"></i>预测 3 天</span>
                    ${settings.showOvulation ? '<span><i class="is-band"></i>排卵期</span><span><i class="is-ovu"></i>排卵日</span>' : ''}
                    <span><i class="is-today"></i>今天</span>
                    <span><i class="is-import"></i>导入</span>
                </div>
            </div>
            <div class="cycle-card">
                ${active
                    ? `<div class="cycle-kv"><span>进行中</span><b>${esc(cycleFmtShort(active.start))} – 至今 · 第 ${cycleDiffDays(active.start, today()) + 1} 天</b></div>`
                    : `<div class="cycle-kv"><span>上次</span><b>${esc(lastPeriodLabel())}</b></div>`}
                ${upcoming}
                ${ovuRow}
                ${prediction && prediction.status === 'ok' ? `<div class="cycle-kv"><span>周期</span><b>${prediction.cycleLength} 天</b></div>` : ''}
            </div>`;
    }

    function lastPeriodLabel() {
        const last = ui.items[ui.items.length - 1];
        if (!last) return '还没有记录';
        return `${cycleFmtShort(last.start)}${last.end ? ` – ${cycleFmtShort(last.end)}` : ''}`;
    }

    function dayCellHTML(cell) {
        if (cell.muted) return `<span class="cycle-day is-mute"><span>${cell.day}</span></span>`;
        const classes = ['cycle-day'];
        if (cell.kind === 'period') classes.push('is-period');
        if (cell.kind === 'prediction') classes.push('is-prediction');
        if (cell.kind === 'prediction' && cell.overdue) classes.push('is-overdue');
        if (cell.kind === 'fertile') classes.push('is-fertile');
        if (cell.kind === 'ovulation') classes.push('is-ovulation');
        if (cell.today) classes.push('is-today');
        if (cell.kind === 'period' && cell.source === 'import') classes.push('is-import');
        return `<button class="${classes.join(' ')}" type="button" data-cycle-day="${esc(cell.key)}"><span>${cell.day}</span></button>`;
    }

    /* ---------- views ---------- */

    function renderSubPage() {
        const body = $('me-sub-body');
        if (!body) return;
        const view = ui.view;
        const settings = settingsSafe();
        const tabs = [
            ['calendar', '日历'],
            ['forecast', '预测'],
            ['records', '记录']
        ];
        body.innerHTML = `
            <div class="cycle-view">
                <div class="cycle-seg" role="tablist" aria-label="生理期视图">
                    ${tabs.map(([id, label]) => `
                        <button type="button" role="tab" aria-selected="${view === id}" class="${view === id ? 'is-active' : ''}" data-cycle-view="${id}">${label}</button>
                    `).join('')}
                </div>
                <div id="cycle-pane">
                    ${view === 'calendar' ? calendarHTML() : ''}
                    ${view === 'forecast' ? forecastHTML() : ''}
                    ${view === 'records' ? recordsHTML() + recordsActionsHTML(settings) : ''}
                </div>
            </div>`;
    }

    /* The forecast tab used to stack hero + a five-row evidence card + a
       chart + the last six records, which repeated what 记录 already shows.
       Order here is "answer → why → how sure", and the record list is gone. */
    function forecastHTML() {
        const prediction = ui.prediction;
        const hasPrediction = prediction && prediction.status === 'ok';
        return heroHTML() + (hasPrediction ? backtestHTML() + evidenceHTML() : recordsHTML(3));
    }

    function recordsActionsHTML(settings) {
        return `
            <div class="cycle-actions">
                <button class="cycle-btn primary" type="button" data-cycle-action="start">今天来了</button>
                <div class="cycle-btn-row">
                    <button class="cycle-btn ghost" type="button" data-cycle-action="backfill">补记</button>
                    ${settings.allowUserImport ? '<button class="cycle-btn ghost" type="button" data-cycle-action="import">从美柚导入</button>' : ''}
                </div>
            </div>`;
    }

    function render() {
        renderStrip();
        renderMeRow();
        const app = appState();
        if (app && app.meView === 'cycle') renderSubPage();
    }

    /* app.js declares `state` as a top-level const, so it lives in the
       shared global lexical scope rather than on window. */
    function appState() {
        try {
            return typeof state === 'undefined' ? null : state;
        } catch (error) {
            return null;
        }
    }

    /* ---------- record flow ---------- */

    function openRecordSheet(mode) {
        const body = $('cycle-record-body');
        if (!body) return;
        const now = today();
        const iso = cycleDayKey(now);
        const active = cycleActivePeriod(ui.items, now);

        if (mode === 'ask') {
            body.innerHTML = `
                <div class="cycle-sheet-title">记一笔</div>
                <p class="cycle-sheet-sub">今天（${esc(cycleFmtShort(iso))}）开始。日期不对可以改。</p>
                <button class="cycle-opt is-primary" type="button" data-cycle-opt="today">
                    <span class="cycle-opt-icon">✓</span>
                    <span class="cycle-opt-main"><b>就是今天，${esc(cycleFmtShort(iso))}</b><span class="cycle-opt-sub">记完直接回上一页</span></span>
                </button>
                <button class="cycle-opt" type="button" data-cycle-opt="backfill">
                    <span class="cycle-opt-icon">↺</span>
                    <span class="cycle-opt-main"><b>其实前几天就来了</b><span class="cycle-opt-sub">补记开始日期</span></span>
                </button>`;
            openSheet('cycle-record-sheet');
            return;
        }

        const startValue = mode === 'backfill' ? cycleDayKey(cycleAddDays(now, -2)) : iso;
        body.innerHTML = `
            <div class="cycle-sheet-title">什么时候开始的？</div>
            <p class="cycle-sheet-sub">补记得越准，预测越准。记不清就选「记不清了」。</p>
            <div class="cycle-date-row">
                <div class="cycle-date-field">
                    <label for="cycle-start-input">开始</label>
                    <input id="cycle-start-input" type="date" value="${startValue}" max="${iso}">
                </div>
                <div class="cycle-date-field">
                    <label for="cycle-end-input">结束（可空）</label>
                    <input id="cycle-end-input" type="date" value="" max="${iso}">
                </div>
            </div>
            <div class="cycle-chips" data-cycle-quick>
                ${[0, 1, 2].map(offset => {
                    const day = cycleDayKey(cycleAddDays(now, -offset));
                    return `<button class="cycle-chip${offset === (mode === 'backfill' ? 2 : 0) ? ' is-on' : ''}" type="button" data-cycle-quick-day="${day}">${esc(cycleFmtShort(day))}</button>`;
                }).join('')}
                <button class="cycle-chip is-empty" type="button" data-cycle-quick-uncertain>记不清了</button>
            </div>
            <button class="cycle-btn primary" style="margin-top:14px" type="button" data-cycle-opt="save" id="cycle-save-btn">保存</button>`;
        body.dataset.mode = mode;
        body.dataset.uncertain = '';
        openSheet('cycle-record-sheet');
    }

    function openEditResult(result, kind, beforePrediction) {
        const body = $('cycle-saved-body');
        const dialog = $('cycle-saved-dialog');
        if (!body || !dialog) return;
        // `apply()` already refreshed ui.prediction, so the caller passes the
        // snapshot taken before the write.
        const before = beforePrediction || null;
        const after = result.prediction;
        const entry = result.entry || (result.items && result.items[result.items.length - 1]);

        const rows = [];
        if (entry) {
            rows.push(['记下了', `${cycleFmtShort(entry.start)}${entry.end ? ` – ${cycleFmtShort(entry.end)}` : ' · 开始'}`]);
        }
        if (before && before.status === 'ok' && entry) {
            // Compare against the window, not its first day: landing inside the
            // 3-day range is "on time", not "a few days early".
            // cycleDiffDays(a, b) = b - a, so positive means b is later.
            const fromStart = cycleDiffDays(before.range[0], entry.start);
            const fromEnd = cycleDiffDays(before.range[1], entry.start);
            let compare;
            if (fromStart >= 0 && fromEnd <= 0) compare = '落在区间内';
            else if (fromStart < 0) compare = `早了 ${Math.abs(fromStart)} 天`;
            else compare = `晚了 ${fromEnd} 天`;
            rows.push(['和预计相比', compare]);
        }
        if (after && after.status === 'ok') {
            rows.push(['学习样本', `${after.sampleSize} 条`]);
            rows.push(['用到的算法', `${cycleCenterLabel(after.algorithm)} · 近 ${after.algorithm.window} 次`]);
        } else if (after) {
            rows.push(['学习样本', `${after.sampleSize} 条（还差 ${Math.max(0, 3 - after.sampleSize)} 条）`]);
        }

        let change = '';
        if (before && before.status === 'ok' && after && after.status === 'ok') {
            const same = before.range[0] === after.range[0] && before.range[1] === after.range[1];
            change = `
                <div class="cycle-saved-change">
                    <div class="cycle-saved-line"><span>下次预测</span></div>
                    <div class="cycle-saved-line" style="margin-top:3px">
                        ${same
                            ? `<span class="is-new">${esc(cycleFmtShort(after.range[0]))} – ${esc(cycleFmtShort(after.range[1]))}</span>`
                            : `<span class="is-old">${esc(cycleFmtShort(before.range[0]))} – ${esc(cycleFmtShort(before.range[1]))}</span><span class="is-arrow">→</span><span class="is-new">${esc(cycleFmtShort(after.range[0]))} – ${esc(cycleFmtShort(after.range[1]))}</span>`}
                    </div>
                    <div style="margin-top:5px;color:#8c5f6b;font-size:.64rem">样本变了，算法重新选了一次</div>
                </div>`;
        }

        body.innerHTML = `
            <div class="cycle-saved-title">${kind === 'end' ? '记好了' : '记好了'}</div>
            <p class="cycle-saved-sub">${esc(entry ? `${cycleFmtLong(entry.start)} · ${cycleWeekday(entry.start)}` : '')}</p>
            <div class="cycle-saved-rows">
                ${rows.map(([label, value]) => `<div class="cycle-saved-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}
            </div>
            ${change}
            <div class="cycle-saved-actions">
                <button class="cycle-btn ghost" type="button" data-cycle-saved="undo">撤销</button>
                <button class="cycle-btn primary" type="button" data-cycle-saved="close">知道了</button>
            </div>`;
        dialog.classList.add('is-open');
        dialog.setAttribute('aria-hidden', 'false');
        ui.lastSaved = { kind, before, entry };
    }

    function closeSavedDialog() {
        const dialog = $('cycle-saved-dialog');
        if (!dialog) return;
        dialog.classList.remove('is-open');
        dialog.setAttribute('aria-hidden', 'true');
    }

    async function undoLastSaved() {
        const saved = ui.lastSaved;
        closeSavedDialog();
        if (!saved || !saved.entry) return;
        try {
            await removeCyclePeriod(saved.entry.id);
            await load(true);
            render();
            toast('已经撤销了');
        } catch (error) {
            console.error('撤销失败:', error);
            toast('撤销失败，稍后再试');
        }
    }

    /* ---------- actions ---------- */

    async function guard(task, busyText) {
        if (ui.busy) return;
        ui.busy = true;
        if (busyText) toast(busyText);
        try {
            await task();
        } catch (error) {
            console.error('生理期操作失败:', error);
            toast(error && error.message ? error.message : '操作失败，稍后再试');
        } finally {
            ui.busy = false;
        }
    }

    async function handleAction(action) {
        if (!action) return;
        if (action === 'start') {
            await load();
            const active = cycleActivePeriod(ui.items, today());
            if (active) {
                await handleAction('end');
                return;
            }
            openRecordSheet('ask');
            return;
        }
        if (action === 'backfill') {
            await load();
            openRecordSheet('backfill');
            return;
        }
        if (action === 'edit-active') {
            const active = cycleActivePeriod(ui.items, today());
            if (active) openRecordDetail(active.id);
            return;
        }
        if (action === 'end') {
            await guard(async () => {
                const result = await endCycleToday({ now: new Date() });
                const before = ui.prediction;
                apply(result.state);
                const entry = result.state.items.find(item => item.id === (result.entry && result.entry.id));
                openEditResult({ ...result.state, entry }, 'end', before);
                toast('已记下结束');
            });
            return;
        }
        if (action === 'import') {
            openImport();
        }
    }

    async function saveNewRecord() {
        const body = $('cycle-record-body');
        if (!body) return;
        const startEl = $('cycle-start-input');
        const endEl = $('cycle-end-input');
        const start = startEl && startEl.value;
        const end = endEl && endEl.value;
        if (!start) { toast('选一个开始日期'); return; }
        if (end && end < start) { toast('结束日期不能早于开始'); return; }
        const uncertain = body.dataset.uncertain === '1';
        await guard(async () => {
            const before = ui.prediction;
            const saved = await addCyclePeriod({ start, end, uncertain });
            apply(saved);
            const entry = saved.items.find(item => item.start === start);
            closeSheet('cycle-record-sheet');
            openEditResult({ ...saved, entry }, 'new', before);
            toast('已记录');
        }, '保存中…');
    }

    /* ---------- day sheet ---------- */

    function openDaySheet(key) {
        const body = $('cycle-day-body');
        if (!body || !key) return;
        const now = today();
        const period = ui.items.find(item => item.start === key);
        const inside = ui.items.find(item => {
            if (!item.end) return false;
            return key >= item.start && key <= item.end;
        });
        const active = cycleActivePeriod(ui.items, now);
        const isFuture = key > cycleDayKey(now);
        const prediction = ui.prediction;

        let stateLabel = '普通的一天';
        if (period) {
            stateLabel = cycleIsActive(period, now) ? '经期中 · 开始日' : '已记录的经期 · 开始日';
        } else if (inside) {
            stateLabel = '已记录的经期中';
        } else if (prediction && prediction.status === 'ok' && key >= prediction.range[0] && key <= prediction.range[1]) {
            stateLabel = prediction.overdueDays > 0 ? '当时预计的经期 · 已过期' : '预测中的一天 · 未记录';
        }

        const ovu = cycleOvulation(prediction);
        const isOvu = ovu && key >= ovu.from && key <= ovu.to;
        if (!period && !inside && isOvu) {
            stateLabel = key === ovu.day ? '推算的排卵日 · 参考值' : '排卵期 · 参考值';
        }

        body.innerHTML = `
            <div class="cycle-sheet-title">${esc(cycleFmtLong(key))} <span style="font-size:.7rem;color:var(--muted);font-family:var(--font-body)">${esc(cycleWeekday(key))}</span></div>
            <p class="cycle-sheet-sub">${esc(stateLabel)}</p>
            ${isOvu && !period ? `
                <div class="cycle-card" style="margin-top:10px">
                    <div class="cycle-kv"><span>依据</span><b>下次预计开始日 − 14 天</b></div>
                    <div class="cycle-kv"><span>排卵期</span><b>${esc(cycleFmtShort(ovu.from))} – ${esc(cycleFmtShort(ovu.to))}</b></div>
                    <div class="cycle-kv"><span>准确度</span><b style="color:#a4434f">比经期预测更不可靠</b></div>
                    <p class="cycle-note">这是按周期长度推算的，不是测出来的。不能用来自行判断避孕或备孕；需要精确判断请用试纸或咨询医生。</p>
                </div>` : ''}
            ${period ? `
                <div class="cycle-actions" style="margin-top:12px">
                    <button class="cycle-opt" type="button" data-cycle-day-edit="${esc(period.id)}">
                        <span class="cycle-opt-icon">✎</span>
                        <span class="cycle-opt-main"><b>修改这次记录</b><span class="cycle-opt-sub">日期、流量、症状</span></span>
                    </button>
                    <button class="cycle-opt is-danger" type="button" data-cycle-day-remove="${esc(period.id)}">
                        <span class="cycle-opt-icon">⌫</span>
                        <span class="cycle-opt-main"><b>删除这次记录</b><span class="cycle-opt-sub">整段一起删掉</span></span>
                    </button>
                </div>` : `
                <div class="cycle-actions" style="margin-top:12px">
                    <button class="cycle-opt is-primary" type="button" data-cycle-day-set="start" data-day="${esc(key)}">
                        <span class="cycle-opt-icon">✓</span>
                        <span class="cycle-opt-main"><b>这天开始的</b><span class="cycle-opt-sub">记为经期开始日</span></span>
                    </button>
                    <button class="cycle-opt" type="button" data-cycle-day-set="middle" data-day="${esc(key)}">
                        <span class="cycle-opt-icon">＋</span>
                        <span class="cycle-opt-main"><b>这天是经期中的一天</b><span class="cycle-opt-sub">会把前后合并成一次</span></span>
                    </button>
                    ${!isFuture ? '' : ''}
                </div>`}
            ${active && active.start !== key && !period ? '' : ''}`;
        openSheet('cycle-day-sheet');
    }

    function openRecordDetail(id) {
        const period = ui.items.find(item => item.id === id);
        if (!period) return;
        const body = $('cycle-record-body');
        if (!body) return;
        const symptoms = ['腹痛', '腰酸', '头痛', '乏力', '情绪低'];
        body.innerHTML = `
            <div class="cycle-sheet-title">修改记录</div>
            <p class="cycle-sheet-sub">${esc(cycleFmtLong(period.start))} 开始${period.source === 'import' ? ' · 美柚导入' : ''}</p>
            <div class="cycle-date-row">
                <div class="cycle-date-field">
                    <label for="cycle-edit-start">开始</label>
                    <input id="cycle-edit-start" type="date" value="${esc(period.start)}">
                </div>
                <div class="cycle-date-field">
                    <label for="cycle-edit-end">结束（可空）</label>
                    <input id="cycle-edit-end" type="date" value="${esc(period.end)}">
                </div>
            </div>
            <p class="cycle-sheet-sub" style="margin-top:12px">流量</p>
            <div class="cycle-chips" data-cycle-flow>
                ${[['', '未记录'], ['light', '少'], ['normal', '正常'], ['heavy', '多']].map(([value, label]) => `
                    <button class="cycle-chip${(period.flow || '') === value ? ' is-on' : ''}" type="button" data-flow-value="${value}">${label}</button>
                `).join('')}
            </div>
            <p class="cycle-sheet-sub" style="margin-top:12px">症状（可多选）</p>
            <div class="cycle-chips" data-cycle-symptoms>
                ${symptoms.map(name => `
                    <button class="cycle-chip${period.symptoms.includes(name) ? ' is-on' : ''}" type="button" data-symptom-value="${esc(name)}">${esc(name)}</button>
                `).join('')}
            </div>
            <div class="cycle-actions" style="margin-top:14px">
                <button class="cycle-btn primary" type="button" data-cycle-opt="save-edit" id="cycle-save-edit">保存</button>
            </div>`;
        body.dataset.editingId = id;
        body.dataset.flow = period.flow || '';
        body.dataset.symptoms = JSON.stringify(period.symptoms);
        openSheet('cycle-record-sheet');
    }

    async function saveEditRecord() {
        const body = $('cycle-record-body');
        if (!body) return;
        const id = body.dataset.editingId;
        const start = ($('cycle-edit-start') || {}).value;
        const end = ($('cycle-edit-end') || {}).value;
        const flow = body.dataset.flow || '';
        let symptoms = [];
        try { symptoms = JSON.parse(body.dataset.symptoms || '[]'); } catch (error) { symptoms = []; }
        if (!start) { toast('选一个开始日期'); return; }
        if (end && end < start) { toast('结束日期不能早于开始'); return; }
        await guard(async () => {
            const saved = await updateCyclePeriod(id, { start, end, flow, symptoms });
            apply(saved);
            closeSheet('cycle-record-sheet');
            closeSheet('cycle-day-sheet');
            toast('已更新');
        }, '保存中…');
    }

    /* ---------- import ---------- */

    function openImport() {
        const body = $('cycle-import-body');
        if (!body) return;
        ui.importStep = 'pick';
        ui.importFile = null;
        ui.importTable = null;
        ui.importMapping = null;
        ui.importEntries = null;
        renderImport();
        openSheet('cycle-import-sheet');
    }

    function renderImport() {
        const body = $('cycle-import-body');
        if (!body) return;
        const step = ui.importStep;

        if (step === 'pick') {
            body.innerHTML = `
                <div class="cycle-steps"><i class="is-on"></i><i></i><i></i></div>
                <div class="cycle-sheet-title">从美柚导入</div>
                <p class="cycle-sheet-sub">在美柚里打开「记录 → 分析 → 导出数据」，把文件保存到手机，再从这里选。</p>
                <button class="cycle-drop" type="button" data-cycle-import="file" style="width:100%;margin-top:12px">
                    <b>选择文件</b>
                    <small>支持 .xlsx / .csv · 只在浏览器里解析</small>
                </button>
                <input id="cycle-import-file" type="file" accept=".xlsx,.xls,.csv,text/csv" hidden>
                <div class="cycle-card" style="margin-top:12px">
                    <div class="cycle-card-head">文件不会离开这台设备</div>
                    <p class="cycle-note">解析在本地完成，只有你确认后的经期记录会写入空间。原始文件不保存、不上传。</p>
                </div>
                <div class="cycle-banner" style="margin-top:12px">找不到导出入口也没关系，可以直接手动补录最近 3–6 次，预测一样能跑起来。</div>
                <div class="cycle-actions" style="margin-top:12px">
                    <button class="cycle-btn ghost" type="button" data-cycle-action="backfill">手动补录</button>
                </div>`;
            return;
        }

        if (step === 'map') {
            const headers = ui.importTable.headers;
            const mapping = ui.importMapping;
            body.innerHTML = `
                <div class="cycle-steps"><i class="is-on"></i><i class="is-on"></i><i></i></div>
                <div class="cycle-sheet-title">确认字段</div>
                <p class="cycle-sheet-sub">自动识别了 ${mapping.filter(Boolean).length} 个字段。对不上的可以手动改。</p>
                <div class="cycle-card" style="margin-top:12px">
                    ${headers.map((header, index) => `
                        <div class="cycle-map-row">
                            <span class="cycle-map-src" title="${esc(header)}">${esc(header || `第 ${index + 1} 列`)}</span>
                            <span class="cycle-map-arrow">→</span>
                            <select class="cycle-map-select" data-cycle-map="${index}">
                                <option value="">忽略</option>
                                ${CYCLE_IMPORT_FIELDS.map(field => `
                                    <option value="${field.id}" ${mapping[index] === field.id ? 'selected' : ''}>${esc(field.label)}</option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
                <div class="cycle-banner is-warn" style="margin-top:12px">「预测」一类的列不要映射进来——那是美柚的推算，不是发生过的事实。</div>
                <div class="cycle-actions" style="margin-top:12px">
                    <button class="cycle-btn primary" type="button" data-cycle-import="preview">下一步 · 预览</button>
                </div>`;
            return;
        }

        if (step === 'preview') {
            const result = ui.importEntries || { entries: [], bad: 0 };
            const first = result.entries.slice(0, 3);
            body.innerHTML = `
                <div class="cycle-steps"><i class="is-on"></i><i class="is-on"></i><i class="is-on"></i></div>
                <div class="cycle-sheet-title">预览</div>
                <p class="cycle-sheet-sub">识别出 ${result.entries.length} 次经期（${result.shape === 'day' ? '按每日记录合并' : '按开始/结束列'}）。</p>
                <div class="cycle-card" style="margin-top:12px">
                    <div class="cycle-kv"><span>可导入</span><b>${result.entries.length} 次</b></div>
                    <div class="cycle-kv"><span>最早</span><b>${esc(result.entries.length ? result.entries[0].start : '—')}</b></div>
                    <div class="cycle-kv"><span>最晚</span><b>${esc(result.entries.length ? result.entries[result.entries.length - 1].start : '—')}</b></div>
                    <div class="cycle-kv"><span>格式异常</span><b>${result.bad ? `${result.bad} 行（已忽略）` : '无'}</b></div>
                </div>
                ${first.length ? `
                    <div class="cycle-card" style="margin-top:10px">
                        <div class="cycle-card-head">最前面 ${first.length} 条</div>
                        <div class="cycle-records">
                            ${first.map(entry => `
                                <div class="cycle-record is-import">
                                    <span class="cycle-record-dot"></span>
                                    <span class="cycle-record-main">
                                        <b>${esc(entry.start)}${entry.end ? ` – ${esc(entry.end)}` : ''}</b>
                                        <small>${entry.end ? cycleDiffDays(entry.start, entry.end) + 1 + ' 天' : '单日'}</small>
                                    </span>
                                </div>`).join('')}
                        </div>
                    </div>` : ''}
                <div class="cycle-actions" style="margin-top:12px">
                    <button class="cycle-btn primary" type="button" data-cycle-import="commit" ${result.entries.length ? '' : 'disabled'}>导入 ${result.entries.length} 次</button>
                </div>
                <p class="cycle-note" style="text-align:center">开始日期相同即视为同一次，已存在的会跳过</p>`;
        }
    }

    async function readImportFile(file) {
        if (!file) return;
        await guard(async () => {
            const rows = await cycleImportReadTable(file);
            ui.importFile = file;
            ui.importTable = cycleImportAnalyze(rows);
            ui.importMapping = ui.importTable.mapping.slice();
            ui.importStep = 'map';
            renderImport();
        }, '解析中…');
    }

    function buildPreview() {
        const table = ui.importTable;
        if (!table) return;
        const result = cycleImportBuildEntries(table.headers, ui.importMapping, table.body);
        ui.importEntries = result;
        ui.importStep = 'preview';
        renderImport();
    }

    async function commitImport() {
        const result = ui.importEntries;
        if (!result || !result.entries.length) return;
        await guard(async () => {
            const saved = await importCyclePeriods(result.entries);
            apply(saved.state);
            closeSheet('cycle-import-sheet');
            toast(`导入了 ${saved.added} 次，跳过 ${saved.skipped} 次`);
        }, '导入中…');
    }

    /* ---------- render entry points ---------- */

    function renderSubPageIfOpen() {
        if (!$('me-sub-body')) return;
        renderSubPage();
    }

    function setView(view) {
        ui.view = view;
        renderSubPage();
    }

    function shiftMonth(delta) {
        const meta = monthMeta();
        const date = new Date(meta.year, meta.month + delta, 1);
        ui.month = { year: date.getFullYear(), month: date.getMonth() };
        renderSubPage();
    }

    /* ---------- events ---------- */

    function bind() {
        document.addEventListener('click', async event => {
            const target = event.target;

            const strip = target.closest('#cycle-strip');
            if (strip) {
                await handleAction(strip.dataset.cycleAction || 'start');
                return;
            }

            if (target.closest('#cycle-push-warning-action')) {
                await handleAction('start');
                return;
            }

            const viewBtn = target.closest('[data-cycle-view]');
            if (viewBtn) {
                setView(viewBtn.dataset.cycleView);
                return;
            }

            const whyToggle = target.closest('[data-cycle-why-toggle]');
            if (whyToggle) {
                const panel = $('cycle-why');
                if (panel) {
                    const open = panel.hidden;
                    panel.hidden = !open;
                    whyToggle.textContent = open ? '收起 ›' : '为什么 ›';
                }
                return;
            }

            const monthBtn = target.closest('[data-cycle-month]');
            if (monthBtn) {
                shiftMonth(Number(monthBtn.dataset.cycleMonth));
                return;
            }

            const actionBtn = target.closest('[data-cycle-action]');
            if (actionBtn && !strip) {
                event.preventDefault();
                closeSheet('cycle-day-sheet');
                await handleAction(actionBtn.dataset.cycleAction);
                return;
            }

            const dayBtn = target.closest('[data-cycle-day]');
            if (dayBtn) {
                openDaySheet(dayBtn.dataset.cycleDay);
                return;
            }

            const recordBtn = target.closest('[data-cycle-record]');
            if (recordBtn) {
                openRecordDetail(recordBtn.dataset.cycleRecord);
                return;
            }

            const opt = target.closest('[data-cycle-opt]');
            if (opt) {
                const mode = opt.dataset.cycleOpt;
                if (mode === 'today') {
                    closeSheet('cycle-record-sheet');
                    await guard(async () => {
                        const result = await startCycleToday({ now: new Date() });
                        const before = ui.prediction;
                        apply(result.state);
                        const entry = result.state.items.find(item => item.id === (result.entry && result.entry.id));
                        openEditResult({ ...result.state, entry }, 'new', before);
                        toast('已记录');
                    }, '保存中…');
                    return;
                }
                if (mode === 'backfill') {
                    openRecordSheet('backfill');
                    return;
                }
                if (mode === 'save') {
                    await saveNewRecord();
                    return;
                }
                if (mode === 'save-edit') {
                    await saveEditRecord();
                    return;
                }
            }

            const quick = target.closest('[data-cycle-quick-day]');
            if (quick) {
                const input = $('cycle-start-input');
                if (input) input.value = quick.dataset.cycleQuickDay;
                quick.parentElement.querySelectorAll('.cycle-chip').forEach(chip => chip.classList.remove('is-on'));
                quick.classList.add('is-on');
                const body = $('cycle-record-body');
                if (body) body.dataset.uncertain = '';
                return;
            }

            const uncertain = target.closest('[data-cycle-quick-uncertain]');
            if (uncertain) {
                const body = $('cycle-record-body');
                if (body) body.dataset.uncertain = body.dataset.uncertain === '1' ? '' : '1';
                uncertain.classList.toggle('is-on');
                return;
            }

            const flowChip = target.closest('[data-flow-value]');
            if (flowChip) {
                const body = $('cycle-record-body');
                if (body) body.dataset.flow = flowChip.dataset.flowValue || '';
                flowChip.parentElement.querySelectorAll('.cycle-chip').forEach(chip => chip.classList.remove('is-on'));
                flowChip.classList.add('is-on');
                return;
            }

            const symptomChip = target.closest('[data-symptom-value]');
            if (symptomChip) {
                const body = $('cycle-record-body');
                if (!body) return;
                let list = [];
                try { list = JSON.parse(body.dataset.symptoms || '[]'); } catch (error) { list = []; }
                const name = symptomChip.dataset.symptomValue;
                list = list.includes(name) ? list.filter(item => item !== name) : [...list, name];
                body.dataset.symptoms = JSON.stringify(list);
                symptomChip.classList.toggle('is-on');
                return;
            }

            const setDay = target.closest('[data-cycle-day-set]');
            if (setDay) {
                const day = setDay.dataset.day;
                const kind = setDay.dataset.cycleDaySet;
                closeSheet('cycle-day-sheet');
                await guard(async () => {
                    const before = ui.prediction;
                    const saved = kind === 'middle'
                        ? await markCycleDay(day)
                        : await addCyclePeriod({ start: day });
                    apply(saved);
                    const entry = saved.items.find(item => item.start === day)
                        || saved.items.find(item => item.start <= day && (item.end || item.start) >= day);
                    openEditResult({ ...saved, entry }, 'new', before);
                    toast(kind === 'middle' ? '已并进这一次' : '已记录');
                }, '保存中…');
                return;
            }

            const editDay = target.closest('[data-cycle-day-edit]');
            if (editDay) {
                closeSheet('cycle-day-sheet');
                openRecordDetail(editDay.dataset.cycleDayEdit);
                return;
            }

            const removeDay = target.closest('[data-cycle-day-remove]');
            if (removeDay) {
                const id = removeDay.dataset.cycleDayRemove;
                const ok = await confirmDialog('删除这次记录？', '整段经期会一起删掉，预测会重新算。', '删除');
                if (!ok) return;
                closeSheet('cycle-day-sheet');
                await guard(async () => {
                    const saved = await removeCyclePeriod(id);
                    apply(saved);
                    toast('已删除');
                }, '删除中…');
                return;
            }

            const importBtn = target.closest('[data-cycle-import]');
            if (importBtn) {
                const step = importBtn.dataset.cycleImport;
                if (step === 'file') {
                    const input = $('cycle-import-file');
                    if (input) input.click();
                    return;
                }
                if (step === 'preview') {
                    await guard(async () => buildPreview(), '');
                    return;
                }
                if (step === 'commit') {
                    await commitImport();
                }
                return;
            }

            const savedBtn = target.closest('[data-cycle-saved]');
            if (savedBtn) {
                if (savedBtn.dataset.cycleSaved === 'undo') await undoLastSaved();
                else closeSavedDialog();
                return;
            }
        });

        document.addEventListener('change', event => {
            const mapSelect = event.target.closest('[data-cycle-map]');
            if (mapSelect) {
                const index = Number(mapSelect.dataset.cycleMap);
                ui.importMapping[index] = mapSelect.value;
                return;
            }

            const fileInput = event.target.closest('#cycle-import-file');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                readImportFile(fileInput.files[0]);
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            const dialog = $('cycle-saved-dialog');
            if (dialog && dialog.classList.contains('is-open')) closeSavedDialog();
        });
    }

    /* Reuse the app's own confirmation dialog so the styling and the
       Escape / backdrop behaviour stay in one place. */
    function confirmDialog(title, message, okLabel) {
        if (typeof showConfirm !== 'function') return Promise.resolve(false);
        return showConfirm({ title, message, okText: okLabel || '确认', danger: true });
    }

    /* ---------- boot ---------- */

    function boot() {
        bind();
        load().then(() => render()).catch(() => {
            // A failed read leaves the strip hidden; the 空间 row still opens
            // and shows its own empty state.
        });
    }

    return {
        boot,
        load,
        reload: () => load(true).then(() => render()),
        renderStrip,
        render: renderSubPage,
        renderSubPage: renderSubPageIfOpen,
        openDaySheet,
        setView,
        onMeView: view => {
            if (view === 'cycle') {
                renderSubPage();
                load().then(() => renderSubPage()).catch(() => {});
            }
        },
        ui
    };
})();

if (typeof window !== 'undefined') window.CycleUI = CycleUI;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CycleUI.boot());
} else {
    CycleUI.boot();
}
