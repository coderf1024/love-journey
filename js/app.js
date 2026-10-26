/* ============================================================
   恋爱空间 — front-of-house app
   index.html only. Data comes from js/store.js (OSS documents).
   ============================================================ */

let config = {};
let massageCouponsData = [];
let timerInterval = null;
let myChart = null;

const CDN = {
    echarts: 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
    qrcode: 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
};

const MUSIC_SRC = 'assets/media/xiaomeiman.mp3?v=20261026-04';
const MINUTE = 60 * 1000;
const ORDER_POLL_MS = 20 * 1000;
const KITCHEN_STEPS = ['下单', '接单', '备菜', '制作', '出餐'];
const KITCHEN_STEP_INDEX = {
    pending: 0,
    accepted: 1,
    prepping: 2,
    cooking: 3,
    served: 4,
    completed: 4
};

const KITCHEN_COPY = {
    pending: { title: '周末的饭，等大厨接单', note: '大厨看到后会先接单', emoji: '📝' },
    accepted: { title: '大厨接单啦，周末见', note: '到了饭点大厨会开始准备', emoji: '🤝' },
    prepping: { title: '大厨系上围裙，正在备菜', note: '洗菜、切菜，马上开火', emoji: '🥬' },
    cooking: { title: '锅里滋滋响，香味出来了', note: '再等一会儿就能开饭', emoji: '🍳' },
    served: { title: '出餐啦，快来吃饭', note: '今天的饭要趁热吃', emoji: '🍽️' },
    completed: { title: '一餐圆满', note: '碗我来洗', emoji: '🫧' },
    cancelled: { title: '这单取消了', note: '恋爱币已经退回钱包', emoji: '🥀' }
};

const KITCHEN_TOAST = {
    accepted: '大厨接单啦',
    prepping: '大厨开始备菜啦',
    cooking: '下锅啦，香味要出来了',
    served: '出餐啦，快来吃饭',
    completed: '一餐圆满',
    cancelled: '这单取消了'
};

const cityCoordinates = {
    '北京': { value: [116.4074, 39.9042] },
    '上海': { value: [121.4737, 31.2304] },
    '广州': { value: [113.2644, 23.1291] },
    '深圳': { value: [114.0579, 22.5431] },
    '成都': { value: [104.0668, 30.5728] },
    '重庆': { value: [106.9123, 29.4316] },
    '杭州': { value: [120.1551, 30.2741] },
    '南京': { value: [118.7969, 32.0603] },
    '武汉': { value: [114.3055, 30.5928] },
    '西安': { value: [108.9398, 34.3416] },
    '天津': { value: [117.2010, 39.0842] },
    '苏州': { value: [120.5853, 31.2990] },
    '青岛': { value: [120.3826, 36.0671] },
    '大连': { value: [121.6147, 38.9140] },
    '厦门': { value: [118.0894, 24.4798] },
    '长沙': { value: [112.9388, 28.2282] },
    '昆明': { value: [102.7183, 25.0389] },
    '贵阳': { value: [106.6302, 26.6470] },
    '南宁': { value: [108.3665, 22.8170] },
    '海口': { value: [110.3493, 20.0174] },
    '三亚': { value: [109.5119, 18.2528] },
    '拉萨': { value: [91.1000, 29.6500] },
    '乌鲁木齐': { value: [87.6168, 43.8256] },
    '哈尔滨': { value: [126.5350, 45.8038] },
    '沈阳': { value: [123.4315, 41.8057] },
    '长春': { value: [125.3235, 43.8171] },
    '济南': { value: [117.1201, 36.6512] },
    '郑州': { value: [113.6253, 34.7466] },
    '合肥': { value: [117.2272, 31.8206] },
    '福州': { value: [119.2965, 26.0745] },
    '台北': { value: [121.5654, 25.0330] },
    '香港': { value: [114.1694, 22.3193] },
    '澳门': { value: [113.5439, 22.1987] },
    '大同': { value: [113.2950, 40.0903] },
    '延吉': { value: [129.5130, 42.8893] },
    '张家口': { value: [114.8869, 40.8118] },
    '古北水镇': { value: [117.2673, 40.6502] },
    '乌兰察布': { value: [113.1146, 40.9945] },
    '都江堰': { value: [103.6175, 31.0040] },
    '石家庄': { value: [114.5149, 38.0423] },
    '太原': { value: [112.5492, 37.8570] },
    '呼和浩特': { value: [111.7492, 40.8426] },
    '南昌': { value: [115.8579, 28.6829] },
    '银川': { value: [106.2309, 38.4872] },
    '西宁': { value: [101.7782, 36.6171] },
    '兰州': { value: [103.8343, 36.0611] },
    '东京': { value: [139.6503, 35.6762] },
    '首尔': { value: [126.9780, 37.5665] },
    '济州岛': { value: [126.5312, 33.3617] },
    '新加坡': { value: [103.8198, 1.3521] },
    '吉隆坡': { value: [101.6869, 3.1390] },
    '马累': { value: [73.5, 4.2] },
    '迪拜': { value: [55.2708, 25.2048] }
};

const MOTIFS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.4-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5.2-7.5 9.6-7.5 9.6Z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><circle cx="12" cy="13.5" r="3.2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 18 5.5-9 3.5 5.5L15 10l6 8Z"/><circle cx="17.5" cy="6" r="1.8"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4 3 10.5l6.5 2.5L12 20l3.5-6L21 4Z"/><path d="m9.5 13 2.5-2.5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3Z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/></svg>'
];

const state = {
    page: 'home',
    filter: 'all',
    milestones: [],
    goals: [],
    cities: [],
    coupons: [],
    space: null,
    wallet: { balance: 0, overdraftLimit: 50, entries: [] },
    menu: { categories: [], dishes: [] },
    orders: [],
    slots: [],
    selectedSlotKey: null,
    selectedOrder: null,
    menuCategory: 'all',
    meView: 'menu',
    meOrderFilter: 'all',
    meCardFilter: 'all',
    meOrderId: null,
    cart: new Set(),
    cartSlotKey: null,
    orderPollTimer: null,
    confirmResolver: null,
    memoryIndex: -1,
    lastLoadedAt: 0,
    refreshing: false,
    wishUploading: false,
    mapRoam: false,
    mapStatus: 'idle', // idle | loading | ready | error
    openSheets: [],
    toastTimer: null
};

/* ---------- tiny helpers ---------- */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function cleanText(value) {
    return escapeHTML(String(value == null ? '' : value).trim());
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const text = String(value);
    const date = text.includes('T') ? new Date(text) : new Date(text.replace(/-/g, '/'));
    return isNaN(date.getTime()) ? null : date;
}

function formatDate(value, withTime) {
    const date = parseDate(value);
    if (!date) return '';
    const day = `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
    if (!withTime) return day;
    return `${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function dateYear(value) {
    const date = parseDate(value);
    return date ? date.getFullYear() : '';
}

function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

function loadScript(src) {
    if (loadScript.cache[src]) return loadScript.cache[src];
    loadScript.cache[src] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
            delete loadScript.cache[src];
            reject(new Error(`加载失败: ${src}`));
        };
        document.head.appendChild(script);
    });
    return loadScript.cache[src];
}
loadScript.cache = {};

function storageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
}

function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* private mode */ }
}

/* ---------- data ---------- */

async function loadConfig() {
    return bootstrap();
}

async function bootstrap() {
    const errorCard = $('boot-error');
    try {
        if (typeof loadAppData !== 'function') {
            throw new Error('页面脚本版本不一致，请强制刷新一下：电脑按 Ctrl/Cmd + Shift + R，手机请关闭页面重新打开。');
        }
        if (errorCard) errorCard.hidden = true;
        const data = await loadAppData();
        applyAppData(data);
        applyOrderDeepLink();
        await refreshSelectedOrder();
        state.lastLoadedAt = Date.now();
        renderAll();
    } catch (error) {
        console.error('加载恋爱空间失败:', error);
        if (errorCard) {
            errorCard.hidden = false;
            const message = $('boot-error-message');
            const title = $('boot-error-title');
            let text = error && error.message
                ? error.message
                : '检查一下网络，然后再试一次吧。';

            if (/is not defined|版本不一致/.test(text)) {
                text = '页面脚本版本不一致，点下面的按钮重新加载一次就好（会强制获取最新脚本）。';
                if (title) title.textContent = '页面需要刷新一次';
            }
            if (message) message.textContent = text;
        }
    }
}

function applyAppData(data) {
    state.space = data.space || null;
    state.wallet = data.wallet || state.wallet;
    state.menu = data.menu || state.menu;
    state.orders = data.orders || [];
    state.cities = data.cities || [];
    state.coupons = data.coupons || [];

    config = {
        space: state.space,
        loveStory: data.story || {},
        milestones: data.milestones || [],
        goals: data.goals || [],
        visitedCities: state.cities,
        massageCoupons: state.coupons
    };

    massageCouponsData = state.coupons;
    state.milestones = config.milestones.slice();
    state.goals = config.goals.slice();
    state.slots = withPastOrderSlots(upcomingSlots(state.space, new Date()));

    if (state.menuCategory !== 'all' &&
        !(state.menu.categories || []).some(category => String(category.id) === String(state.menuCategory))) {
        state.menuCategory = 'all';
    }

    const orderable = new Set(
        (state.menu.dishes || []).filter(dish => dish.available !== false).map(dish => String(dish.id))
    );
    state.cart.forEach(id => {
        if (!orderable.has(String(id))) state.cart.delete(id);
    });

    const current = state.selectedSlotKey
        ? state.slots.find(slot => slot.key === state.selectedSlotKey)
        : null;

    if (!current || (!orderForSlot(current.key) && !current.orderable)) {
        const free = state.slots.find(slot => slot.orderable && !orderForSlot(slot.key));
        state.selectedSlotKey = (free || state.slots[0] || {}).key || null;
    }

    if (!state.selectedSlotKey ||
        state.cartSlotKey !== state.selectedSlotKey ||
        orderForSlot(state.selectedSlotKey) ||
        !(state.slots.find(slot => slot.key === state.selectedSlotKey) || {}).orderable) {
        state.cart.clear();
        state.cartSlotKey = null;
    }
}

function applyOrderDeepLink() {
    const url = new URL(window.location.href);
    const slotKey = url.searchParams.get('slot');
    if (!slotKey) return;

    let slot = (state.slots || []).find(item => item.key === slotKey);
    const order = (state.orders || []).find(item => item.slotKey === slotKey);
    if (!slot && order && order.slot) {
        slot = { ...order.slot, orderable: false, past: true };
        state.slots.unshift(slot);
    }
    if (slot) {
        state.selectedSlotKey = slotKey;
        if (state.page !== 'order') switchPage('order', { push: false });
        url.searchParams.delete('slot');
        history.replaceState({ page: 'order' }, '', `${url.pathname}${url.search}#order`);
    } else {
        url.searchParams.delete('slot');
        history.replaceState({ page: state.page }, '', `${url.pathname}${url.search}#${state.page}`);
    }
}

function renderAll() {
    renderDashboard();
    startTimer();
    observeMap();
}

function renderDashboard() {
    renderSpaceChrome();
    renderLoveStory();
    tickLoveTime();
    renderMilestones();
    renderTimeline();
    renderGoals();
    renderCityChips();
    renderCoupons();
    renderWalletUI();
    renderDinnerCard();
    renderOrderPage();
    renderMePage();
    if (state.mapStatus === 'ready') updateMapData();
    ensureOrderPolling();
}

async function refreshData(manual) {
    if (state.refreshing) return;
    state.refreshing = true;
    const button = $('refresh-btn');
    if (button) button.classList.add('is-loading');

    try {
        const data = await loadAppData();
        applyAppData(data);
        await refreshSelectedOrder();
        state.lastLoadedAt = Date.now();
        renderDashboard();
        if (manual) toast('已刷新');
    } catch (error) {
        console.error('刷新失败:', error);
        if (manual) toast('刷新失败，检查一下网络');
    } finally {
        state.refreshing = false;
        if (button) button.classList.remove('is-loading');
    }
}

/* ---------- love timer ---------- */

