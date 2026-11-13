/* ============================================================
   生理期 · 美柚导出文件解析
   Runs entirely in the browser: the file never leaves the device.
   Two shapes are supported:
     1. one row per period  (columns: start / end)
     2. one row per day     (columns: date / flow, merged on the fly)
   The header words are guesses; the mapping step lets her fix them.
   ============================================================ */

const CYCLE_IMPORT_FIELDS = [
    { id: 'start', label: '开始日期', required: true },
    { id: 'end', label: '结束日期', required: false },
    { id: 'date', label: '日期（一天一行）', required: false },
    { id: 'flow', label: '流量', required: false },
    { id: 'symptoms', label: '症状', required: false }
];

const CYCLE_IMPORT_HINTS = {
    start: ['开始日期', '开始时间', '起始', '开始', 'start', 'begin', '经期开始'],
    end: ['结束日期', '结束时间', '结束', 'end', '经期结束'],
    date: ['日期', '记录日期', 'date', 'day', '时间'],
    flow: ['流量', '量', '经血量', 'flow', '血量'],
    symptoms: ['症状', '不适', 'symptom']
};

function cycleImportGuessField(header) {
    const text = String(header || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!text) return '';
    const found = Object.keys(CYCLE_IMPORT_HINTS).find(field =>
        CYCLE_IMPORT_HINTS[field].some(hint => text.includes(hint.toLowerCase())));
    return found || '';
}

function cycleImportNormalizeDay(value) {
    if (value == null || value === '') return '';
    if (value instanceof Date && !isNaN(value.getTime())) return cycleDayKey(value);
    if (typeof value === 'number' && value > 20000 && value < 60000) {
        // Excel serial date (1900 epoch). Local midnight, no UTC drift.
        const ms = Math.round((value - 25569) * 86400000);
        const date = new Date(ms);
        return cycleDayKey(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    const text = String(value).trim();
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
    const parsed = cycleParseDay(text);
    return parsed ? cycleDayKey(parsed) : '';
}

function cycleImportSplitCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        if (quoted) {
            if (ch === '"') {
                if (source[i + 1] === '"') { cell += '"'; i += 1; }
                else quoted = false;
            } else {
                cell += ch;
            }
            continue;
        }
        if (ch === '"') { quoted = true; continue; }
        if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; continue; }
        if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
        cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(line => line.some(value => String(value).trim() !== ''));
}

async function cycleImportReadTable(file) {
    const name = String((file && file.name) || '').toLowerCase();
    const isExcel = /\.(xlsx|xls)$/.test(name);

    if (!isExcel) {
        const text = await file.text();
        return cycleImportSplitCSV(text);
    }

    if (typeof XLSX === 'undefined') {
        await loadScript(CYCLE_XLSX_SRC);
    }
    if (typeof XLSX === 'undefined') throw new Error('表格组件加载失败，请换成 CSV 再试');
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error('这个文件里没有可读的工作表');
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false, defval: '' });
}

/* Map the header row onto our fields. Returns { headers, mapping }. */
function cycleImportAnalyze(rows) {
    const table = Array.isArray(rows) ? rows.filter(row => row && row.some(cell => String(cell).trim() !== '')) : [];
    if (table.length < 2) throw new Error('文件里没有足够的数据行');
    const headers = table[0].map(cell => String(cell == null ? '' : cell).trim());
    const mapping = headers.map(header => cycleImportGuessField(header));
    const body = table.slice(1);
    return { headers, mapping, body };
}

function cycleImportBuildEntries(headers, mapping, body) {
    const indexOf = field => mapping.findIndex(fieldId => fieldId === field);
    const startAt = indexOf('start');
    const endAt = indexOf('end');
    const dateAt = indexOf('date');
    const flowAt = indexOf('flow');
    const symptomAt = indexOf('symptoms');
    const dayShape = startAt < 0 && dateAt >= 0;
    if (startAt < 0 && dateAt < 0) throw new Error('至少要把「开始日期」或「日期」对上');

    const flowWord = value => {
        const text = String(value == null ? '' : value).trim();
        if (!text || text === '0') return '';
        if (/少|light|少|点状/i.test(text)) return 'light';
        if (/多|heavy/i.test(text)) return 'heavy';
        return 'normal';
    };

    if (!dayShape) {
        const entries = [];
        const bad = [];
        body.forEach(row => {
            const start = cycleImportNormalizeDay(row[startAt]);
            if (!start) {
                if (row.some(cell => String(cell).trim() !== '')) bad.push(row);
                return;
            }
            const end = endAt >= 0 ? cycleImportNormalizeDay(row[endAt]) : '';
            const entry = { start, end: end && end >= start ? end : '', source: 'import' };
            if (flowAt >= 0) entry.flow = flowWord(row[flowAt]);
            if (symptomAt >= 0) {
                const text = String(row[symptomAt] == null ? '' : row[symptomAt]).trim();
                entry.symptoms = text ? text.split(/[、,，/\s]+/).filter(Boolean).slice(0, 8) : [];
            }
            entries.push(entry);
        });
        return { entries, bad: bad.length, shape: 'period' };
    }

    /* One row per day: keep days with a flow marker, then merge runs. */
    const marked = [];
    const bad = [];
    body.forEach(row => {
        const day = cycleImportNormalizeDay(row[dateAt]);
        if (!day) {
            if (row.some(cell => String(cell).trim() !== '')) bad.push(row);
            return;
        }
        const flow = flowAt >= 0 ? flowWord(row[flowAt]) : '';
        if (flowAt >= 0 && !flow) return;
        marked.push({ day, flow });
    });
    marked.sort((a, b) => a.day.localeCompare(b.day));

    const entries = [];
    let current = null;
    marked.forEach(item => {
        if (current && cycleDiffDays(current.end, item.day) <= 1) {
            current.end = item.day;
            if (!current.flows[item.flow]) current.flows[item.flow] = 0;
            current.flows[item.flow] += 1;
            return;
        }
        if (current) entries.push(finishRun(current));
        current = { start: item.day, end: item.day, flows: { [item.flow || 'normal']: 1 } };
    });
    if (current) entries.push(finishRun(current));

    return { entries, bad: bad.length, shape: 'day' };

    function finishRun(run) {
        const ranked = Object.entries(run.flows).sort((a, b) => b[1] - a[1]);
        return { start: run.start, end: run.end === run.start ? '' : run.end, flow: ranked[0] && ranked[0][0] !== 'normal' ? ranked[0][0] : '', source: 'import' };
    }
}
