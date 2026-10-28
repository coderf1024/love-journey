/* ============================================================
   恋爱空间 domain store
   Built on the OSS document API in js/oss-utils.js.
   ============================================================ */

const SPACE_PATH = 'space.json';
const STORY_PATH = 'content/story.json';
const MILESTONES_PATH = 'content/milestones.json';
const GOALS_PATH = 'content/goals.json';
const CITIES_PATH = 'content/cities.json';
const MENU_PATH = 'commerce/menu.json';
const WALLET_PATH = 'commerce/wallet.json';
const COUNTERS_PATH = 'commerce/counters.json';

const ORDER_ACTIVE = ['pending', 'accepted', 'prepping', 'cooking'];
const ORDER_STATUS = {
    pending: '待接单',
    accepted: '已接单',
    prepping: '备菜中',
    cooking: '制作中',
    served: '已出餐',
    completed: '已完成',
    cancelled: '已取消'
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DISH_TIME_OPTIONS = [40, 60, 90, 120];
const DISH_TAG_OPTIONS = ['下饭', '香辣', '酸甜'];
const DEFAULT_SERVING = {
    slots: [
        { id: 'sat-lunch', day: 6, time: '12:00', label: '午餐', emoji: '☀️' },
        { id: 'sat-dinner', day: 6, time: '20:00', label: '晚餐', emoji: '🌙' },
        { id: 'sun-lunch', day: 0, time: '12:00', label: '午餐', emoji: '☀️' },
        { id: 'sun-dinner', day: 0, time: '20:00', label: '晚餐', emoji: '🌙' }
    ],
    weeksAhead: 2,
    cutoffMinutes: 60,
    timezone: 'Asia/Shanghai'
};

const DEFAULT_OVERDRAFT = 50;
const DEFAULT_BALANCE = 520;

function pad2(value) {
    return String(value).padStart(2, '0');
}

function servingSettings(space) {
    const raw = (space && space.settings && space.settings.serving) || {};
    const slots = Array.isArray(raw.slots) && raw.slots.length ? raw.slots : DEFAULT_SERVING.slots;
    return {
        slots,
        weeksAhead: Number(raw.weeksAhead) || DEFAULT_SERVING.weeksAhead,
        cutoffMinutes: raw.cutoffMinutes == null ? DEFAULT_SERVING.cutoffMinutes : Number(raw.cutoffMinutes)
    };
}

/**
 * The next `weeksAhead` weekends' meal slots. Slots past their booking
 * cutoff stay in the list (for tracking) but are marked orderable:false.
 */
function upcomingSlots(space, now = new Date()) {
    const cfg = servingSettings(space);
    const wanted = Math.max(1, cfg.weeksAhead) * cfg.slots.length;
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    const slots = [];

    for (let offset = 0; offset <= Math.max(21, cfg.weeksAhead * 7 + 7); offset++) {
        const day = new Date(base);
        day.setDate(base.getDate() + offset);

        cfg.slots.forEach(raw => {
            if (Number(raw.day) !== day.getDay()) return;
            const parts = String(raw.time || '12:00').split(':').map(Number);
            const hour = parts[0] || 12;
            const minute = parts[1] || 0;
            const at = new Date(day);
            at.setHours(hour, minute, 0, 0);
            if (at <= now) return;

            const date = `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`;
            const time = `${pad2(hour)}:${pad2(minute)}`;
            const key = `${date.replace(/-/g, '')}-${time.replace(':', '')}`;

            slots.push({
                id: raw.id || key,
                key,
                date,
                time,
                label: raw.label || `${WEEKDAYS[at.getDay()]} ${time}`,
                emoji: raw.emoji || '🍽️',
                weekday: WEEKDAYS[at.getDay()],
                dateLabel: `${pad2(at.getMonth() + 1)}.${pad2(at.getDate())} ${WEEKDAYS[at.getDay()]}`,
                scheduledFor: `${date} ${time}`,
                orderable: at.getTime() - now.getTime() >= cfg.cutoffMinutes * 60000
            });
        });

        if (slots.length >= wanted) break;
    }

    return slots.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)).slice(0, wanted);
}

function findSlot(space, slotKey, now = new Date()) {
    return upcomingSlots(space, now).find(slot => slot.key === String(slotKey)) || null;
}

function makeError(code, message, extra) {
    const error = new Error(message);
    error.code = code;
    if (extra) Object.assign(error, extra);
    return error;
}

/* 两套口吻：
   大厨侧（newOrder / userCancel / nudge / dishRequest）是系统通知——事件名、人、菜、金额、
   要做什么，分行可扫读，不用 emoji、不出现订单号；
   用户侧（accepted / cooking / served）是男朋友发来的消息——我接下了、我在做什么、
   还要多久、你来看看，不出现金额和状态枚举。改模板时不要混用。 */