function renderLoveStory() {
    const story = config.loveStory || {};
    const start = parseDate(story.startDate);
    const title = $('love-title');
    if (title && story.title) title.textContent = String(story.title).trim();

    if (start) {
        const since = formatDate(start);
        const sinceYear = $('since-year');
        const timerSince = $('timer-since');
        if (sinceYear) sinceYear.textContent = start.getFullYear();
        if (timerSince) timerSince.textContent = since;
    }

    const footerYear = $('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
}

const DEFAULT_SPACE_NAME = '我们的时光';
const DEFAULT_SPACE_AVATAR = 'assets/media/space-avatar.svg';

function spaceName() {
    const name = state.space && state.space.name;
    return String(name || DEFAULT_SPACE_NAME).trim() || DEFAULT_SPACE_NAME;
}

function renderSpaceChrome() {
    const name = spaceName();
    const storyTitle = String((config.loveStory || {}).title || '').trim();
    const brand = $('brand-title');
    if (brand) brand.textContent = name;
    document.title = storyTitle ? `${name} · ${storyTitle}` : name;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', name);

    const avatar = $('me-avatar-img');
    if (avatar) {
        const src = String((state.space && state.space.avatar) || '').trim() || DEFAULT_SPACE_AVATAR;
        avatar.onerror = () => {
            if (!avatar.src.endsWith(DEFAULT_SPACE_AVATAR)) avatar.src = DEFAULT_SPACE_AVATAR;
        };
        if (avatar.getAttribute('src') !== src) avatar.setAttribute('src', src);
    }
}

function tickLoveTime() {
    const story = config.loveStory || {};
    const start = parseDate(story.startDate);
    if (!start) return;

    const diff = Math.max(0, Date.now() - start.getTime());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const daysEl = $('days');
    if (daysEl) daysEl.textContent = days;

    updateTimeDisplay('hours', hours, true);
    updateTimeDisplay('minutes', minutes, true);
    updateTimeDisplay('seconds', seconds, false);
}

function updateTimeDisplay(id, value, animate) {
    const element = $(id);
    if (!element) return;
    const next = String(value);
    if (element.textContent === next) return;
    element.textContent = next;
    if (!animate) return;
    element.classList.add('updated');
    setTimeout(() => element.classList.remove('updated'), 600);
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(tickLoveTime, 1000);
}

/* ---------- milestones ---------- */

function memoryCoverHTML(milestone, index, large) {
    const year = dateYear(milestone.date);
    const variant = `v${index % 4}`;
    const motif = MOTIFS[index % MOTIFS.length];
    const image = milestone.image
        ? `<img src="${escapeHTML(milestone.image)}" alt="" loading="lazy" decoding="async">`
        : '';
    return {
        className: `memory-cover ${variant}`,
        html: `
            <div class="memory-cover-text">
                <span class="memory-year">${escapeHTML(year)}</span>
                <span class="memory-motif" aria-hidden="true">${motif}</span>
            </div>
            ${image}
            ${!large ? `<span class="memory-date-chip">${escapeHTML(formatDate(milestone.date))}</span>` : ''}
        `
    };
}

function memoryCardHTML(milestone, index) {
    const cover = memoryCoverHTML(milestone, index, false);
    return `
        <article class="memory-card" role="button" tabindex="0" data-memory-index="${index}" aria-label="查看回忆：${cleanText(milestone.title)}">
            <div class="${cover.className}">${cover.html}</div>
            <div class="memory-body">
                <h3 class="memory-title">${cleanText(milestone.title)}</h3>
                <p class="memory-desc">${cleanText(milestone.description)}</p>
            </div>
        </article>
    `;
}

function renderMilestones() {
    const container = $('milestones-container');
    if (!container) return;

    const list = state.milestones;
    container.innerHTML = list.map(memoryCardHTML).join('');

    const total = $('milestone-total');
    const count = $('milestone-count');
    const current = $('milestone-current');
    if (total) total.textContent = list.length;
    if (count) count.textContent = list.length;
    if (current) current.textContent = list.length ? '01' : '00';

    container.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', () => img.remove());
    });

    container.scrollLeft = 0;
    updateCarouselMeta();
}

function updateCarouselMeta() {
    const track = $('milestones-container');
    if (!track) return;
    const cards = track.querySelectorAll('.memory-card');
    if (!cards.length) return;

    const cardWidth = cards[0].getBoundingClientRect().width;
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const step = cardWidth + gap;
    if (!step) return;

    const index = Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / step)));
    const max = track.scrollWidth - track.clientWidth;
    const progress = max > 0 ? (track.scrollLeft / max) * 100 : 0;

    const current = $('milestone-current');
    const fill = $('milestone-progress');
    if (current) current.textContent = pad2(index + 1);
    if (fill) fill.style.width = `${progress}%`;
}

function initCarousel() {
    const track = $('milestones-container');
    if (!track) return;

    let ticking = false;
    track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateCarouselMeta();
            ticking = false;
        });
    }, { passive: true });

    const scrollStep = (direction) => {
        const card = track.querySelector('.memory-card');
        if (!card) return;
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
        track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
    };

    const prev = $('milestone-prev');
    const next = $('milestone-next');
    if (prev) prev.addEventListener('click', () => scrollStep(-1));
    if (next) next.addEventListener('click', () => scrollStep(1));

    track.addEventListener('click', (event) => {
        const card = event.target.closest('.memory-card');
        if (!card) return;
        openMemory(Number(card.dataset.memoryIndex));
    });

    track.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.memory-card');
        if (!card) return;
        event.preventDefault();
        openMemory(Number(card.dataset.memoryIndex));
    });

    window.addEventListener('resize', updateCarouselMeta);
}

/* ---------- memory detail ---------- */

function openMemory(index) {
    if (!state.milestones[index]) return;
    state.memoryIndex = index;
    renderMemoryDetail();
    openSheet('memory-sheet');
}

function renderMemoryDetail() {
    const milestone = state.milestones[state.memoryIndex];
    if (!milestone) return;

    const cover = $('memory-detail-cover');
    if (cover) {
        const data = memoryCoverHTML(milestone, state.memoryIndex, true);
        cover.className = data.className.replace('memory-cover', 'memory-detail-cover');
        cover.innerHTML = data.html;
        const img = cover.querySelector('img');
        if (img) img.addEventListener('error', () => img.remove());
    }

    const date = $('memory-detail-date');
    const title = $('memory-detail-title');
    const desc = $('memory-detail-desc');
    if (date) date.textContent = formatDate(milestone.date);
    if (title) title.textContent = String(milestone.title || '').trim();
    if (desc) desc.textContent = String(milestone.description || '').trim();

    const prev = $('memory-prev');
    const next = $('memory-next');
    if (prev) prev.disabled = state.memoryIndex <= 0;
    if (next) next.disabled = state.memoryIndex >= state.milestones.length - 1;
}

function stepMemory(direction) {
    const index = state.memoryIndex + direction;
    if (!state.milestones[index]) return;
    state.memoryIndex = index;
    const scroll = document.querySelector('#memory-sheet .sheet-scroll');
    if (scroll) scroll.scrollTop = 0;
    renderMemoryDetail();
}

function initMemorySheet() {
    const prev = $('memory-prev');
    const next = $('memory-next');
    if (prev) prev.addEventListener('click', () => stepMemory(-1));
    if (next) next.addEventListener('click', () => stepMemory(1));
}

/* ---------- timeline sheet ---------- */

function renderTimeline() {
    const list = $('timeline-list');
    if (!list) return;

    const items = state.milestones
        .map((milestone, index) => ({ milestone, index, date: parseDate(milestone.date) }))
        .sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return a.date - b.date;
        });

    const groups = new Map();
    items.forEach(item => {
        const year = item.date ? item.date.getFullYear() : '旧时光';
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(item);
    });

    let html = '';
    groups.forEach((entries, year) => {
        html += `<h3 class="timeline-year">${escapeHTML(year)}</h3>`;
        entries.forEach(({ milestone, index }) => {
            html += `
                <button class="timeline-item" type="button" data-memory-index="${index}">
                    <span class="timeline-item-date">${escapeHTML(formatDate(milestone.date))}</span>
                    <span class="timeline-item-title">${cleanText(milestone.title)}</span>
                    <span class="timeline-item-desc">${cleanText(milestone.description)}</span>
                </button>
            `;
        });
    });

    list.innerHTML = html || '<div class="coupon-empty"><p>还没有回忆</p></div>';

    const count = $('timeline-count');
    if (count) count.textContent = state.milestones.length;
}

function initTimelineSheet() {
    const list = $('timeline-list');
    const open = $('open-timeline');
    if (open) open.addEventListener('click', () => openSheet('timeline-sheet'));
    if (list) {
        list.addEventListener('click', (event) => {
            const item = event.target.closest('.timeline-item');
            if (!item) return;
            openMemory(Number(item.dataset.memoryIndex));
        });
    }
}

/* ---------- goals ---------- */

function renderGoals() {
    const container = $('goals-container');
    if (!container) return;

    if (!state.goals.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = state.goals.map((goal, index) => `
        <article class="goal-card v${index % 3}">
            <span class="goal-emoji" aria-hidden="true">${cleanText(goal.icon || '✶')}</span>
            <div>
                <span class="goal-tag">约定</span>
                <h3 class="goal-title">${cleanText(goal.title)}</h3>
            </div>
        </article>
    `).join('');
}

/* ---------- cities ---------- */

function visitedCities() {
    return Array.isArray(state.cities) ? state.cities.slice() : [];
}

function renderCityChips() {
    const container = $('city-chips');
    const count = $('city-count');
    if (!container) return;

    const cities = visitedCities().slice().sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (!da || !db) return 0;
        return db - da;
    });

    container.innerHTML = cities.map(city => `
        <span class="city-chip">
            <b>${cleanText(city.name)}</b>
            <span>${cleanText(formatDate(city.date))}</span>
        </span>
    `).join('');

    if (count) count.textContent = `${cities.length} 座城市`;
}

/* ---------- map ---------- */

function observeMap() {
    const mapEl = $('asia-map');
    if (!mapEl || state.mapStatus !== 'idle') return;

    if (!('IntersectionObserver' in window)) {
        initMap();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            initMap();
        });
    }, { rootMargin: '500px 0px' });

    observer.observe(mapEl);
}

async function initMap() {
    if (state.mapStatus === 'loading' || state.mapStatus === 'ready') return;
    state.mapStatus = 'loading';

    const loadingText = $('map-loading-text');
    if (loadingText) loadingText.textContent = '正在展开地图';

    try {
        if (typeof echarts === 'undefined') {
            await loadScript(CDN.echarts);
        }

        const response = await fetch('assets/data/china-map.json');
        if (!response.ok) throw new Error('地图数据加载失败');
        const geoJson = await response.json();
        echarts.registerMap('china', geoJson);

        const chartEl = $('asia-map');
        if (!chartEl) return;
        myChart = echarts.init(chartEl, null, { renderer: 'canvas' });
        myChart.setOption(buildMapOption());

        state.mapStatus = 'ready';
        const card = chartEl.closest('.map-card');
        if (card) card.classList.add('is-ready');

        if ('ResizeObserver' in window) {
            new ResizeObserver(() => myChart && myChart.resize()).observe(chartEl);
        } else {
            window.addEventListener('resize', () => myChart && myChart.resize());
        }
    } catch (error) {
        console.error('地图加载失败:', error);
        state.mapStatus = 'error';
        if (loadingText) loadingText.textContent = '地图暂时打不开';
    }
}

function mapCityData() {
    const cities = visitedCities();
    const names = cities.map(city => city.name);
    return Object.entries(cityCoordinates).map(([name, coords]) => {
        const visited = names.includes(name);
        return {
            name,
            value: [...coords.value, visited ? 1 : 0],
            visited
        };
    });
}

