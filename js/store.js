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

const ORDER_ACTIVE = ['pending', 'prepping', 'cooking'];
const ORDER_BLOCKING = ['pending', 'prepping', 'cooking', 'served'];
const ORDER_STATUS = {
    pending: '待接单',
    prepping: '备菜中',
    cooking: '制作中',
    served: '已出餐',
    completed: '已完成',
    cancelled: '已取消'
};

const DEFAULT_OVERDRAFT = 50;
const DEFAULT_BALANCE = 520;

function makeError(code, message, extra) {
    const error = new Error(message);
    error.code = code;
    if (extra) Object.assign(error, extra);
    return error;
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
            price: item.price
        })),
        note: order.note || '',
        placedAt: order.placedAt,
        updatedAt: order.updatedAt,
        etaMinutes: order.etaMinutes,
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
        (a, b) => Number(b.id) - Number(a.id)
    )
    : null;

const couponCollection = typeof dbCollection === 'function'
    ? dbCollection(
        'commerce/coupons',
        coupon => coupon,
        (a, b) => Number(b.id) - Number(a.id)
    )
    : null;

function ensureStorage() {
    if (!storageReady || !orderCollection || !couponCollection) {
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

function latestOrderSummary(orders) {
    if (!orders || !orders.length) return null;
    return orders.find(order => ORDER_ACTIVE.includes(order.status)) || orders[0];
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
        throw new Error('恋爱空间还没有初始化，请先运行 scripts/migrate-storage.js');
    }

    const latest = latestOrderSummary(orders);
    let latestOrder = null;
    if (latest) {
        try {
            latestOrder = await getOrder(latest.id);
        } catch (error) {
            console.warn('读取最新订单失败:', error);
        }
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
        latestOrder,
        coupons
    };
}

async function refreshOrderData() {
    const [orders, wallet] = await Promise.all([orderCollection.list(), loadWallet()]);
    const latest = latestOrderSummary(orders);
    let latestOrder = null;
    if (latest) {
        try {
            latestOrder = await getOrder(latest.id);
        } catch (error) {
            console.warn('读取最新订单失败:', error);
        }
    }
    return { orders, latestOrder, wallet };
}

async function loadAdminData() {
    return loadAppData();
}

/* ---------- ordering ---------- */

function snapshotDish(dish) {
    return {
        dishId: dish.id,
        name: dish.name,
        icon: dish.icon || '🍽️',
        price: Number(dish.price) || 0,
        prepMinutes: Number(dish.prepMinutes) || 10,
        categoryId: dish.categoryId || ''
    };
}

async function placeOrder({ dishIds, note }) {
    const ids = Array.isArray(dishIds) ? [...new Set(dishIds)] : [];
    if (!ids.length) throw makeError('EMPTY_CART', '还没有选菜');

    const [menu, wallet, orders, counters] = await Promise.all([
        loadMenu(),
        loadWallet(),
        orderCollection.list(),
        loadCounters()
    ]);

    const active = orders.find(order => ORDER_BLOCKING.includes(order.status));
    if (active) throw makeError('ACTIVE_ORDER', '还有一单在厨房里，等这顿吃完再点吧');

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

    const maxOrderId = (orders || []).reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
    const orderId = Math.max(Number(counters.order) || 0, maxOrderId) + 1;
    const now = nowStamp();
    const etaMinutes = Math.min(90, Math.max(10, ...items.map(item => item.prepMinutes)) + 5);

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBalance = wallet.balance - total;

    const order = {
        id: orderId,
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
        note: `下单 #${String(orderId).padStart(3, '0')}：${items.map(item => item.name).join('、')}`,
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

    try {
        await dbPut(COUNTERS_PATH, { ...counters, order: orderId });
    } catch (error) {
        console.warn('订单号计数保存失败，下次会自动校正:', error);
    }

    return { order, wallet: nextWallet };
}

async function setOrderStatus(orderId, status, options = {}) {
    if (status === 'cancelled') return cancelOrder(orderId, options);

    const order = await getOrder(orderId);
    const by = options.by || 'admin';
    const allowed = {
        pending: ['prepping'],
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
    return order;
}

async function cancelOrder(orderId, options = {}) {
    const by = options.by || 'admin';
    const order = await getOrder(orderId);

    if (!ORDER_ACTIVE.includes(order.status)) {
        throw makeError('NOT_ACTIVE', '这一单已经结束了');
    }
    if (by === 'user' && !['pending', 'prepping'].includes(order.status)) {
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
            note: `取消退款 #${String(orderId).padStart(3, '0')}`,
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

    return { order, wallet: nextWallet };
}

async function completeOrder(orderId, by = 'user') {
    return setOrderStatus(orderId, 'completed', { by });
}

async function nudgeOrder(orderId) {
    const order = await getOrder(orderId);
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

async function upsertDish(input) {
    const menu = await loadMenu();
    const name = String(input.name || '').trim();
    if (!name) throw makeError('BAD_DISH', '菜名不能为空');

    const dish = {
        id: input.id || `dish_${Date.now().toString(36)}`,
        categoryId: input.categoryId || (menu.categories[0] && menu.categories[0].id) || 'hot',
        name,
        description: String(input.description || '').trim().slice(0, 120),
        price: Math.max(0, Math.floor(Number(input.price) || 0)),
        prepMinutes: Math.max(1, Math.floor(Number(input.prepMinutes) || 10)),
        icon: String(input.icon || '🍽️').slice(0, 8),
        tags: Array.isArray(input.tags)
            ? input.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 5)
            : String(input.tags || '').split(/[,，、\s]+/).map(tag => tag.trim()).filter(Boolean).slice(0, 5),
        available: input.available !== false,
        todaySpecial: !!input.todaySpecial,
        order: Number(input.order) || (menu.dishes.length + 1)
    };

    const index = menu.dishes.findIndex(item => String(item.id) === String(dish.id));
    if (index >= 0) {
        dish.order = menu.dishes[index].order || dish.order;
        menu.dishes[index] = dish;
    } else {
        menu.dishes.push(dish);
    }

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