const BARK_TEMPLATE_DEFAULTS = {
    newOrder: {
        title: '新预约',
        subtitle: '{slot}',
        body: '{userLabel} 点了 {items}\n合计 {total} 币{noteBlock}\n去接单',
        url: '{adminUrl}'
    },
    userCancel: {
        title: '预约已取消',
        subtitle: '{slot}',
        body: '原定：{items}\n已退回 {refund} 币{reasonBlock}',
        url: '{adminUrl}'
    },
    nudge: {
        title: '催一催',
        subtitle: '{slot}',
        body: '{userLabel} 在等这单\n{items} · 当前「{status}」\n点开看看',
        url: '{adminUrl}'
    },
    dishRequest: {
        title: '新的我想吃',
        subtitle: '{dishName}',
        body: '{userLabel} 想吃这道菜\n点开菜单看看',
        url: '{adminUrl}'
    },
    accepted: {
        title: '这单我接下了 ❤️',
        subtitle: '{slot}',
        body: '记下了：{items}，到点我叫你',
        url: '{userOrderUrl}'
    },
    cooking: {
        title: '开始下厨了 🔥',
        subtitle: '{slot}',
        body: '正在做 {items}，大约 {etaMinutes} 分钟',
        url: '{userOrderUrl}'
    },
    served: {
        title: '饭菜做好了 ❤️',
        subtitle: '{slot}',
        body: '{items} 刚出锅，趁热吃 · 照片点开看看',
        url: '{userOrderUrl}'
    }
};

/* ---------- Bark (站外通知) ----------
   The key lives in space.settings.bark in the OSS document store.
   Sends are fire-and-forget: a failed push must never fail an order.
   ------------------------------------------------------------ */

function barkTarget(space, audience = 'admin') {
    const settings = (space && space.settings) || {};
    const bark = settings.bark || {};
    if (bark.enabled === false) return null;
    const key = String(audience === 'user'
        ? (bark.userKey || bark.key || '')
        : (bark.adminKey || bark.key || '')).trim();
    if (!key) return null;
    const server = String(bark.server || 'https://api.day.app')
        .replace(/\/+$/, '')
        .replace(/\/push$/, '');
    return { key, server };
}

function barkPageLink(audience) {
    if (typeof window === 'undefined' || !window.location) return '';
    try {
        return new URL(audience === 'user' ? 'index.html' : 'admin.html', window.location.href).href;
    } catch (error) {
        return '';
    }
}