function buildMapOption() {
    const narrow = window.innerWidth < 820;
    const data = mapCityData();
    const cities = visitedCities();

    return {
        tooltip: {
            trigger: 'item',
            confine: true,
            backgroundColor: 'rgba(255, 253, 248, 0.97)',
            borderColor: '#df5f7e',
            borderWidth: 1,
            padding: [8, 11],
            textStyle: {
                color: '#2b2231',
                fontSize: 12,
                fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
            },
            formatter(params) {
                const city = cities.find(item => item.name === params.name);
                if (city) {
                    const date = formatDate(city.date);
                    const desc = escapeHTML(city.description || '');
                    return `<div style="font-weight:700;margin-bottom:3px">${escapeHTML(params.name)}</div>` +
                        (date ? `<div style="color:#8a7c86;font-size:11px">${escapeHTML(date)}</div>` : '') +
                        (desc ? `<div style="max-width:190px;white-space:normal;line-height:1.5">${desc}</div>` : '');
                }
                return `<div style="font-weight:700">${escapeHTML(params.name)}</div><div style="color:#8a7c86;font-size:11px">还没一起去过</div>`;
            }
        },
        geo: {
            map: 'china',
            roam: state.mapRoam,
            zoom: 1.8,
            center: narrow ? [112, 34] : [110, 34],
            label: { show: false },
            itemStyle: {
                areaColor: '#fbf3e2',
                borderColor: '#d8c9b2',
                borderWidth: 1
            },
            emphasis: {
                label: { show: false },
                itemStyle: {
                    areaColor: '#ffeaf0',
                    borderColor: '#df5f7e',
                    borderWidth: 1.4
                }
            },
            select: { disabled: true }
        },
        series: [
            {
                type: 'effectScatter',
                coordinateSystem: 'geo',
                data: data.filter(item => item.visited),
                symbolSize: narrow ? 13 : 15,
                showEffectOn: 'render',
                rippleEffect: {
                    brushType: 'stroke',
                    scale: narrow ? 3.6 : 4.5,
                    period: 4.5
                },
                label: {
                    formatter: '{b}',
                    position: narrow ? 'top' : 'right',
                    show: true,
                    fontSize: narrow ? 10 : 12,
                    color: '#2b2231',
                    fontWeight: 'bold',
                    distance: narrow ? 4 : 7,
                    backgroundColor: 'rgba(255, 253, 248, 0.94)',
                    borderColor: 'rgba(223, 95, 126, 0.55)',
                    borderWidth: 1,
                    borderRadius: 5,
                    padding: [2, 5]
                },
                labelLayout: { hideOverlap: true },
                itemStyle: {
                    color: '#df5f7e',
                    shadowBlur: 16,
                    shadowColor: 'rgba(223, 95, 126, 0.55)'
                },
                zlevel: 1
            },
            {
                type: 'scatter',
                coordinateSystem: 'geo',
                data: data.filter(item => !item.visited),
                symbolSize: narrow ? 6 : 9,
                label: {
                    formatter: '{b}',
                    position: 'right',
                    show: !narrow,
                    fontSize: 10,
                    color: '#9a8f7d',
                    distance: 4
                },
                labelLayout: { hideOverlap: true },
                itemStyle: {
                    color: '#d9cdbb',
                    borderColor: '#c8baa4',
                    borderWidth: 1
                },
                zlevel: 0
            }
        ]
    };
}

function updateMapData() {
    if (!myChart) return;
    myChart.setOption(buildMapOption(), { notMerge: true });
}

function initMapControls() {
    const card = $('asia-map') && $('asia-map').closest('.map-card');
    const guard = $('map-guard');
    const lock = $('map-lock');
    if (!card || !guard || !lock) return;

    const setRoam = (roam) => {
        state.mapRoam = roam;
        card.classList.toggle('is-active', roam);
        lock.hidden = !roam;
        if (myChart) myChart.setOption({ geo: { roam } });
    };

    guard.addEventListener('click', () => setRoam(true));
    lock.addEventListener('click', () => setRoam(false));
}

/* ---------- coupons ---------- */

function couponTicketHTML(coupon) {
    return `
        <article class="ticket">
            <div class="ticket-top">
                <span class="ticket-no">NO.${String(coupon.id).padStart(3, '0')}</span>
                <span class="ticket-state">未使用</span>
            </div>
            <div class="ticket-main">
                <span class="ticket-icon" aria-hidden="true">${cleanText(coupon.icon || '💆')}</span>
                <div class="ticket-info">
                    <h3 class="ticket-title">${cleanText(coupon.title || '恋爱卡')}</h3>
                    <span class="ticket-duration">${cleanText(coupon.duration)}${cleanText(coupon.durationUnit || '分钟')}</span>
                </div>
            </div>
            <div class="ticket-foot">
                <span class="ticket-date">获得于 ${escapeHTML(formatDate(coupon.acquiredDate))}</span>
                <button class="ticket-use" type="button" data-use-id="${escapeHTML(coupon.id)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.6v2.6H14zM18.2 18.2h2.3v2.3h-2.3z"/></svg>
                    出示二维码
                </button>
            </div>
        </article>
    `;
}

function couponHistoryHTML(coupon) {
    return `
        <div class="history-row">
            <span class="history-icon" aria-hidden="true">${cleanText(coupon.icon || '💆')}</span>
            <span class="history-main">
                <b>${cleanText(coupon.title || '恋爱卡')}</b>
                <small>${cleanText(coupon.duration)}${cleanText(coupon.durationUnit || '分钟')} · ${cleanText(formatDate(coupon.usedDate || coupon.acquiredDate))} 使用</small>
            </span>
            <span class="history-stamp">已用</span>
        </div>
    `;
}

function couponGroupHTML(title, count, inner) {
    return `
        <section class="coupon-group">
            <h2 class="coupon-group-title">${title}<span>${count}</span></h2>
            <div class="coupon-group-items">${inner}</div>
        </section>
    `;
}

function couponEmptyHTML(title, note) {
    return `
        <div class="coupon-empty">
            <span aria-hidden="true">♡</span>
            <p>${title}</p>
            <small>${note}</small>
        </div>
    `;
}

function renderCoupons() {
    const container = $('coupons-container');
    if (!container) return;

    const all = massageCouponsData || [];
    const available = all.filter(coupon => coupon.status === 'available').sort((a, b) => {
        const da = parseDate(a.acquiredDate);
        const db = parseDate(b.acquiredDate);
        return (db || 0) - (da || 0);
    });
    const used = all.filter(coupon => coupon.status === 'used').sort((a, b) => {
        const da = parseDate(a.usedDate || a.acquiredDate);
        const db = parseDate(b.usedDate || b.acquiredDate);
        return (db || 0) - (da || 0);
    });

    const statAvailable = $('stat-available');
    const statUsed = $('stat-used');
    if (statAvailable) statAvailable.textContent = available.length;
    if (statUsed) statUsed.textContent = used.length;

    let html = '';

    if (state.filter === 'available') {
        html = available.length
            ? available.map(couponTicketHTML).join('')
            : couponEmptyHTML('暂无可用恋爱卡', '等他再偷偷塞一张给你吧');
    } else if (state.filter === 'used') {
        html = used.length
            ? used.map(couponHistoryHTML).join('')
            : couponEmptyHTML('还没有用过的卡', '用掉一张，就多一段小回忆');
    } else {
        if (available.length) {
            html += couponGroupHTML('未使用', available.length, available.map(couponTicketHTML).join(''));
        }
        if (used.length) {
            html += couponGroupHTML('已使用', used.length, used.map(couponHistoryHTML).join(''));
        }
        if (!available.length && !used.length) {
            html = couponEmptyHTML('还没有恋爱卡', '等他给你发第一张吧');
        }
    }

    container.innerHTML = html;
}

function initCoupons() {
    const tabs = document.querySelectorAll('.coupon-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => {
                item.classList.remove('is-active');
                item.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('is-active');
            tab.setAttribute('aria-selected', 'true');
            state.filter = tab.dataset.filter;
            renderCoupons();
        });
    });

    const container = $('coupons-container');
    if (container) {
        container.addEventListener('click', (event) => {
            const button = event.target.closest('[data-use-id]');
            if (!button) return;
            const coupon = (massageCouponsData || []).find(item => String(item.id) === String(button.dataset.useId));
            if (!coupon) return;
            if (coupon.status === 'used') {
                toast('这张卡已经用掉啦');
                return;
            }
            openQR(coupon);
        });
    }

    const refresh = $('refresh-btn');
    if (refresh) refresh.addEventListener('click', () => refreshData(true));
}

/* ---------- kitchen / ordering ---------- */

