#!/usr/bin/env node
/**
 * One-off update for the weekend-reservation release:
 * - adds space.settings.serving
 * - rewrites the menu to the 快手菜 / 硬核菜 seed with mock photos
 * - removes legacy slot-less orders (the pre-reservation test orders)
 * - resets the user wallet to 520 if no slot-based orders remain
 *
 * Usage:
 *   OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
 *   node scripts/update-schedule-menu.js [--dry-run]
 */
const OSS = require('ali-oss');
const menuSeed = require('./menu-seed');
const servingSeed = require('./serving-seed');

const DRY = process.argv.includes('--dry-run');
const DB_ROOT = (process.env.OSS_DB_ROOT || 'love-journey/db').replace(/\/+$/, '');

const client = new OSS({
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
});

function nowStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function getJSON(key, fallback = null) {
  try {
    const result = await client.get(`${DB_ROOT}/${key}`);
    return JSON.parse(result.content.toString());
  } catch (error) {
    if (error.status === 404 || error.code === 'NoSuchKey') return fallback;
    throw error;
  }
}

async function putJSON(key, value) {
  if (DRY) return;
  await client.put(`${DB_ROOT}/${key}`, Buffer.from(JSON.stringify(value, null, 2)), {
    mime: 'application/json'
  });
}

async function listOrderKeys() {
  const keys = [];
  let marker;
  do {
    const result = await client.list({
      prefix: `${DB_ROOT}/commerce/orders/`,
      marker,
      'max-keys': 1000
    });
    (result.objects || []).forEach(object => {
      if (!object.name.endsWith('/index.json')) keys.push(object.name);
    });
    marker = result.isTruncated ? result.nextMarker : null;
  } while (marker);
  return keys;
}

async function main() {
  console.log('=================================');
  console.log('周末预约 / 菜单更新');
  console.log('=================================');
  console.log(`db root: ${DB_ROOT}`);
  console.log(`mode: ${DRY ? 'dry-run' : 'write'}`);
  console.log('');

  const space = await getJSON('space.json');

  if (!space) throw new Error('space.json 不存在');

  const keys = await listOrderKeys();
  const kept = [];
  const legacy = [];
  for (const key of keys) {
    const doc = JSON.parse((await client.get(key)).content.toString());
    if (doc.slotKey) kept.push(doc);
    else legacy.push({ key, doc });
  }

  console.log(`订单文档: ${keys.length}（保留预约订单 ${kept.length}，清理旧订单 ${legacy.length}）`);
  legacy.forEach(item => console.log(`  - 删除旧订单 ${item.doc.id}`));

  const nextCounters = await getJSON('commerce/counters.json', { version: 1, order: 0, coupon: 0 });

  const nextSpace = {
    ...space,
    settings: {
      ...(space.settings || {}),
      serving: JSON.parse(JSON.stringify(servingSeed))
    },
    updatedAt: nowStamp()
  };

  const nextMenu = {
    updatedAt: nowStamp(),
    categories: JSON.parse(JSON.stringify(menuSeed.categories)),
    dishes: JSON.parse(JSON.stringify(menuSeed.dishes))
  };

  const keptItems = kept.map(order => ({
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
    slotKey: order.slotKey || null,
    scheduledFor: order.scheduledFor || null,
    slot: order.slot || null,
    thanks: order.thanks || null,
    lastNudgeAt: order.nudges && order.nudges.length ? order.nudges[order.nudges.length - 1].at : null,
    cancelled: order.status === 'cancelled' ? (order.cancelled || {}) : null
  }));

  const resetWallet = kept.length === 0;
  const now = nowStamp();

  if (DRY) {
    console.log('将写入 space.settings.serving:', JSON.stringify(servingSeed));
    console.log('将写入菜单:', menuSeed.categories.map(c => c.name).join(' / '), `共 ${menuSeed.dishes.length} 道`);
    console.log('将清理旧订单:', legacy.length);
    console.log('重置钱包:', resetWallet ? '是（520 / 50）' : '否（保留预约订单）');
    return;
  }

  await putJSON('space.json', nextSpace);
  await putJSON('commerce/menu.json', nextMenu);

  for (const item of legacy) {
    await client.delete(item.key);
  }

  await putJSON('commerce/orders/index.json', {
    version: 1,
    updatedAt: now,
    items: keptItems
  });

  if (resetWallet) {
    await putJSON('commerce/wallet.json', {
      ownerId: 'user',
      balance: 520,
      overdraftLimit: 50,
      updatedAt: now,
      entries: [{
        id: 'tx_open_gift',
        type: 'grant',
        amount: 520,
        balanceAfter: 520,
        note: '恋爱空间开张礼',
        createdAt: now,
        by: 'system'
      }]
    });
  }

  await putJSON('commerce/counters.json', {
    ...nextCounters,
    version: 1,
    order: resetWallet ? 0 : nextCounters.order,
    updatedAt: now
  });

  console.log('');
  console.log('完成:');
  console.log(`  serving: ${servingSeed.slots.length} 个周末饭点 / 提前 ${servingSeed.weeksAhead} 个周末 / 截止 ${servingSeed.cutoffMinutes} 分钟`);
  console.log(`  menu: ${menuSeed.categories.map(c => c.name).join(' / ')} / ${menuSeed.dishes.length} 道`);
  console.log(`  orders: 保留 ${kept.length}，删除 ${legacy.length}`);
  console.log(`  wallet: ${resetWallet ? '已重置为 520 / 50' : '未重置'}`);
}

main().catch(error => {
  console.error('更新失败:', error);
  process.exit(1);
});