function barkIcon(space) {
    const avatar = String((space && space.avatar) || '').trim();
    if (!avatar || /\.svg($|[?#])/i.test(avatar)) return '';
    if (/^https?:\/\//i.test(avatar)) return avatar;
    const links = ((space && space.settings) || {}).links || {};
    const base = links.user || barkPageLink('user');
    if (!base) return '';
    try {
        return new URL(avatar, base).href;
    } catch (error) {
        return '';
    }
}

function barkTemplate(space, event) {
    const configured = ((space && space.settings && space.settings.bark && space.settings.bark.templates) || {})[event] || {};
    return { ...(BARK_TEMPLATE_DEFAULTS[event] || {}), ...configured };
}

function renderBarkTemplate(value, variables) {
    return String(value == null ? '' : value).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
        variables[key] == null ? '' : String(variables[key]));
}

function barkOrderLink(base, slotKey) {
    if (!base || !slotKey || typeof window === 'undefined' || !window.location) return base || '';
    try {
        const url = new URL(base, window.location.href);
        url.searchParams.set('slot', slotKey);
        url.hash = 'order';
        return url.href;
    } catch (error) {
        return base;
    }
}

function barkVariables(space, order, extra = {}) {
    const settings = (space && space.settings) || {};
    const links = settings.links || {};
    const members = (space && space.members) || [];
    const user = members.find(member => member.role === 'user');
    const admin = members.find(member => member.role === 'admin');
    const slot = (order && order.slot) || {};
    const userUrl = links.user || barkPageLink('user');
    const userName = (user && user.name) || '';
    const note = (order && order.note) || '';
    const reason = (extra && extra.reason) || '';
    return {
        siteName: (space && space.name) || '',
        userName,
        userLabel: userName || 'TA',
        adminName: (admin && admin.name) || '',
        userUrl,
        adminUrl: links.admin || barkPageLink('admin'),
        userOrderUrl: barkOrderLink(userUrl, order && order.slotKey),
        orderId: (order && order.id) || '',
        slotKey: (order && order.slotKey) || '',
        slot: order ? orderSlotText(order) : '',
        date: slot.date || '',
        time: slot.time || '',
        weekday: slot.weekday || '',
        items: orderItemsText(order),
        itemCount: (order && order.items && order.items.length) || 0,
        total: order && order.total != null ? order.total : '',
        note,
        noteBlock: note ? `\n备注：${note}` : '',
        status: order ? (ORDER_STATUS[order.status] || order.status) : '',
        placedAt: (order && order.placedAt) || '',
        etaMinutes: order && order.etaMinutes != null ? order.etaMinutes : '',
        reason,
        reasonBlock: reason ? `\n原因：${reason}` : '',
        ...extra
    };
}

async function sendBark(space, options = {}) {
    // Test data must never send real pushes. ?bark=on is an explicit opt-in.
    if (typeof isTestEnv === 'function' && isTestEnv()) {
        const barkOn = typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('bark') === 'on';
        if (!barkOn) return false;
    }
    const {
        audience = 'admin',
        event,
        order,
        variables = {},
        template,
        title,
        subtitle,
        body,
        url,
        image
    } = options;
    const target = barkTarget(space, audience);
    if (!target) return false;
    const bark = (space && space.settings && space.settings.bark) || {};
    if (event && (bark.events || {})[event] === false) return false;

    const vars = barkVariables(space, order, variables);
    const tpl = template || (event ? barkTemplate(space, event) : null);
    let payloadTitle = title;
    let payloadSubtitle = subtitle;
    let payloadBody = body;
    let targetUrl = url;
    if (tpl) {
        payloadTitle = renderBarkTemplate(tpl.title, vars);
        payloadSubtitle = renderBarkTemplate(tpl.subtitle, vars);
        payloadBody = renderBarkTemplate(tpl.body, vars);
        targetUrl = renderBarkTemplate(tpl.url, vars);
    }
    if (!targetUrl) {
        const links = (space && space.settings && space.settings.links) || {};
        targetUrl = audience === 'user' ? links.user : links.admin;
    }
    if (!targetUrl) targetUrl = barkPageLink(audience);
    if (targetUrl && typeof window !== 'undefined' && window.location) {
        try { targetUrl = new URL(targetUrl, window.location.href).href; } catch (error) {}
    }

    const payload = {
        device_key: target.key,
        group: '恋爱空间',
        isArchive: '1',
        title: payloadTitle || '恋爱空间',
        body: payloadBody || ''
    };
    const icon = barkIcon(space);
    if (icon) payload.icon = icon;
    if (payloadSubtitle) payload.subtitle = payloadSubtitle;
    if (targetUrl) payload.url = targetUrl;
    if (image) payload.image = image;
    try {
        const response = await fetch(`${target.server}/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);
        return response.ok && (!result || result.code === 200);
    } catch (error) {
        console.warn('Bark 推送失败:', error);
        return false;
    }
}

function orderSlotText(order) {
    return order && order.slot
        ? `${order.slot.dateLabel} ${order.slot.label} · ${order.slot.time}`
        : '旧订单';
}

function orderItemsText(order) {
    return ((order && order.items) || []).map(item => item.name).join('、');
}

function firstServedImage(order) {
    const item = ((order && order.items) || []).find(entry => entry && entry.servedImage);
    return item ? String(item.servedImage) : '';
}

function dishImages(dish) {
    const images = Array.isArray(dish && dish.images)
        ? dish.images.map(image => String(image || '').trim()).filter(Boolean)
        : [];
    const main = String((dish && dish.image) || '').trim();
    if (main && !images.includes(main)) images.unshift(main);
    return [...new Set(images)];
}

function orderSummary(order) {
    return {
        id: order.id,
        status: order.status,
        total: order.total,
        itemCount: order.items.length,
        items: order.items.map(item => ({
            dishId: item.dishId,
            name: item.name,
            icon: item.icon,
            image: item.image || '',
            servedImage: item.servedImage || '',
            price: item.price
        })),
        note: order.note || '',
        placedAt: order.placedAt,
        updatedAt: order.updatedAt,
        etaMinutes: order.etaMinutes,
        slotKey: order.slotKey || null,
        scheduledFor: order.scheduledFor || null,
        slot: order.slot || null,
        thanks: order.thanks || null,
        lastNudgeAt: order.nudges && order.nudges.length
            ? order.nudges[order.nudges.length - 1].at
            : null,
        cancelled: order.status === 'cancelled' ? (order.cancelled || {}) : null
    };
}

const storageReady = typeof dbCollection === 'function' && typeof dbGetOrNull === 'function';

const orderCollection = typeof dbCollection === 'function'
    ? dbCollection(
        'commerce/orders',
        orderSummary,
        (a, b) => String(b.scheduledFor || b.placedAt || '').localeCompare(String(a.scheduledFor || a.placedAt || ''))
    )
    : null;

const couponCollection = typeof dbCollection === 'function'
    ? dbCollection(
        'commerce/coupons',
        coupon => coupon,
        (a, b) => Number(b.id) - Number(a.id)
    )
    : null;

const dishRequestCollection = typeof dbCollection === 'function'
    ? dbCollection(
        'commerce/dish-requests',
        request => request,
        (a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) ||
            String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))
    )
    : null;

function ensureStorage() {
    if (!storageReady || !orderCollection || !couponCollection || !dishRequestCollection) {
        throw new Error('页面脚本版本不一致（存储层未加载）。请强制刷新一下：电脑按 Ctrl/Cmd + Shift + R，手机请关闭页面重新打开。');
    }
}

function normalizeWallet(wallet) {
    const value = wallet || {};
    return {
        ownerId: value.ownerId || 'user',
        balance: Number(value.balance) || 0,
        overdraftLimit: value.overdraftLimit == null ? DEFAULT_OVERDRAFT : Number(value.overdraftLimit),
        updatedAt: value.updatedAt || '',
        entries: Array.isArray(value.entries) ? value.entries : []
    };
}

function normalizeMenu(menu) {
    const value = menu || {};
    return {
        updatedAt: value.updatedAt || '',
        categories: Array.isArray(value.categories) ? value.categories : [],
        dishes: Array.isArray(value.dishes) ? value.dishes : []
    };
}

/* ---------- reads ---------- */

async function loadSpace() {
    return dbGetOrNull(SPACE_PATH);
}

async function loadWallet() {
    return normalizeWallet(await dbGetOrNull(WALLET_PATH));
}

async function loadMenu() {
    return normalizeMenu(await dbGetOrNull(MENU_PATH));
}

async function loadCounters() {
    return (await dbGetOrNull(COUNTERS_PATH)) || { version: 1, order: 0, coupon: 0 };
}

async function listOrders() {
    return orderCollection.list();
}

async function getOrder(id) {
    return orderCollection.get(id);
}

async function listCoupons() {
    return couponCollection.list();
}

async function getCoupon(id) {
    ensureStorage();
    try {
        return await couponCollection.get(id);
    } catch (error) {
        if (error && (error.code === 'NoSuchKey' || error.status === 404)) return null;
        throw error;
    }
}

async function loadAppData() {
    ensureStorage();

    const [space, story, milestonesDoc, goalsDoc, citiesDoc, menu, wallet, orders, coupons] =
        await Promise.all([
            dbGetOrNull(SPACE_PATH),
            dbGetOrNull(STORY_PATH),
            dbGetOrNull(MILESTONES_PATH),
            dbGetOrNull(GOALS_PATH),
            dbGetOrNull(CITIES_PATH),
            dbGetOrNull(MENU_PATH),
            dbGetOrNull(WALLET_PATH),
            orderCollection.list(),
            couponCollection.list()
        ]);

    if (!space) {
        throw new Error(typeof isTestEnv === 'function' && isTestEnv()
            ? '测试库还没有数据，请先运行 scripts/clone-test-db.js'
            : '恋爱空间还没有初始化，请先运行 scripts/migrate-storage.js');
    }

    return {
        space,
        story: story || {},
        milestones: (milestonesDoc && milestonesDoc.items) || [],
        goals: (goalsDoc && goalsDoc.items) || [],
        cities: (citiesDoc && citiesDoc.items) || [],
        menu: normalizeMenu(menu),
        wallet: normalizeWallet(wallet),
        orders,
        coupons
    };
}

async function refreshOrderData() {
    const [orders, wallet] = await Promise.all([orderCollection.list(), loadWallet()]);
    return { orders, wallet };
}

async function loadAdminData() {
    const [data, dishRequests] = await Promise.all([loadAppData(), listDishRequests()]);
    return { ...data, dishRequests };
}

/* ---------- dish requests (我想吃) ---------- */

async function submitDishRequest({ name, image } = {}) {
    ensureStorage();
    const dishName = String(name || '').trim().slice(0, 30);
    if (!dishName) throw makeError('BAD_DISH_REQUEST', '先写一个菜名');
    const picture = String(image || '').trim().slice(0, 500);
    if (!/^https?:\/\//i.test(picture)) {
        throw makeError('BAD_DISH_REQUEST_IMAGE', '图片地址需要以 http 开头，或者直接拍照上传');
    }
    const now = nowStamp();
    const id = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const request = {
        id,
        name: dishName,
        image: picture,
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        dishId: null
    };
    await dishRequestCollection.save(id, request);
    loadSpace()
        .then(space => sendBark(space, {
            audience: 'admin',
            event: 'dishRequest',
            variables: { dishName: request.name },
            image: request.image
        }))
        .catch(() => {});
    return request;
}

async function listDishRequests() {
    ensureStorage();
    return dishRequestCollection.list();
}

async function getDishRequest(id) {
    ensureStorage();
    try {
        return await dishRequestCollection.get(id);
    } catch (error) {
        if (error && (error.code === 'NoSuchKey' || error.status === 404)) return null;
        throw error;
    }
}

async function approveDishRequest(requestId, input = {}) {
    ensureStorage();
    const request = await getDishRequest(requestId);
    if (!request) throw makeError('MISSING_DISH_REQUEST', '找不到这条申请');
    if (request.status !== 'pending') throw makeError('ALREADY_REVIEWED', '这条申请已经处理过了');

    const menu = await loadMenu();
    let dish = (menu.dishes || []).find(item =>
        String(item.sourceRequestId || '') === String(request.id));
    if (!dish) {
        if (!(Number(input.price) > 0)) throw makeError('BAD_PRICE', '请填写价格');
        const image = String(input.image || request.image || '').trim();
        const images = Array.isArray(input.images) && input.images.length ? input.images : [image];
        dish = await upsertDish({
            ...input,
            id: undefined,
            image,
            images,
            sourceRequestId: request.id
        });
    }

    await dishRequestCollection.save(request.id, {
        ...request,
        status: 'approved',
        reviewedAt: nowStamp(),
        dishId: dish.id
    });
    return dish;
}

async function rejectDishRequest(requestId) {
    ensureStorage();
    const request = await getDishRequest(requestId);
    if (!request) throw makeError('MISSING_DISH_REQUEST', '找不到这条申请');
    if (request.status !== 'pending') throw makeError('ALREADY_REVIEWED', '这条申请已经处理过了');
    const next = { ...request, status: 'rejected', reviewedAt: nowStamp() };
    await dishRequestCollection.save(request.id, next);
    return next;
}

/* ---------- ordering ---------- */

function snapshotDish(dish) {
    return {
        dishId: dish.id,
        name: dish.name,
        icon: dish.icon || '🍽️',
        image: dish.image || '',
        servedImage: '',
        price: Number(dish.price) || 0,
        prepMinutes: Number(dish.prepMinutes) || 10,
        categoryId: dish.categoryId || ''
    };
}

async function placeOrder({ slotKey, dishIds, note }) {
    ensureStorage();
    const ids = Array.isArray(dishIds) ? [...new Set(dishIds)] : [];
    if (!ids.length) throw makeError('EMPTY_CART', '还没有选菜');

    const [space, menu, wallet, orders] = await Promise.all([
        loadSpace(),
        loadMenu(),
        loadWallet(),
        orderCollection.list()
    ]);

    if (!space) throw makeError('NO_SPACE', '恋爱空间还没有初始化');

    const slot = findSlot(space, slotKey, new Date());
    if (!slot) throw makeError('SLOT_CLOSED', '这个饭点已经截止预约了，换一个饭点吧');
    if (!slot.orderable) throw makeError('SLOT_CLOSED', '这个饭点已经截止预约了（开饭前 1 小时关闭）');

    const taken = orders.find(order =>
        order.slotKey === slot.key &&
        ['pending', 'accepted', 'prepping', 'cooking', 'served'].includes(order.status)
    );
    if (taken) throw makeError('SLOT_TAKEN', '这个饭点已经约过啦，换一个饭点吧');

    const dishes = ids.map(id => menu.dishes.find(dish => String(dish.id) === String(id)));
    if (dishes.some(dish => !dish)) throw makeError('MISSING_DISH', '有菜品已经下架了，刷新一下菜单吧');
    if (dishes.some(dish => !dish.available)) throw makeError('SOLD_OUT', '有菜品刚刚售罄了，换一道吧');

    const items = dishes.map(snapshotDish);
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const available = wallet.balance + wallet.overdraftLimit;

    if (total > available) {
        throw makeError('INSUFFICIENT', '恋爱币不够啦', {
            shortfall: total - available
        });
    }

    const sequence = orders.filter(order => order.slotKey === slot.key).length + 1;
    const orderId = `${slot.key}-${pad2(sequence)}`;
    const now = nowStamp();
    const etaMinutes = Math.min(90, Math.max(10, ...items.map(item => item.prepMinutes)) + 5);

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBalance = wallet.balance - total;

    const order = {
        id: orderId,
        slotKey: slot.key,
        scheduledFor: slot.scheduledFor,
        slot: {
            id: slot.id,
            key: slot.key,
            date: slot.date,
            time: slot.time,
            label: slot.label,
            emoji: slot.emoji,
            weekday: slot.weekday,
            dateLabel: slot.dateLabel,
            scheduledFor: slot.scheduledFor
        },
        status: 'pending',
        items,
        total,
        etaMinutes,
        note: String(note || '').trim().slice(0, 80),
        placedAt: now,
        updatedAt: now,
        statusHistory: [{ status: 'pending', at: now, by: 'user' }],
        payment: {
            amount: total,
            balanceAfter: newBalance,
            transactionId,
            refundedAt: null,
            refundId: null
        },
        thanks: null,
        nudges: [],
        cancelled: null
    };

    const entry = {
        id: transactionId,
        type: 'order',
        amount: -total,
        balanceAfter: newBalance,
        orderId,
        note: `下单 ${orderId}：${items.map(item => item.name).join('、')}`,
        createdAt: now,
        by: 'user'
    };

    const nextWallet = {
        ...wallet,
        balance: newBalance,
        updatedAt: now,
        entries: [entry, ...wallet.entries].slice(0, 200)
    };

    await orderCollection.save(orderId, order);
    try {
        await dbPut(WALLET_PATH, nextWallet);
    } catch (error) {
        await orderCollection.remove(orderId);
        throw error;
    }

    sendBark(space, {
        audience: 'admin',
        event: 'newOrder',
        order,
        variables: { balance: newBalance }
    });

    return { order, wallet: nextWallet };
}

async function setOrderStatus(orderId, status, options = {}) {
    if (status === 'cancelled') return cancelOrder(orderId, options);

    const order = await getOrder(orderId);
    const by = options.by || 'admin';
    const allowed = {
        pending: ['accepted'],
        accepted: ['prepping'],
        prepping: ['cooking'],
        cooking: ['served'],
        served: ['completed']
    };

    if (!(allowed[order.status] || []).includes(status)) {
        throw makeError('BAD_TRANSITION', `不能从「${ORDER_STATUS[order.status]}」变成「${ORDER_STATUS[status]}」`);
    }
    if (status === 'completed' && by === 'user' && order.status !== 'served') {
        throw makeError('BAD_TRANSITION', '还没有出餐哦');
    }

    const now = nowStamp();
    order.status = status;
    order.updatedAt = now;
    order.statusHistory.push({ status, at: now, by });
    if (status === 'served') order.servedAt = now;
    if (status === 'completed') order.completedAt = now;

    await orderCollection.save(orderId, order);

    if (status === 'accepted' || status === 'cooking' || status === 'served') {
        const image = status === 'served' ? firstServedImage(order) : '';
        loadSpace()
            .then(space => sendBark(space, {
                audience: 'user',
                event: status,
                order,
                image
            }))
            .catch(() => {});
    }

    return order;
}

async function serveOrder(orderId, photos, options = {}) {
    ensureStorage();
    const by = options.by || 'admin';
    const order = await getOrder(orderId);
    if (order.status !== 'cooking') {
        throw makeError('BAD_TRANSITION', '只有制作中的订单才能出餐');
    }
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) throw makeError('EMPTY_ORDER', '这一单没有菜品');

    const urls = {};
    for (const item of items) {
        const url = String((photos || {})[item.dishId] || '').trim();
        if (!url) throw makeError('SERVE_PHOTO_REQUIRED', `请先给「${item.name}」拍一张成品图`);
        urls[item.dishId] = url;
    }

    const menu = await loadMenu();
    const now = nowStamp();
    for (const item of items) {
        const url = urls[item.dishId];
        item.servedImage = url;
        const dish = menu.dishes.find(entry => String(entry.id) === String(item.dishId));
        if (dish) {
            const gallery = dishImages(dish);
            if (!gallery.includes(url)) gallery.push(url);
            dish.images = gallery;
            if (!dish.image) dish.image = gallery[0] || '';
        }
    }

    await saveMenu(menu);

    order.status = 'served';
    order.updatedAt = now;
    order.servedAt = now;
    order.statusHistory.push({ status: 'served', at: now, by });
    await orderCollection.save(orderId, order);

    loadSpace()
        .then(space => sendBark(space, {
            audience: 'user',
            event: 'served',
            order,
            image: firstServedImage(order)
        }))
        .catch(() => {});

    return order;
}

async function cancelOrder(orderId, options = {}) {
    const by = options.by || 'admin';
    const order = await getOrder(orderId);

    if (!ORDER_ACTIVE.includes(order.status)) {
        throw makeError('NOT_ACTIVE', '这一单已经结束了');
    }
    if (by === 'user' && !['pending', 'accepted'].includes(order.status)) {
        throw makeError('COOKING', '大厨已经开始做了，取消要和大厨说一声');
    }
    if (order.payment && order.payment.refundedAt) {
        throw makeError('ALREADY_REFUNDED', '这一单已经退过啦');
    }

    const wallet = await loadWallet();
    const now = nowStamp();
    const refundId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBalance = wallet.balance + order.total;

    const nextWallet = {
        ...wallet,
        balance: newBalance,
        updatedAt: now,
        entries: [{
            id: refundId,
            type: 'refund',
            amount: order.total,
            balanceAfter: newBalance,
            orderId,
            note: `取消退款 ${orderId}`,
            createdAt: now,
            by
        }, ...wallet.entries].slice(0, 200)
    };

    const originalOrder = JSON.parse(JSON.stringify(order));
    order.status = 'cancelled';
    order.updatedAt = now;
    order.cancelled = {
        by,
        reason: String(options.reason || '').trim().slice(0, 80),
        at: now
    };
    order.payment.refundedAt = now;
    order.payment.refundId = refundId;
    order.statusHistory.push({ status: 'cancelled', at: now, by });

    await orderCollection.save(orderId, order);
    try {
        await dbPut(WALLET_PATH, nextWallet);
    } catch (error) {
        await orderCollection.save(orderId, originalOrder);
        throw error;
    }

    if (by === 'user') {
        loadSpace()
            .then(space => sendBark(space, {
                audience: 'admin',
                event: 'userCancel',
                order,
                variables: {
                    refund: order.total,
                    reason: (order.cancelled && order.cancelled.reason) || '',
                    balance: newBalance
                }
            }))
            .catch(() => {});
    }

    return { order, wallet: nextWallet };
}

async function completeOrder(orderId, by = 'user') {
    return setOrderStatus(orderId, 'completed', { by });
}

async function nudgeOrder(orderId) {
    const [order, space] = await Promise.all([getOrder(orderId), loadSpace()]);
    if (!space || !space.settings || space.settings.nudgeEnabled !== true) {
        throw makeError('NUDGE_OFF', '催一催还没有开启');
    }
    if (!ORDER_ACTIVE.includes(order.status)) {
        throw makeError('NOT_ACTIVE', '这一单已经结束了');
    }
    const nudges = order.nudges || [];
    const last = nudges.length ? new Date(nudges[nudges.length - 1].at.replace(/-/g, '/')).getTime() : 0;
    if (last && Date.now() - last < 5 * 60 * 1000) {
        throw makeError('NUDGE_COOLDOWN', '刚催过啦，再等等');
    }
    const now = nowStamp();
    order.nudges = [...nudges, { at: now }];
    order.updatedAt = now;
    await orderCollection.save(orderId, order);
    const placedAt = new Date(String(order.placedAt || '').replace(/-/g, '/')).getTime();
    const minutes = placedAt ? Math.max(1, Math.floor((Date.now() - placedAt) / 60000)) : '';
    sendBark(space, {
        audience: 'admin',
        event: 'nudge',
        order,
        variables: { minutes }
    });
    return order;
}

async function thankChef(orderId, note) {
    const order = await getOrder(orderId);
    if (!['served', 'completed'].includes(order.status)) {
        throw makeError('NOT_SERVED', '出餐后才能谢谢大厨');
    }
    order.thanks = {
        note: String(note || '谢谢大厨，超级好吃').trim().slice(0, 80),
        at: nowStamp()
    };
    order.updatedAt = order.thanks.at;
    await orderCollection.save(orderId, order);
    return order;
}

/* ---------- wallet ---------- */

async function grantCoins(amount, note) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw makeError('BAD_AMOUNT', '发币数量要大于 0');

    const wallet = await loadWallet();
    const now = nowStamp();
    const newBalance = wallet.balance + value;
    const nextWallet = {
        ...wallet,
        balance: newBalance,
        updatedAt: now,
        entries: [{
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'grant',
            amount: value,
            balanceAfter: newBalance,
            note: String(note || '大厨发的零花钱').trim().slice(0, 60),
            createdAt: now,
            by: 'admin'
        }, ...wallet.entries].slice(0, 200)
    };

    await dbPut(WALLET_PATH, nextWallet);
    return nextWallet;
}

async function setOverdraftLimit(limit) {
    const wallet = await loadWallet();
    wallet.overdraftLimit = Math.max(0, Math.floor(Number(limit) || 0));
    wallet.updatedAt = nowStamp();
    await dbPut(WALLET_PATH, wallet);
    return wallet;
}

/* ---------- menu ---------- */

async function saveMenu(menu) {
    const value = normalizeMenu(menu);
    value.updatedAt = nowStamp();
    await dbPut(MENU_PATH, value);
    return value;
}

function nearestDishTime(value) {
    const minutes = Number(value) || DISH_TIME_OPTIONS[0];
    return DISH_TIME_OPTIONS.reduce((best, option) =>
        Math.abs(option - minutes) < Math.abs(best - minutes) ? option : best, DISH_TIME_OPTIONS[0]);
}

function normalizeDishTags(tags) {
    const list = Array.isArray(tags)
        ? tags
        : String(tags || '').split(/[,，、\s]+/);
    return [...new Set(list
        .map(tag => String(tag).trim())
        .filter(tag => DISH_TAG_OPTIONS.includes(tag)))];
}

async function upsertDish(input) {
    const menu = await loadMenu();
    const name = String(input.name || '').trim();
    if (!name) throw makeError('BAD_DISH', '菜名不能为空');

    const index = menu.dishes.findIndex(item => String(item.id) === String(input.id));
    const existing = index >= 0 ? menu.dishes[index] : null;
    const existingImages = existing ? dishImages(existing) : [];
    const inputImages = Array.isArray(input.images) ? input.images : existingImages;
    const gallery = [...new Set(inputImages.map(image => String(image || '').trim()).filter(Boolean))];
    const mainImage = String(input.image || gallery[0] || (existing && existing.image) || '').trim();
    if (mainImage) {
        const mainIndex = gallery.indexOf(mainImage);
        if (mainIndex > 0) gallery.splice(mainIndex, 1);
        if (mainIndex !== 0) gallery.unshift(mainImage);
    }
    const dish = {
        id: input.id || `dish_${Date.now().toString(36)}`,
        categoryId: input.categoryId || (menu.categories[0] && menu.categories[0].id) || 'quick',
        name,
        description: String(input.description || '').trim().slice(0, 120),
        price: Math.max(0, Math.floor(Number(input.price) || 0)),
        prepMinutes: nearestDishTime(input.prepMinutes),
        icon: String(input.icon || (existing && existing.icon) || '🍽️').slice(0, 8),
        image: mainImage,
        images: gallery,
        tags: normalizeDishTags(input.tags),
        ingredients: String(input.ingredients || '').trim().slice(0, 500),
        available: input.available !== false,
        sourceRequestId: String(input.sourceRequestId || (existing && existing.sourceRequestId) || '').slice(0, 80),
        todaySpecial: input.todaySpecial == null
            ? !!(existing && existing.todaySpecial)
            : !!input.todaySpecial,
        order: existing ? (existing.order || index + 1) : menu.dishes.length + 1
    };

    if (existing) menu.dishes[index] = dish;
    else menu.dishes.push(dish);

    await saveMenu(menu);
    return dish;
}

async function deleteDish(id) {
    const menu = await loadMenu();
    menu.dishes = menu.dishes.filter(dish => String(dish.id) !== String(id));
    await saveMenu(menu);
    return menu;
}

async function toggleDish(id, field) {
    const menu = await loadMenu();
    const dish = menu.dishes.find(item => String(item.id) === String(id));
    if (!dish) throw makeError('MISSING_DISH', '找不到这道菜');
    if (field === 'available') dish.available = !dish.available;
    if (field === 'todaySpecial') dish.todaySpecial = !dish.todaySpecial;
    await saveMenu(menu);
    return dish;
}

/* ---------- coupons (kept for the existing weekly gift flow) ---------- */

async function addCoupon(coupon) {
    const [counters, coupons] = await Promise.all([loadCounters(), couponCollection.list()]);
    const maxId = coupons.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    const id = Math.max(Number(counters.coupon) || 0, maxId) + 1;
    const now = nowStamp();

    const doc = {
        id,
        icon: coupon.icon || '💆',
        title: String(coupon.title || '恋爱卡').trim(),
        duration: Number(coupon.duration) || 5,
        durationUnit: coupon.durationUnit || '分钟',
        acquiredDate: now,
        usedDate: null,
        status: 'available'
    };

    await couponCollection.save(id, doc);
    try {
        await dbPut(COUNTERS_PATH, { ...counters, coupon: id });
    } catch (error) {
        console.warn('卡券编号计数保存失败:', error);
    }
    return doc;
}

async function useCoupon(id) {
    ensureStorage();
    const coupon = await getCoupon(id);
    if (!coupon) throw makeError('COUPON_MISSING', '找不到这张卡');
    if (coupon.status === 'used') throw makeError('COUPON_USED', '这张卡已经用掉啦');
    coupon.status = 'used';
    coupon.usedDate = nowStamp();
    await couponCollection.save(id, coupon);
    return coupon;
}

async function deleteCoupon(id) {
    await couponCollection.remove(id);
}

/* ---------- space ---------- */

async function saveSpace(space) {
    space.updatedAt = nowStamp();
    await dbPut(SPACE_PATH, space);
    return space;
}

async function updateSpaceProfile({ name, avatar }) {
    const space = await loadSpace();
    if (name != null) {
        const nextName = String(name).trim();
        if (!nextName) throw makeError('EMPTY_SPACE_NAME', '空间名称不能为空');
        space.name = nextName.slice(0, 24);
    }
    if (avatar != null) space.avatar = String(avatar).trim();
    return saveSpace(space);
}

async function updateSpaceSettings(patch) {
    const space = await loadSpace();
    space.settings = { ...(space.settings || {}), ...(patch || {}) };
    return saveSpace(space);
}