function formatClock(value) {
    const date = parseDate(value);
    if (!date) return '';
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatEntryTime(value) {
    const date = parseDate(value);
    if (!date) return '';
    return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatFullTime(value) {
    const date = parseDate(value);
    if (!date) return String(value || '');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
        `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function slotByKey(key) {
    return (state.slots || []).find(slot => slot.key === key) || null;
}

function orderForSlot(key) {
    return (state.orders || []).find(order => order.slotKey === key && order.status !== 'cancelled') || null;
}

function selectedSlot() {
    return slotByKey(state.selectedSlotKey);
}

function slotText(slot) {
    return slot ? `${slot.dateLabel} ${slot.label} · ${slot.time}` : '';
}

function dishImageFor(item) {
    if (item && item.image) return item.image;
    const dish = (state.menu.dishes || []).find(d => String(d.id) === String(item.dishId));
    return dish && dish.image ? dish.image : '';
}

function dishPhotoHTML(item) {
    const image = dishImageFor(item);
    if (image) {
        return `<span class="order-item-photo"><img src="${escapeHTML(image)}" alt="${cleanText(item.name)}" loading="lazy"></span>`;
    }
    return `<span class="order-item-photo"><span class="order-item-emoji" aria-hidden="true">${cleanText(item.icon || '🍽️')}</span></span>`;
}

function servedPhotosHTML(order) {
    const photos = ((order && order.items) || [])
        .filter(item => item && item.servedImage)
        .map(item => ({ name: item.name, url: item.servedImage }));
    if (!photos.length) return '';
    return `
        <section class="order-served">
            <div class="order-served-head">
                <h3>本次出餐</h3>
                <span>${photos.length} 张成品图 · 大厨拍的</span>
            </div>
            <div class="order-served-list">
                ${photos.map(photo => `
                    <figure class="order-served-photo">
                        <img src="${escapeHTML(photo.url)}" alt="${cleanText(photo.name)} 出餐图" loading="lazy">
                        <figcaption>${cleanText(photo.name)}</figcaption>
                    </figure>
                `).join('')}
            </div>
        </section>
    `;
}

function nextUpcomingOrder() {
    const list = (state.orders || [])
        .filter(order => !['completed', 'cancelled'].includes(order.status))
        .sort((a, b) => String(a.scheduledFor || a.placedAt || '')
            .localeCompare(String(b.scheduledFor || b.placedAt || '')));
    return list[0] || null;
}

function nextOrderableSlot() {
    return (state.slots || []).find(slot => slot.orderable && !orderForSlot(slot.key)) ||
        (state.slots || []).find(slot => slot.orderable) ||
        null;
}

function pollingNeeded() {
    const now = Date.now();
    return (state.orders || []).some(order => {
        if (['prepping', 'cooking', 'served'].includes(order.status)) return true;
        if (['pending', 'accepted'].includes(order.status)) {
            const at = parseDate(order.scheduledFor);
            return at && at.getTime() - now <= 12 * 3600 * 1000;
        }
        return false;
    });
}

function ensureSelectedSlot() {
    const current = state.selectedSlotKey ? slotByKey(state.selectedSlotKey) : null;
    if (!current || (!orderForSlot(current.key) && !current.orderable)) {
        const free = (state.slots || []).find(slot => slot.orderable && !orderForSlot(slot.key));
        state.selectedSlotKey = (free || (state.slots || [])[0] || {}).key || null;
    }
    if (state.cartSlotKey && (
        state.cartSlotKey !== state.selectedSlotKey ||
        orderForSlot(state.cartSlotKey) ||
        !(slotByKey(state.cartSlotKey) || {}).orderable
    )) {
        state.cart.clear();
        state.cartSlotKey = null;
    }
}

function withPastOrderSlots(slots) {
    const known = new Set((slots || []).map(slot => slot.key));
    const seen = new Set();
    const extras = (state.orders || [])
        .filter(order => order.slotKey && order.slot && !known.has(order.slotKey) &&
            !['completed', 'cancelled'].includes(order.status))
        .map(order => ({ ...order.slot, orderable: false, past: true }))
        .filter(slot => {
            if (seen.has(slot.key)) return false;
            seen.add(slot.key);
            return true;
        })
        .sort((a, b) => String(a.scheduledFor || '').localeCompare(String(b.scheduledFor || '')));
    return extras.concat(slots || []);
}

async function refreshSelectedOrder() {
    const summary = state.selectedSlotKey ? orderForSlot(state.selectedSlotKey) : null;
    if (!summary) {
        state.selectedOrder = null;
        return null;
    }
    try {
        state.selectedOrder = await getOrder(summary.id);
        return state.selectedOrder;
    } catch (error) {
        console.warn('读取订单失败:', error);
        state.selectedOrder = null;
        return null;
    }
}

const WALLET_ENTRY_ICONS = {
    grant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8" width="17" height="12" rx="2.5"/><path d="M3.5 12h17M12 8v12M8 8c-1.8-2.4 1.4-4.6 4-1.5 2.6-3.1 5.8-.9 4 1.5"/></svg>',
    order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5h16a8 8 0 0 1-16 0Z"/><path d="M8 7.3c0-1.4 1-1.9 1-3M12 7.3c0-1.4 1-1.9 1-3M16 7.3c0-1.4 1-1.9 1-3"/><path d="M5 19h14"/></svg>',
    refund: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h11a4.5 4.5 0 0 1 0 9H8"/><path d="m8 5-4 5 4 5"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.4-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5.2-7.5 9.6-7.5 9.6Z"/></svg>'
};

function walletEntryHTML(entry) {
    const labels = { grant: '大厨发币', order: '点餐', refund: '退款' };
    const type = WALLET_ENTRY_ICONS[entry.type] ? entry.type : 'other';
    const positive = Number(entry.amount) >= 0;
    return `
        <div class="wallet-entry">
            <span class="wallet-entry-icon ${type}" aria-hidden="true">${WALLET_ENTRY_ICONS[type]}</span>
            <span class="wallet-entry-main">
                <b>${cleanText(entry.note || labels[entry.type] || '恋爱币变动')}</b>
                <small>${labels[entry.type] || '变动'} · ${formatEntryTime(entry.createdAt)} · 余额 ${entry.balanceAfter}</small>
            </span>
            <span class="wallet-entry-amount ${positive ? 'is-plus' : 'is-minus'}">${positive ? '+' : ''}${entry.amount}</span>
        </div>
    `;
}

function walletEntriesHTML(entries, limit) {
    const list = (entries || []).slice(0, limit || 20);
    if (!list.length) return '<div class="wallet-empty">还没有流水，等大厨发第一笔零花钱吧。</div>';
    return list.map(walletEntryHTML).join('');
}

function renderWalletUI() {
    const wallet = state.wallet || { balance: 0, overdraftLimit: 50, entries: [] };
    const limit = Number(wallet.overdraftLimit) || 0;
    const negative = wallet.balance < 0;

    ['dinner-balance', 'wallet-balance', 'wallet-sheet-balance', 'me-balance'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = wallet.balance;
    });

    const sheetBalance = $('wallet-sheet-balance');
    if (sheetBalance) sheetBalance.classList.toggle('is-negative', negative);
    const meBalance = $('me-balance');
    if (meBalance) meBalance.classList.toggle('is-negative', negative);

    const credit = $('wallet-credit');
    if (credit) credit.textContent = `最多可欠 ${limit} 币`;
    const meCredit = $('me-credit');
    if (meCredit) meCredit.textContent = `最多可欠 ${limit} 币`;

    const sheetCredit = $('wallet-sheet-credit');
    if (sheetCredit) {
        sheetCredit.textContent = negative
            ? `现在欠大厨 ${-wallet.balance} 币，最多可欠 ${limit} 币`
            : `最多可欠 ${limit} 币`;
    }

    const footnote = $('menu-footnote');
    if (footnote) {
        footnote.innerHTML = `恋爱币不够时，可以等大厨发零花钱；本空间最多可欠 <b>${limit}</b> 币。`;
    }

    const container = $('wallet-entries');
    if (container) container.innerHTML = walletEntriesHTML(wallet.entries, 20);
}

function renderDinnerCard() {
    const next = nextUpcomingOrder();
    const slot = next ? slotByKey(next.slotKey) : nextOrderableSlot();
    const copy = next ? KITCHEN_COPY[next.status] : null;

    const emoji = $('dinner-emoji');
    const title = $('dinner-title');
    const desc = $('dinner-desc');
    const cta = $('dinner-cta');
    if (!emoji || !title || !desc || !cta) return;

    title.textContent = '周末吃什么';
    if (next) {
        emoji.textContent = copy ? copy.emoji : '🍽️';
        const when = next.slot ? slotText(next.slot) : '已预约';
        desc.textContent = `${when} · ${ORDER_STATUS[next.status]}`;
        cta.textContent = '看看进度 →';
    } else if (slot) {
        emoji.textContent = '🗓️';
        desc.textContent = `下一顿：${slotText(slot)}`;
        cta.textContent = '去预约 →';
    } else {
        emoji.textContent = '🌙';
        desc.textContent = '这一轮的饭点都截止了，等下次开饭吧。';
        cta.textContent = '看看菜单 →';
    }
}

function renderSlotPicker() {
    const container = $('slot-picker');
    if (!container) return;

    if (!state.slots.length) {
        container.innerHTML = '<div class="slot-empty">最近还没有可预约的饭点。</div>';
        return;
    }

    container.innerHTML = state.slots.map(slot => {
        const booked = !!orderForSlot(slot.key);
        const selected = slot.key === state.selectedSlotKey;
        const closed = !slot.orderable;
        const past = !!slot.past;
        return `
            <button class="slot-card ${selected ? 'is-active' : ''} ${booked ? 'is-booked' : ''} ${closed ? 'is-closed' : ''} ${past ? 'is-past' : ''}"
                type="button" role="tab" aria-selected="${selected}" data-slot-key="${slot.key}">
                <span class="slot-date">${slot.dateLabel}</span>
                <span class="slot-label">${cleanText(slot.label)}</span>
                <span class="slot-time">${slot.time}</span>
                <span class="slot-state">${booked ? (past ? '已过时间' : '已预约') : closed ? '已截止' : '可预约'}</span>
            </button>
        `;
    }).join('');
}

function renderOrderStatus() {
    const wrap = $('order-status-wrap');
    if (!wrap) return;

    const slot = selectedSlot();
    if (!slot) {
        wrap.innerHTML = '<div class="order-closed"><h3>最近没有可预约的饭点</h3><p>等大厨公布下一轮开饭时间吧。</p></div>';
        return;
    }

    const summary = orderForSlot(slot.key);
    if (!summary) {
        if (!slot.orderable) {
            wrap.innerHTML = `
                <div class="order-closed">
                    <h3>这个饭点已截止预约</h3>
                    <p>开饭前 1 小时关闭预约，看看下一个饭点吧。</p>
                    <button class="order-closed-btn" type="button" data-slot-action="next">看下一个饭点</button>
                </div>
            `;
        } else {
            wrap.innerHTML = '';
        }
        return;
    }

    const order = state.selectedOrder && String(state.selectedOrder.id) === String(summary.id)
        ? state.selectedOrder
        : null;

    if (!order) {
        wrap.innerHTML = '<div class="order-loading">正在读取这顿饭的进度…</div>';
        return;
    }

    const status = order.status;
    const copy = KITCHEN_COPY[status] || KITCHEN_COPY.pending;
    const active = ['pending', 'accepted', 'prepping', 'cooking'].includes(status);
    const stepIndex = KITCHEN_STEP_INDEX[status] == null ? 0 : KITCHEN_STEP_INDEX[status];
    const lastNudge = order.nudges && order.nudges.length
        ? parseDate(order.nudges[order.nudges.length - 1].at)
        : null;
    const cooling = lastNudge && Date.now() - lastNudge.getTime() < 5 * 60 * 1000;
    const planned = order.slot ? `${order.slot.dateLabel} ${order.slot.label} · ${order.slot.time}` : '旧订单';
    const plannedAt = order.slot ? parseDate(order.slot.scheduledFor) : null;
    const overdue = plannedAt && plannedAt.getTime() < Date.now() &&
        ['pending', 'accepted'].includes(status);

    const stepper = status === 'cancelled' ? '' : `
        <ol class="order-steps">
            ${KITCHEN_STEPS.map((label, index) => {
                const done = index < stepIndex || (!active && index <= stepIndex);
                const current = active && index === stepIndex;
                return `<li class="${done ? 'is-done' : ''}${current ? ' is-current' : ''}">
                    <span class="order-step-dot" aria-hidden="true"></span>
                    <span>${label}</span>
                </li>`;
            }).join('')}
        </ol>
    `;

    let actions = '';
    if (active) {
        if (state.space && state.space.settings && state.space.settings.nudgeEnabled === true) {
            actions += `<button class="order-action" type="button" data-order-action="nudge" ${cooling ? 'disabled' : ''}>${cooling ? '刚催过' : '催一催'}</button>`;
        }
        if (['pending', 'accepted'].includes(status)) {
            actions += '<button class="order-action" type="button" data-order-action="cancel">取消订单</button>';
        }
    }
    if (status === 'served') {
        actions += `<button class="order-action" type="button" data-order-action="thanks" ${order.thanks ? 'disabled' : ''}>${order.thanks ? '已谢谢大厨' : '谢谢大厨'}</button>`;
        actions += '<button class="order-action is-primary" type="button" data-order-action="complete">吃好啦</button>';
    }
    if (status === 'completed' || status === 'cancelled') {
        if (status === 'completed' && !order.thanks) {
            actions += '<button class="order-action" type="button" data-order-action="thanks">谢谢大厨</button>';
        }
        actions += '<button class="order-action is-primary" type="button" data-order-action="reorder">再约一顿</button>';
    }

    const thankyou = order.thanks
        ? `<p class="order-thanks">♡ ${cleanText(order.thanks.note)}</p>`
        : '';

    wrap.innerHTML = `
        <section class="order-card status-${status}">
            <div class="order-card-top">
                <span class="order-no">${cleanText(order.id)}</span>
                <span class="order-badge">${ORDER_STATUS[status]}</span>
            </div>
            <p class="order-slot-line">预约 ${planned}</p>
            <h2 class="order-card-title">${copy.title}</h2>
            <p class="order-card-sub">${overdue ? '预约时间已经过了，等大厨处理一下' : copy.note}</p>
            ${stepper}
            <div class="order-card-meta">
                <span>下单于 ${formatClock(order.placedAt) || '-'}</span>
                <span>合计 ${order.total} 币</span>
            </div>
            <div class="order-card-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        ${dishPhotoHTML(item)}
                        <span class="order-item-name">${cleanText(item.name)}<i class="order-item-qty">×1</i></span>
                        <span class="order-item-price">${item.price}</span>
                    </div>
                `).join('')}
            </div>
            ${servedPhotosHTML(order)}
            ${order.note ? `<p class="order-user-note">“${cleanText(order.note)}”</p>` : ''}
            ${thankyou}
            ${actions ? `<div class="order-card-actions">${actions}</div>` : ''}
        </section>
    `;
}

function renderMenuCategories() {
    const container = $('menu-categories');
    if (!container) return;

    const categories = (state.menu.categories || [])
        .slice()
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    const wish = '<button class="menu-cat menu-cat-wish" type="button" data-wish-open><span aria-hidden="true">+</span>我想吃</button>';

    if (!categories.length) {
        container.innerHTML = wish;
        return;
    }

    const item = (id, label, icon) => `
        <button class="menu-cat ${state.menuCategory === id ? 'is-active' : ''}"
            type="button" role="tab" aria-selected="${state.menuCategory === id}"
            data-category="${id}">
            ${icon ? `<span aria-hidden="true">${icon}</span>` : ''}${label}
        </button>
    `;

    container.innerHTML = item('all', '全部', '') +
        categories.map(category => item(category.id, cleanText(category.name), cleanText(category.icon))).join('') +
        wish;
}

function renderMenu() {
    const container = $('menu-container');
    if (!container) return;

    const slot = selectedSlot();
    const summary = slot ? orderForSlot(slot.key) : null;
    const canOrder = slot && slot.orderable && !summary;

    if (!canOrder) {
        container.innerHTML = '';
        return;
    }

    const dishes = (state.menu.dishes || [])
        .filter(dish => dish.available !== false)
        .slice()
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    const category = state.menuCategory;
    const visible = category === 'all'
        ? dishes
        : dishes.filter(dish => String(dish.categoryId) === String(category));

    const count = $('menu-count');
    if (count) count.textContent = `${visible.length} 道`;

    if (!dishes.length) {
        container.innerHTML = '<div class="coupon-empty menu-empty"><span aria-hidden="true">🍽️</span><p>菜单还没上架</p><small>等大厨写几道拿手菜吧</small></div>';
        return;
    }

    if (!visible.length) {
        container.innerHTML = '<div class="coupon-empty menu-empty"><span aria-hidden="true">♡</span><p>这个分类还没有菜</p><small>换个分类看看</small></div>';
        return;
    }

    container.innerHTML = visible.map((dish, index) => {
        const inCart = state.cart.has(String(dish.id));
        const tags = (dish.tags || []).slice(0, 2)
            .map(tag => `<span>${cleanText(tag)}</span>`)
            .join('');
        const image = dish.image
            ? `<img src="${escapeHTML(dish.image)}" alt="${cleanText(dish.name)}" loading="lazy" decoding="async">`
            : '';
        return `
            <article class="dish-card"
                role="button" tabindex="0" data-dish-open="${cleanText(dish.id)}"
                aria-label="查看${cleanText(dish.name)}">
                <div class="dish-cover v${index % 4}">
                    <span class="dish-emoji" aria-hidden="true">${cleanText(dish.icon || '🍽️')}</span>
                    ${image}
                </div>
                <div class="dish-body">
                    <div class="dish-title-row">
                        <h3 class="dish-name">${cleanText(dish.name)}</h3>
                        <span class="dish-price">${dish.price}<i>币</i></span>
                    </div>
                    <p class="dish-desc">${cleanText(dish.description)}</p>
                    <div class="dish-meta">
                        <span class="dish-time">${dish.prepMinutes} 分钟</span>
                        ${tags}
                    </div>
                </div>
                <button class="dish-add ${inCart ? 'is-added' : ''}" type="button"
                    data-dish-add="${cleanText(dish.id)}"
                    aria-label="${inCart ? '移出' : '加入'}${cleanText(dish.name)}"
                    >${inCart ? '✓' : '+'}</button>
            </article>
        `;
    }).join('');

    container.querySelectorAll('.dish-cover img').forEach(img => {
        img.addEventListener('error', () => img.remove());
    });
}

function cartTotal() {
    const dishes = state.menu.dishes || [];
    let total = 0;
    state.cart.forEach(id => {
        const dish = dishes.find(item => String(item.id) === String(id));
        if (dish) total += Number(dish.price) || 0;
    });
    return total;
}

function updateCartBar() {
    const bar = $('cart-bar');
    if (!bar) return;

    const slot = selectedSlot();
    const canOrder = slot && slot.orderable && !orderForSlot(slot.key);
    const show = state.page === 'order' &&
        state.cart.size > 0 &&
        state.cartSlotKey === (slot && slot.key) &&
        canOrder;

    bar.hidden = !show;
    if (!show) return;

    const count = $('cart-count');
    const total = $('cart-total');
    if (count) count.textContent = `${state.cart.size} 道菜`;
    if (total) total.textContent = cartTotal();
}

function toggleCart(dishId) {
    const slot = selectedSlot();
    if (!slot || !slot.orderable) {
        toast('先选一个还能预约的饭点');
        return;
    }
    if (orderForSlot(slot.key)) {
        toast('这个饭点已经约过啦');
        return;
    }

    const dish = (state.menu.dishes || []).find(item => String(item.id) === String(dishId));
    if (!dish) return;
    if (!dish.available) {
        toast('这道菜今天售罄啦');
        return;
    }

    if (state.cart.size && state.cartSlotKey !== slot.key) {
        state.cart.clear();
    }
    state.cartSlotKey = slot.key;

    const key = String(dish.id);
    if (state.cart.has(key)) state.cart.delete(key);
    else state.cart.add(key);

    renderMenu();
    updateCartBar();

    const cartSheet = $('cart-sheet');
    if (cartSheet && cartSheet.classList.contains('is-open')) renderCartSheet();
    const dishSheet = $('dish-sheet');
    if (dishSheet && dishSheet.classList.contains('is-open')) renderDishSheet();
}

function renderCartSheet() {
    const items = $('cart-items');
    const summaryTotal = $('cart-summary-total');
    const summaryBalance = $('cart-summary-balance');
    const summaryAfter = $('cart-summary-after');
    const creditNote = $('cart-credit-note');
    const confirm = $('cart-confirm');
    if (!items || !confirm) return;

    const slot = selectedSlot();
    if (!slot || !state.cart.size) {
        closeSheet('cart-sheet');
        updateCartBar();
        return;
    }

    const slotLine = $('cart-slot');
    if (slotLine) slotLine.textContent = `预约：${slotText(slot)}`;

    const dishes = state.menu.dishes || [];
    const lines = [...state.cart]
        .map(id => dishes.find(dish => String(dish.id) === String(id)))
        .filter(Boolean);
    const total = lines.reduce((sum, dish) => sum + (Number(dish.price) || 0), 0);
    const wallet = state.wallet;
    const after = wallet.balance - total;
    const limit = Number(wallet.overdraftLimit) || 0;
    const overLimit = after < -limit;

    items.innerHTML = lines.map(dish => `
        <div class="cart-line">
            <span class="cart-line-icon" aria-hidden="true">${dish.image
                ? `<img src="${escapeHTML(dish.image)}" alt="">`
                : cleanText(dish.icon || '🍽️')}</span>
            <span class="cart-line-name">${cleanText(dish.name)}</span>
            <span class="cart-line-price">${dish.price}</span>
            <button class="cart-line-remove" type="button" data-cart-remove="${cleanText(dish.id)}" aria-label="移除${cleanText(dish.name)}">移除</button>
        </div>
    `).join('');

    if (summaryTotal) summaryTotal.textContent = total;
    if (summaryBalance) summaryBalance.textContent = wallet.balance;
    if (summaryAfter) {
        summaryAfter.textContent = after < 0
            ? `-${Math.abs(after)} 币（欠大厨 ${Math.abs(after)} 币）`
            : `${after} 币`;
        summaryAfter.classList.toggle('is-negative', after < 0);
    }

    if (creditNote) {
        if (after < -limit) {
            creditNote.hidden = false;
            creditNote.textContent = `还差 ${Math.abs(after + limit)} 币，等大厨发币吧。`;
        } else if (after < 0) {
            creditNote.hidden = false;
            creditNote.textContent = `这一单会先欠大厨 ${Math.abs(after)} 币，最多可欠 ${limit} 币。`;
        } else {
            creditNote.hidden = true;
            creditNote.textContent = '';
        }
    }

    confirm.disabled = overLimit;
    confirm.textContent = overLimit
        ? `还差 ${Math.abs(after + limit)} 币`
        : '确认下单';
}

function openCartSheet() {
    const slot = selectedSlot();
    if (!slot || !slot.orderable) {
        toast('这个饭点已经截止预约了');
        return;
    }
    if (orderForSlot(slot.key)) {
        toast('这个饭点已经约过啦');
        return;
    }
    if (!state.cart.size) {
        toast('先挑几道菜吧');
        return;
    }
    renderCartSheet();
    openSheet('cart-sheet');
}

async function syncOrderState() {
    const data = await refreshOrderData();
    state.orders = data.orders;
    state.wallet = data.wallet;
    state.slots = withPastOrderSlots(upcomingSlots(state.space, new Date()));
    ensureSelectedSlot();
    await refreshSelectedOrder();
    renderWalletUI();
    renderDinnerCard();
    renderOrderPage();
    renderMePage();
    ensureOrderPolling();
}

async function placeOrderFromCart() {
    const confirm = $('cart-confirm');
    const slot = selectedSlot();
    if (!slot || !state.cart.size) return;
    if (!slot.orderable || orderForSlot(slot.key)) {
        toast('这个饭点已经不能下单啦');
        return;
    }

    const note = $('cart-note') ? $('cart-note').value : '';
    if (confirm) {
        confirm.disabled = true;
        confirm.textContent = '下单中...';
    }

    try {
        const result = await placeOrder({
            slotKey: slot.key,
            dishIds: [...state.cart],
            note
        });
        state.wallet = result.wallet;
        state.cart.clear();
        state.cartSlotKey = null;
        if ($('cart-note')) $('cart-note').value = '';
        closeSheet('cart-sheet');
        state.selectedSlotKey = slot.key;
        await syncOrderState();
        toast('预约成功，等大厨接单');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('下单失败:', error);
        if (['SLOT_CLOSED', 'SLOT_TAKEN'].includes(error.code)) {
            toast(error.message);
            await syncOrderState();
        } else if (error.code === 'SOLD_OUT' || error.code === 'MISSING_DISH') {
            toast(error.message);
            refreshData(false);
        } else if (error.code === 'INSUFFICIENT') {
            toast(`还差 ${error.shortfall} 币，等大厨发币吧`);
        } else {
            toast(error.message || '下单失败，再试一次');
        }
        renderCartSheet();
    } finally {
        if (confirm) confirm.disabled = false;
        renderCartSheet();
    }
}

async function handleOrderAction(action) {
    const order = state.selectedOrder;
    if (!order) return;

    try {
        if (action === 'nudge') {
            await nudgeOrder(order.id);
            await syncOrderState();
            toast('已经催过大厨啦');
            return;
        }
        if (action === 'cancel') {
            const ok = await showConfirm({
                title: '取消这顿饭？',
                message: '这一单会取消，恋爱币全额退回钱包。',
                okText: '取消订单',
                cancelText: '再想想',
                danger: true
            });
            if (!ok) return;
            await cancelOrder(order.id, { by: 'user' });
            await syncOrderState();
            toast('已取消，币已经退回钱包');
            return;
        }
        if (action === 'thanks') {
            await thankChef(order.id);
            await syncOrderState();
            toast('已经告诉大厨啦');
            return;
        }
        if (action === 'complete') {
            await completeOrder(order.id, 'user');
            await syncOrderState();
            toast('一餐圆满');
            return;
        }
        if (action === 'reorder') {
            const next = nextOrderableSlot();
            if (!next) {
                toast('这一轮没有可预约的饭点了');
                return;
            }
            await selectSlot(next.key, { force: true });
            toast(`换到 ${next.dateLabel} ${next.label}，挑几道菜吧`);
        }
    } catch (error) {
        console.error('订单操作失败:', error);
        toast(error.message || '操作失败，再试一次');
    }
}

function ensureOrderPolling() {
    const active = pollingNeeded();
    if (active && !state.orderPollTimer) {
        state.orderPollTimer = setInterval(pollOrder, ORDER_POLL_MS);
    }
    if (!active && state.orderPollTimer) {
        clearInterval(state.orderPollTimer);
        state.orderPollTimer = null;
    }
}

async function pollOrder() {
    if (document.visibilityState !== 'visible' || state.refreshing) return;

    const previousOrders = state.orders.slice();
    const previousBalance = state.wallet.balance;

    try {
        const data = await refreshOrderData();
        const statusChanges = [];
        data.orders.forEach(order => {
            const before = previousOrders.find(item => String(item.id) === String(order.id));
            if (before && before.status !== order.status && KITCHEN_TOAST[order.status]) {
                statusChanges.push(KITCHEN_TOAST[order.status]);
            }
        });

        state.orders = data.orders;
        state.wallet = data.wallet;
        state.slots = withPastOrderSlots(upcomingSlots(state.space, new Date()));
        ensureSelectedSlot();
        await refreshSelectedOrder();

        const walletChanged = previousBalance !== state.wallet.balance;
        if (statusChanges.length || walletChanged) {
            if (statusChanges.length) toast(statusChanges[statusChanges.length - 1]);
            renderWalletUI();
            renderDinnerCard();
            renderOrderPage();
            renderMePage();
        }
        ensureOrderPolling();
    } catch (error) {
        console.warn('订单轮询失败:', error);
    }
}

async function selectSlot(key, options = {}) {
    if (!key) return;
    if (state.cart.size && state.cartSlotKey && state.cartSlotKey !== key) {
        const ok = await showConfirm({
            title: '换一个饭点？',
            message: '这个饭点还没下单的菜会被清空。',
            okText: '换饭点',
            cancelText: '留在这里'
        });
        if (!ok) return;
        state.cart.clear();
        state.cartSlotKey = null;
    }
    state.selectedSlotKey = key;
    await refreshSelectedOrder();
    renderOrderPage();
    if (options.scrollToStatus) {
        const wrap = $('order-status-wrap');
        if (wrap && wrap.children.length) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderOrderPage() {
    renderWalletUI();
    renderSlotPicker();

    const slot = selectedSlot();
    const selectedLine = $('selected-slot');
    const summary = slot ? orderForSlot(slot.key) : null;
    if (selectedLine) {
        if (slot) {
            const label = summary ? (slot.past ? '已过时间' : '已预约') : slot.orderable ? '可预约' : '已截止';
            selectedLine.innerHTML = `<span>${slot.dateLabel} ${cleanText(slot.label)} · ${slot.time}</span><em>${label}</em>`;
        } else {
            selectedLine.textContent = '';
        }
    }

    renderOrderStatus();

    const menuArea = $('menu-area');
    const canOrder = slot && slot.orderable && !summary;
    if (menuArea) menuArea.hidden = !canOrder;
    if (canOrder) {
        renderMenuCategories();
        renderMenu();
    } else {
        const container = $('menu-container');
        if (container) container.innerHTML = '';
    }

    updateCartBar();
}

function orderRowHTML(order) {
    const slot = order.slot || (order.slotKey ? slotByKey(order.slotKey) : null);
    const statusLabel = ORDER_STATUS[order.status] || order.status;
    const items = order.items || [];
    const active = !['completed', 'cancelled'].includes(order.status);
    const action = active && order.slotKey && slotByKey(order.slotKey) ? '查看进度 ›' : '查看详情 ›';
    const itemRows = items.map(item => `
        <span class="me-order-item">
            ${dishPhotoHTML(item)}
            <span class="me-order-item-name">${cleanText(item.name)}<i>×1</i></span>
            <b class="me-order-item-price">${item.price}</b>
        </span>
    `).join('');
    return `
        <button class="me-order" type="button" data-order-open="${cleanText(order.id)}"
            data-order-slot="${order.slotKey ? cleanText(order.slotKey) : ''}"
            data-order-status="${order.status}">
            <span class="me-order-top">
                <b>${cleanText(order.id)}</b>
                <span class="me-order-status status-${order.status}">${statusLabel}</span>
            </span>
            <span class="me-order-slot">${slot ? cleanText(slotText(slot)) : '旧订单（无预约时间）'}</span>
            <span class="me-order-items">${itemRows}</span>
            <span class="me-order-foot"><span>下单于 ${formatEntryTime(order.placedAt)} · 合计 ${order.total} 币</span><b class="me-order-action">${action}</b></span>
        </button>
    `;
}

const ME_ORDER_RANK = {
    pending: 0,
    accepted: 1,
    prepping: 2,
    cooking: 3,
    served: 4,
    completed: 5,
    cancelled: 6
};
const ME_ORDER_ACTIVE = new Set(['accepted', 'prepping', 'cooking', 'served']);
const ME_ORDER_FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待接单' },
    { id: 'active', label: '进行中' },
    { id: 'completed', label: '已完成' },
    { id: 'cancelled', label: '已取消' }
];
const ME_CARD_FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'acquired', label: '获得' },
    { id: 'used', label: '使用' }
];

function resetMeView() {
    if (state.meView === 'menu') return;
    state.meView = 'menu';
    state.meOrderId = null;
    document.body.classList.remove('me-subpage');
}

function scrollAppTop() {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
}

function openMeView(view) {
    if (!['orders', 'wallet', 'cards'].includes(view)) return;
    state.meView = view;
    state.meOrderId = null;
    document.body.classList.add('me-subpage');
    renderMePage();
    scrollAppTop();
}

function closeMeView() {
    if (state.meView === 'order-detail') {
        state.meView = 'orders';
        state.meOrderId = null;
        renderMePage();
        scrollAppTop();
        return;
    }
    state.meView = 'menu';
    state.meOrderId = null;
    document.body.classList.remove('me-subpage');
    renderMePage();
    scrollAppTop();
}

function meOrderCounts() {
    const orders = state.orders || [];
    return {
        all: orders.length,
        pending: orders.filter(order => order.status === 'pending').length,
        active: orders.filter(order => ME_ORDER_ACTIVE.has(order.status)).length,
        completed: orders.filter(order => order.status === 'completed').length,
        cancelled: orders.filter(order => order.status === 'cancelled').length
    };
}

function meOrderComparator(a, b) {
    const ar = ME_ORDER_RANK[a.status] == null ? 9 : ME_ORDER_RANK[a.status];
    const br = ME_ORDER_RANK[b.status] == null ? 9 : ME_ORDER_RANK[b.status];
    if (ar !== br) return ar - br;
    const as = String(a.scheduledFor || a.placedAt || '');
    const bs = String(b.scheduledFor || b.placedAt || '');
    const aActive = a.status === 'pending' || ME_ORDER_ACTIVE.has(a.status);
    const bActive = b.status === 'pending' || ME_ORDER_ACTIVE.has(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return aActive ? as.localeCompare(bs) : bs.localeCompare(as);
}

function meOrderMatchesFilter(order, filter) {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.status === 'pending';
    if (filter === 'active') return ME_ORDER_ACTIVE.has(order.status);
    return order.status === filter;
}

function renderMeMenu() {
    const wallet = state.wallet || { balance: 0, overdraftLimit: 50, entries: [] };
    const limit = Number(wallet.overdraftLimit) || 0;
    const counts = meOrderCounts();
    const story = config.loveStory || {};
    const start = parseDate(story.startDate);
    const days = start ? Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) : null;
    const members = String(story.title || '').trim();
    const name = spaceName();

    const title = $('me-space-title');
    if (title) title.textContent = name;
    const sub = $('me-space-sub');
    if (sub) {
        sub.textContent = [members, days == null ? '' : `相爱 ${days} 天`]
            .filter(Boolean)
            .join(' · ');
    }

    const balance = $('me-menu-balance');
    if (balance) balance.textContent = `${wallet.balance} 币`;
    const walletSub = $('me-menu-wallet-sub');
    if (walletSub) walletSub.textContent = `最多可欠 ${limit} 币`;

    const orderSub = $('me-menu-orders-sub');
    if (orderSub) orderSub.textContent = `待接单 ${counts.pending} · 进行中 ${counts.active} · 全部 ${counts.all}`;
    const badge = $('me-menu-orders-badge');
    if (badge) {
        badge.textContent = counts.pending;
        badge.hidden = counts.pending <= 0;
    }

    const acquired = (state.coupons || []).length;
    const used = (state.coupons || []).filter(coupon => coupon.status === 'used').length;
    const cardsSub = $('me-menu-cards-sub');
    if (cardsSub) cardsSub.textContent = `获得 ${acquired} 次 · 使用 ${used} 次`;
}

function renderMePage() {
    const menuView = $('me-menu-view');
    const subView = $('me-sub-view');
    if (!menuView || !subView) return;

    if (state.meView === 'menu') {
        document.body.classList.remove('me-subpage');
        menuView.hidden = false;
        subView.hidden = true;
        renderMeMenu();
        return;
    }

    document.body.classList.add('me-subpage');
    menuView.hidden = true;
    subView.hidden = false;

    const meta = {
        orders: '我的订单',
        wallet: '恋爱币',
        cards: '恋爱卡流水',
        'order-detail': '订单详情'
    }[state.meView] || '空间';

    const title = $('me-sub-title');
    if (title) title.textContent = meta;

    if (state.meView === 'orders') renderMeOrders();
    else if (state.meView === 'wallet') renderMeWallet();
    else if (state.meView === 'cards') renderMeCards();
    else if (state.meView === 'order-detail') renderMeOrderDetail(state.meOrderId);
}

function renderMeOrders() {
    const body = $('me-sub-body');
    if (!body) return;

    const filter = state.meOrderFilter || 'all';
    const counts = meOrderCounts();
    const orders = (state.orders || [])
        .filter(order => meOrderMatchesFilter(order, filter))
        .sort(meOrderComparator);

    const filterLabel = (ME_ORDER_FILTERS.find(item => item.id === filter) || {}).label || '全部';
    const filterCount = filter === 'all' ? counts.all : (counts[filter] || 0);

    body.innerHTML = `
        <div class="me-list-summary">
            <span>共 <b>${orders.length}</b> 单</span>
            <span>${filter === 'all' ? `待接单 ${counts.pending} · 进行中 ${counts.active}` : `${filterLabel} ${filterCount}`}</span>
        </div>
        <div class="me-filters-bar">
            <div class="me-filters" role="tablist" aria-label="订单状态">
                ${ME_ORDER_FILTERS.map(item => `
                    <button class="me-filter ${filter === item.id ? 'is-active' : ''}" type="button"
                        role="tab" aria-selected="${filter === item.id}" data-me-filter="${item.id}">${item.label}</button>
                `).join('')}
            </div>
        </div>
        <div class="me-orders">
            ${orders.length
                ? orders.map(orderRowHTML).join('')
                : '<div class="me-empty">这个状态下还没有订单。</div>'}
        </div>
    `;
}

function renderMeWallet() {
    const body = $('me-sub-body');
    if (!body) return;
    const wallet = state.wallet || { balance: 0, overdraftLimit: 50, entries: [] };
    const limit = Number(wallet.overdraftLimit) || 0;
    const negative = wallet.balance < 0;

    body.innerHTML = `
        <div class="wallet-hero">
            <span class="wallet-hero-label">当前余额</span>
            <div class="wallet-hero-value"><b class="${negative ? 'is-negative' : ''}">${wallet.balance}</b><span>币</span></div>
            <p class="wallet-hero-credit">最多可欠 ${limit} 币 · 由大厨发放</p>
        </div>
        <div class="me-section-head"><h2>最近流水</h2><span>共 ${(wallet.entries || []).length} 笔</span></div>
        <div class="wallet-entries me-ledger">${walletEntriesHTML(wallet.entries, 200)}</div>
    `;
}

function couponEvents() {
    const events = [];
    (state.coupons || []).forEach(coupon => {
        if (coupon.acquiredDate) events.push({ type: 'acquired', at: coupon.acquiredDate, coupon });
        if (coupon.usedDate) events.push({ type: 'used', at: coupon.usedDate, coupon });
    });
    return events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}

function couponEventHTML(event) {
    const coupon = event.coupon;
    const used = event.type === 'used';
    return `
        <div class="me-coupon-event">
            <span class="me-coupon-icon" aria-hidden="true">${cleanText(coupon.icon || '💆')}</span>
            <span class="me-coupon-main">
                <b>${cleanText(coupon.title)}</b>
                <small>${cleanText(coupon.duration)}${cleanText(coupon.durationUnit || '分钟')} · ${formatFullTime(event.at)} ${used ? '使用' : '获得'}</small>
            </span>
            <span class="me-coupon-type ${used ? 'used' : 'acquired'}">${used ? '使用' : '获得'}</span>
        </div>
    `;
}

function renderMeCards() {
    const body = $('me-sub-body');
    if (!body) return;
    const filter = state.meCardFilter || 'all';
    const events = couponEvents();
    const filtered = events.filter(event => filter === 'all' || event.type === filter);

    body.innerHTML = `
        <div class="me-list-summary">
            <span>共 <b>${events.length}</b> 条</span>
            <button class="me-link" type="button" data-me-link="coupons">全部恋爱卡 ›</button>
        </div>
        <div class="me-filters-bar">
            <div class="me-filters three" role="tablist" aria-label="恋爱卡流水类型">
                ${ME_CARD_FILTERS.map(item => `
                    <button class="me-filter ${filter === item.id ? 'is-active' : ''}" type="button"
                        role="tab" aria-selected="${filter === item.id}" data-me-card-filter="${item.id}">${item.label}</button>
                `).join('')}
            </div>
        </div>
        <div class="me-coupons">
            ${filtered.length
                ? filtered.map(couponEventHTML).join('')
                : '<div class="me-empty">这个分类还没有记录。</div>'}
        </div>
        <p class="me-note">获得和使用都记在这条流水里；未使用的卡去「恋爱卡」查看和出示二维码。</p>
    `;
}

async function renderMeOrderDetail(orderId) {
    const body = $('me-sub-body');
    if (!body) return;
    if (!orderId) {
        body.innerHTML = '<div class="order-loading">找不到这条订单。</div>';
        return;
    }
    body.innerHTML = '<div class="order-loading">正在读取订单…</div>';
    try {
        const order = await getOrder(orderId);
        if (state.meView !== 'order-detail' || String(state.meOrderId) !== String(orderId)) return;
        body.innerHTML = orderDetailHTML(order);
    } catch (error) {
        console.error('读取订单详情失败:', error);
        body.innerHTML = '<div class="order-loading">订单读取失败，稍后再试。</div>';
    }
}

function orderDetailHTML(order) {
    const slot = order.slot || (order.slotKey ? slotByKey(order.slotKey) : null);
    const statusLabel = ORDER_STATUS[order.status] || order.status;
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    return `
        <div class="order-detail">
            <div class="order-detail-head">
                <span class="order-detail-id">${cleanText(order.id)}</span>
                <span class="order-badge">${statusLabel}</span>
            </div>
            <p class="order-detail-slot">${slot ? cleanText(slotText(slot)) : '旧订单（无预约时间）'}</p>
            <div class="order-detail-items">
                ${(order.items || []).map(item => `
                    <div class="order-item">
                        ${dishPhotoHTML(item)}
                        <span class="order-item-name">${cleanText(item.name)}<i class="order-item-qty">×1</i></span>
                        <span class="order-item-price">${item.price}</span>
                    </div>
                `).join('')}
            </div>
            ${servedPhotosHTML(order)}
            <div class="order-detail-total"><span>合计</span><b>${order.total} 币</b></div>
            ${order.note ? `<p class="order-user-note">“${cleanText(order.note)}”</p>` : ''}
            ${order.thanks ? `<p class="order-thanks">♡ ${cleanText(order.thanks.note)}</p>` : ''}
            <div class="order-detail-payment">
                <span>扣币 ${order.payment ? order.payment.amount : order.total} 币</span>
                <span>${order.payment && order.payment.refundedAt ? '已退款' : '已支付'}</span>
            </div>
            <h3 class="order-detail-history-title">状态记录</h3>
            <ol class="order-history">
                ${history.map(entry => `
                    <li><span>${ORDER_STATUS[entry.status] || entry.status}</span><small>${formatFullTime(entry.at)}</small></li>
                `).join('')}
            </ol>
            ${!['completed', 'cancelled'].includes(order.status) && order.slotKey && slotByKey(order.slotKey) ? `<button class="order-detail-progress" type="button" data-detail-slot="${cleanText(order.slotKey)}">查看进度</button>` : ''}
        </div>
    `;
}

async function openOrderDetail(orderId) {
    const body = $('order-detail-body');
    if (!body) return;
    body.innerHTML = '<div class="order-loading">正在读取订单…</div>';
    openSheet('order-detail-sheet');
    try {
        const order = await getOrder(orderId);
        body.innerHTML = orderDetailHTML(order);
    } catch (error) {
        console.error('读取订单详情失败:', error);
        body.innerHTML = '<div class="order-loading">订单读取失败，稍后再试。</div>';
    }
}

function renderDishSheet() {
    const dish = (state.menu.dishes || []).find(item => String(item.id) === String(state.dishId));
    if (!dish) return;

    const image = $('dish-detail-image');
    if (image) {
        const images = typeof dishImages === 'function' ? dishImages(dish) : (dish.image ? [dish.image] : []);
        if (images.length) {
            image.innerHTML = `
                <div class="dish-gallery-track" id="dish-gallery-track">
                    ${images.map((url, index) => `<div class="dish-gallery-slide"><img src="${escapeHTML(url)}" alt="${cleanText(dish.name)} ${index + 1}" loading="lazy"></div>`).join('')}
                </div>
                ${images.length > 1 ? `<span class="dish-gallery-count" id="dish-gallery-count">1 / ${images.length}</span><div class="dish-gallery-dots" id="dish-gallery-dots">${images.map((_, index) => `<button type="button" class="dish-gallery-dot ${index === 0 ? 'is-active' : ''}" data-dish-image-index="${index}" aria-label="查看第 ${index + 1} 张图片"></button>`).join('')}</div>` : ''}`;
            const track = $('dish-gallery-track');
            const count = $('dish-gallery-count');
            const dots = $('dish-gallery-dots');
            image.querySelectorAll('img').forEach(img => {
                img.addEventListener('error', () => img.closest('.dish-gallery-slide')?.remove());
            });
            if (track && images.length > 1) {
                let frame = null;
                const updateGallery = () => {
                    frame = null;
                    const index = Math.min(images.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
                    if (count) count.textContent = `${index + 1} / ${images.length}`;
                    if (dots) [...dots.children].forEach((dot, i) => dot.classList.toggle('is-active', i === index));
                };
                track.addEventListener('scroll', () => {
                    if (!frame) frame = requestAnimationFrame(updateGallery);
                }, { passive: true });
                if (dots) {
                    dots.addEventListener('click', event => {
                        const dot = event.target.closest('[data-dish-image-index]');
                        if (!dot) return;
                        const index = Number(dot.dataset.dishImageIndex);
                        track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
                    });
                }
            }
        } else {
            image.innerHTML = `<span class="dish-detail-emoji" aria-hidden="true">${cleanText(dish.icon || '🍽️')}</span>`;
        }
    }

    const category = (state.menu.categories || []).find(item => String(item.id) === String(dish.categoryId));
    const categoryEl = $('dish-sheet-category');
    if (categoryEl) categoryEl.textContent = category ? category.name : '';
    const name = $('dish-sheet-name');
    if (name) name.textContent = dish.name;
    const meta = $('dish-sheet-meta');
    if (meta) meta.textContent = `${dish.price} 币 · 约 ${dish.prepMinutes} 分钟`;
    const desc = $('dish-sheet-desc');
    if (desc) desc.textContent = dish.description || '';
    const tags = $('dish-sheet-tags');
    if (tags) tags.innerHTML = (dish.tags || []).map(tag => `<span>${cleanText(tag)}</span>`).join('');

    const add = $('dish-sheet-add');
    if (add) {
        const inCart = state.cart.has(String(dish.id));
        add.textContent = inCart ? '已加入 · 点击移出' : '加入这顿饭';
        add.classList.toggle('is-added', inCart);
        add.disabled = !dish.available;
    }
}

function openDishSheet(dishId) {
    const slot = selectedSlot();
    if (!slot || !slot.orderable || orderForSlot(slot.key)) {
        toast('先选一个能预约的饭点');
        return;
    }
    state.dishId = dishId;
    renderDishSheet();
    openSheet('dish-sheet');
}

function showConfirm({ title = '确认', message = '', okText = '确认', cancelText = '取消', danger = false }) {
    return new Promise(resolve => {
        if (state.confirmResolver) state.confirmResolver(false);
        state.confirmResolver = resolve;

        const dialog = $('confirm-dialog');
        const titleEl = $('confirm-title');
        const messageEl = $('confirm-message');
        const ok = $('confirm-ok');
        const cancel = $('confirm-cancel');
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (ok) {
            ok.textContent = okText;
            ok.classList.toggle('is-danger', !!danger);
        }
        if (cancel) cancel.textContent = cancelText;
        if (dialog) {
            dialog.classList.add('is-open');
            dialog.setAttribute('aria-hidden', 'false');
        }
        document.documentElement.classList.add('is-locked');
    });
}

function resolveConfirm(value) {
    const dialog = $('confirm-dialog');
    if (dialog) {
        dialog.classList.remove('is-open');
        dialog.setAttribute('aria-hidden', 'true');
    }
    if (!state.openSheets.length) {
        document.documentElement.classList.remove('is-locked');
    }
    const resolve = state.confirmResolver;
    state.confirmResolver = null;
    if (resolve) resolve(!!value);
}

function initConfirm() {
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', () => resolveConfirm(element.dataset.confirm === 'ok'));
    });
}

async function handleMeSubClick(event) {
    const filter = event.target.closest('[data-me-filter]');
    if (filter) {
        state.meOrderFilter = filter.dataset.meFilter;
        renderMeOrders();
        return;
    }

    const cardFilter = event.target.closest('[data-me-card-filter]');
    if (cardFilter) {
        state.meCardFilter = cardFilter.dataset.meCardFilter;
        renderMeCards();
        return;
    }

    if (event.target.closest('[data-me-link="coupons"]')) {
        switchPage('coupons');
        return;
    }

    const row = event.target.closest('[data-order-open]');
    if (!row) return;
    const summary = (state.orders || []).find(order => String(order.id) === row.dataset.orderOpen);
    if (!summary) return;

    if (!['completed', 'cancelled'].includes(summary.status) &&
        summary.slotKey && slotByKey(summary.slotKey)) {
        await selectSlot(summary.slotKey);
        switchPage('order');
        return;
    }

    state.meView = 'order-detail';
    state.meOrderId = summary.id;
    document.body.classList.add('me-subpage');
    renderMePage();
    scrollAppTop();
}

function setWishStatus(text, tone) {
    const element = $('dish-wish-status');
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('is-error', tone === 'error');
}

function setWishPreview(url) {
    const wrap = $('dish-wish-preview');
    const image = $('dish-wish-preview-img');
    if (!wrap || !image) return;
    const value = String(url || '').trim();
    if (!value) {
        wrap.hidden = true;
        image.removeAttribute('src');
        return;
    }
    image.src = value;
    wrap.hidden = false;
}

function resetDishWishForm() {
    if ($('dish-wish-name')) $('dish-wish-name').value = '';
    if ($('dish-wish-image')) $('dish-wish-image').value = '';
    if ($('dish-wish-camera')) $('dish-wish-camera').value = '';
    if ($('dish-wish-album')) $('dish-wish-album').value = '';
    state.wishUploading = false;
    setWishStatus('还没有图片');
    setWishPreview('');
    const submit = $('dish-wish-submit');
    if (submit) {
        submit.disabled = false;
        submit.textContent = '告诉大厨';
    }
}

async function handleDishWishFile(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (typeof uploadDishRequestImage !== 'function') {
        toast('页面脚本版本不一致，请强制刷新一下');
        return;
    }
    state.wishUploading = true;
    const submit = $('dish-wish-submit');
    if (submit) {
        submit.disabled = true;
        submit.textContent = '正在上传…';
    }
    setWishStatus('正在上传图片…');
    try {
        const url = await uploadDishRequestImage(file);
        $('dish-wish-image').value = url;
        setWishPreview(url);
        setWishStatus('图片已就绪');
    } catch (error) {
        const message = error && error.message ? error.message : '图片上传失败';
        setWishStatus(message, 'error');
        toast(message);
    } finally {
        state.wishUploading = false;
        if (submit) {
            submit.disabled = false;
            submit.textContent = '告诉大厨';
        }
    }
}

async function submitDishWish() {
    if (state.wishUploading) return;
    const name = $('dish-wish-name').value.trim();
    const image = $('dish-wish-image').value.trim();
    if (!name) {
        toast('先写一个菜名');
        $('dish-wish-name').focus();
        return;
    }
    if (!image) {
        toast('拍一张图，或者粘贴图片地址');
        return;
    }
    if (!/^https?:\/\//i.test(image)) {
        toast('图片地址要以 http 开头');
        return;
    }
    const submit = $('dish-wish-submit');
    submit.disabled = true;
    submit.textContent = '正在告诉大厨…';
    try {
        await submitDishRequest({ name, image });
        closeSheet('dish-wish-sheet');
        resetDishWishForm();
        toast('已经告诉大厨啦');
    } catch (error) {
        toast(error && error.message ? error.message : '提交失败，再试一次');
        submit.disabled = false;
        submit.textContent = '告诉大厨';
    }
}

function initOrderUI() {
    initConfirm();

    const dinnerCard = $('dinner-card');
    if (dinnerCard) {
        dinnerCard.addEventListener('click', async () => {
            const next = nextUpcomingOrder();
            const target = next && next.slotKey ? next.slotKey : (nextOrderableSlot() || {}).key;
            if (target) {
                state.selectedSlotKey = target;
                await refreshSelectedOrder();
            }
            switchPage('order');
        });
    }

    const slotPicker = $('slot-picker');
    if (slotPicker) {
        slotPicker.addEventListener('click', event => {
            const card = event.target.closest('[data-slot-key]');
            if (card) selectSlot(card.dataset.slotKey);
        });
    }

    ['wallet-pill', 'me-wallet'].forEach(id => {
        const button = $(id);
        if (button) {
            button.addEventListener('click', () => {
                renderWalletUI();
                openSheet('wallet-sheet');
            });
        }
    });

    const cartOpen = $('cart-open');
    if (cartOpen) cartOpen.addEventListener('click', openCartSheet);
    const confirm = $('cart-confirm');
    if (confirm) confirm.addEventListener('click', placeOrderFromCart);

    const cartItems = $('cart-items');
    if (cartItems) {
        cartItems.addEventListener('click', event => {
            const button = event.target.closest('[data-cart-remove]');
            if (button) toggleCart(button.dataset.cartRemove);
        });
    }

    const categories = $('menu-categories');
    if (categories) {
        categories.addEventListener('click', event => {
            const wish = event.target.closest('[data-wish-open]');
            if (wish) {
                resetDishWishForm();
                openSheet('dish-wish-sheet');
                return;
            }
            const button = event.target.closest('[data-category]');
            if (!button) return;
            state.menuCategory = button.dataset.category;
            renderMenuCategories();
            renderMenu();
        });
    }

    const menu = $('menu-container');
    if (menu) {
        menu.addEventListener('click', event => {
            const add = event.target.closest('[data-dish-add]');
            if (add) {
                event.stopPropagation();
                toggleCart(add.dataset.dishAdd);
                return;
            }
            const card = event.target.closest('[data-dish-open]');
            if (card) openDishSheet(card.dataset.dishOpen);
        });
        menu.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const card = event.target.closest('[data-dish-open]');
            if (!card) return;
            event.preventDefault();
            openDishSheet(card.dataset.dishOpen);
        });
    }

    const dishAdd = $('dish-sheet-add');
    if (dishAdd) {
        dishAdd.addEventListener('click', () => {
            if (state.dishId) toggleCart(state.dishId);
        });
    }

    ['dish-wish-camera', 'dish-wish-album'].forEach(id => {
        const input = $(id);
        if (input) input.addEventListener('change', handleDishWishFile);
    });
    const wishImage = $('dish-wish-image');
    if (wishImage) {
        wishImage.addEventListener('input', () => {
            const value = wishImage.value.trim();
            setWishPreview(value);
            setWishStatus(
                value ? '图片地址已填写' : '还没有图片',
                value && !/^https?:\/\//i.test(value) ? 'error' : ''
            );
        });
    }
    const wishSubmit = $('dish-wish-submit');
    if (wishSubmit) wishSubmit.addEventListener('click', submitDishWish);

    const statusWrap = $('order-status-wrap');
    if (statusWrap) {
        statusWrap.addEventListener('click', event => {
            const action = event.target.closest('[data-order-action]');
            if (action) {
                handleOrderAction(action.dataset.orderAction);
                return;
            }
            const next = event.target.closest('[data-slot-action="next"]');
            if (next) {
                const slot = nextOrderableSlot();
                if (slot) selectSlot(slot.key);
                else toast('这一轮没有可预约的饭点了');
            }
        });
    }

    const meBack = $('me-back');
    if (meBack) meBack.addEventListener('click', closeMeView);

    document.querySelectorAll('[data-me-view]').forEach(button => {
        button.addEventListener('click', () => openMeView(button.dataset.meView));
    });

    const meSubBody = $('me-sub-body');
    if (meSubBody) meSubBody.addEventListener('click', handleMeSubClick);

    const detailBody = $('order-detail-body');
    if (detailBody) {
        detailBody.addEventListener('click', async event => {
            const button = event.target.closest('[data-detail-slot]');
            if (!button) return;
            closeSheet('order-detail-sheet');
            await selectSlot(button.dataset.detailSlot);
            switchPage('order');
        });
    }
}

async function openQR(coupon) {
    const container = $('qr-code');
    if (!container) return;

    const title = $('qr-coupon');
    const serial = $('qr-serial');
    if (title) title.textContent = `${String(coupon.title || '恋爱卡').trim()} · ${coupon.duration}${coupon.durationUnit || '分钟'}`;
    if (serial) serial.textContent = `NO.${String(coupon.id).padStart(3, '0')}`;

    container.innerHTML = '<span style="color:#8a7c86;font-size:13px">生成中…</span>';
    openSheet('qr-sheet');

    try {
        if (typeof QRCode === 'undefined') {
            await loadScript(CDN.qrcode);
        }
    } catch (error) {
        console.error('二维码组件加载失败:', error);
        container.innerHTML = '<span style="color:#8a7c86;font-size:13px">二维码组件加载失败</span>';
        return;
    }

    const base = window.location.origin + window.location.pathname
        .replace(/index\.html$/, '')
        .replace(/\/$/, '');
    const url = `${base}/use.html?id=${encodeURIComponent(coupon.id)}`;
    const size = Math.min(Math.round(window.innerWidth * 0.62), 236);

    container.innerHTML = '';
    try {
        new QRCode(container, {
            text: url,
            width: size,
            height: size,
            colorDark: '#2b2231',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('二维码生成失败:', error);
        container.innerHTML = '<span style="color:#8a7c86;font-size:13px">二维码生成失败</span>';
    }
}

/* ---------- sheets ---------- */

function openSheet(id) {
    const sheet = $(id);
    if (!sheet || sheet.classList.contains('is-open')) return;
    if (!state.openSheets.length) {
        state.scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${state.scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.documentElement.classList.add('is-locked');
    }
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    state.openSheets.push(id);
}

function closeSheet(id) {
    const sheet = $(id);
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    state.openSheets = state.openSheets.filter(item => item !== id);
    if (!state.openSheets.length) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.documentElement.classList.remove('is-locked');
        const previousBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, state.scrollY || 0);
        document.documentElement.style.scrollBehavior = previousBehavior;
    }
}

function closeTopSheet() {
    const id = state.openSheets[state.openSheets.length - 1];
    if (id) closeSheet(id);
}

function initSheets() {
    document.querySelectorAll('.sheet').forEach(sheet => {
        sheet.querySelectorAll('[data-close]').forEach(button => {
            button.addEventListener('click', () => closeSheet(sheet.id));
        });
        sheet.querySelectorAll('.sheet-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => closeSheet(sheet.id));
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const dialog = $('confirm-dialog');
        if (dialog && dialog.classList.contains('is-open')) {
            resolveConfirm(false);
            return;
        }
        closeTopSheet();
    });
}

/* ---------- page navigation ---------- */

function switchPage(page, options = {}) {
    const valid = ['home', 'order', 'coupons', 'me'];
    const target = valid.includes(page) ? page : 'home';
    const { push = true, scroll = true } = options;
    state.page = target;
    resetMeView();

    document.querySelectorAll('.page').forEach(section => {
        section.classList.toggle('is-active', section.dataset.page === target);
    });

    document.querySelectorAll('.top-nav-item, .tab').forEach(button => {
        const active = button.dataset.page === target;
        button.classList.toggle('is-active', active);
        if (active) {
            button.setAttribute('aria-current', 'page');
        } else {
            button.removeAttribute('aria-current');
        }
    });

    if (target === 'coupons') {
        renderCoupons();
        if (state.lastLoadedAt && Date.now() - state.lastLoadedAt > MINUTE) {
            refreshData(false);
        }
    } else if (target === 'order') {
        renderOrderPage();
        const summary = state.selectedSlotKey ? orderForSlot(state.selectedSlotKey) : null;
        if (summary && (!state.selectedOrder || String(state.selectedOrder.id) !== String(summary.id))) {
            refreshSelectedOrder().then(() => {
                if (state.page === 'order') renderOrderPage();
            });
        }
        if (state.lastLoadedAt && Date.now() - state.lastLoadedAt > 30 * 1000) {
            refreshData(false);
        }
    } else if (target === 'me') {
        renderMePage();
        if (state.lastLoadedAt && Date.now() - state.lastLoadedAt > 30 * 1000) {
            refreshData(false);
        }
    } else {
        renderDinnerCard();
        requestAnimationFrame(updateCarouselMeta);
    }

    updateCartBar();

    if (scroll) {
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        root.style.scrollBehavior = previous;
    }

    if (push && window.location.hash !== `#${target}`) {
        history.pushState({ page: target }, '', `#${target}`);
    }
}

function initNavigation() {
    // Only navigation controls; the page <section> elements also carry
    // data-page, and binding them would re-switch the page on every click.
    document.querySelectorAll('.top-nav-item[data-page], .tab[data-page]').forEach(button => {
        button.addEventListener('click', () => switchPage(button.dataset.page));
    });

    document.querySelectorAll('[data-page-link]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            switchPage(link.dataset.pageLink);
        });
    });

    window.addEventListener('popstate', () => {
        if (state.openSheets.length) {
            [...state.openSheets].reverse().forEach(closeSheet);
            history.pushState({ page: state.page }, '', `#${state.page}`);
            return;
        }
        const page = (window.location.hash || '#home').replace('#', '');
        switchPage(page, { push: false });
    });

    const initial = (window.location.hash || '#home').replace('#', '');
    switchPage(initial, { push: false, scroll: false });
    if (!window.location.hash) {
        history.replaceState({ page: 'home' }, '', '#home');
    }
}

/* ---------- music ---------- */

function initMusic() {
    const music = $('bg-music');
    const button = $('music-control');
    if (!music || !button) return;

    const paint = (playing) => {
        button.classList.toggle('is-playing', playing);
        button.setAttribute('aria-pressed', playing ? 'true' : 'false');
        button.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    };

    const play = () => {
        if (!music.getAttribute('src')) {
            music.src = MUSIC_SRC;
            music.load();
        }
        const promise = music.play();
        if (promise && promise.then) {
            promise.then(() => paint(true)).catch(() => paint(false));
        } else {
            paint(true);
        }
    };

    const pause = () => {
        music.pause();
        paint(false);
    };

    music.volume = 0.45;
    paint(false);

    button.addEventListener('click', () => {
        if (music.paused) play();
        else pause();
    });

    music.addEventListener('pause', () => paint(false));
    music.addEventListener('play', () => paint(true));

}

/* ---------- chrome ---------- */

function initHeader() {
    const header = $('app-header');
    if (!header) return;

    let ticking = false;
    const update = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 6);
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    update();
}

function initVisibilityRefresh() {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - state.lastLoadedAt > 30 * 1000) {
            refreshData(false);
        } else if (pollingNeeded()) {
            pollOrder();
        }
    });
}

function initBootError() {
    const retry = $('boot-retry');
    if (!retry) return;
    retry.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('_r', Date.now().toString(36));
        window.location.replace(url.toString());
    });
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initNavigation();
    initMusic();
    initCarousel();
    initMemorySheet();
    initTimelineSheet();
    initSheets();
    initCoupons();
    initOrderUI();
    initMapControls();
    initVisibilityRefresh();
    initBootError();
    bootstrap();
});
