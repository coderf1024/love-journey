#!/usr/bin/env node
/**
 * One-off migration: love-journey/config.json → love-journey/db/** documents.
 *
 * Usage:
 *   OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
 *   node scripts/migrate-storage.js [--dry-run] [--force]
 *
 * The legacy config.json is never modified. The new tree is created under
 * OSS_DB_ROOT (default love-journey/db). Existing documents are only
 * overwritten with --force.
 */
const fs = require('fs');
const path = require('path');
const OSS = require('ali-oss');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const FORCE = args.has('--force');

const cfg = {
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
};

const DB_ROOT = (process.env.OSS_DB_ROOT || 'love-journey/db').replace(/\/+$/, '');
const LEGACY_PATH = process.env.OSS_LEGACY_PATH || 'love-journey/config.json';

if (!cfg.region || !cfg.bucket || !cfg.accessKeyId || !cfg.accessKeySecret) {
  console.error('缺少 OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET');
  process.exit(1);
}

const client = new OSS(cfg);

function nowStamp(date = new Date()) {
  const pad = v => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function buildMenu() {
  return {
    updatedAt: nowStamp(),
    categories: [
      { id: 'hot', name: '热菜', icon: '🍳', order: 1 },
      { id: 'staple', name: '主食', icon: '🍚', order: 2 },
      { id: 'soup', name: '汤', icon: '🥣', order: 3 },
      { id: 'sweet', name: '甜品', icon: '🍓', order: 4 }
    ],
    dishes: [
      { id: 'dish_tomato_egg', categoryId: 'hot', name: '番茄炒蛋', description: '酸甜下饭，拌米饭一绝', price: 20, prepMinutes: 15, icon: '🍅', tags: ['家常', '酸甜'], available: true, todaySpecial: true, order: 1 },
      { id: 'dish_cola_wings', categoryId: 'hot', name: '可乐鸡翅', description: '甜甜咸咸，啃到停不下来', price: 35, prepMinutes: 25, icon: '🍗', tags: ['甜口', '下饭'], available: true, todaySpecial: false, order: 2 },
      { id: 'dish_braised_pork', categoryId: 'hot', name: '红烧肉', description: '慢炖出来的硬菜，配米饭', price: 45, prepMinutes: 45, icon: '🥩', tags: ['硬菜', '慢炖'], available: true, todaySpecial: true, order: 3 },
      { id: 'dish_potato_shreds', categoryId: 'hot', name: '酸辣土豆丝', description: '酸辣爽脆，开胃', price: 18, prepMinutes: 15, icon: '🥔', tags: ['酸辣', '爽口'], available: true, todaySpecial: false, order: 4 },
      { id: 'dish_mapo_tofu', categoryId: 'hot', name: '麻婆豆腐', description: '麻辣鲜香，很下饭', price: 22, prepMinutes: 15, icon: '🌶️', tags: ['麻辣', '下饭'], available: true, todaySpecial: false, order: 5 },
      { id: 'dish_green_veg', categoryId: 'hot', name: '清炒时蔬', description: '当季青菜，清爽解腻', price: 15, prepMinutes: 10, icon: '🥬', tags: ['清淡', '当季'], available: true, todaySpecial: false, order: 6 },
      { id: 'dish_sweet_sour_ribs', categoryId: 'hot', name: '糖醋排骨', description: '酸甜挂汁，招牌之一', price: 42, prepMinutes: 40, icon: '🍖', tags: ['酸甜', '招牌'], available: true, todaySpecial: false, order: 7 },
      { id: 'dish_egg_fried_rice', categoryId: 'staple', name: '蛋炒饭', description: '粒粒分明，十分钟搞定', price: 15, prepMinutes: 10, icon: '🍚', tags: ['快手'], available: true, todaySpecial: false, order: 8 },
      { id: 'dish_scallion_noodles', categoryId: 'staple', name: '葱油拌面', description: '葱香扑鼻，拌一拌就好', price: 18, prepMinutes: 12, icon: '🍜', tags: ['香', '快手'], available: true, todaySpecial: false, order: 9 },
      { id: 'dish_dumplings', categoryId: 'staple', name: '手工饺子', description: '现包现煮，蘸醋最好吃', price: 28, prepMinutes: 30, icon: '🥟', tags: ['现包'], available: true, todaySpecial: false, order: 10 },
      { id: 'dish_tomato_egg_soup', categoryId: 'soup', name: '番茄蛋汤', description: '酸酸暖暖，先喝一口', price: 12, prepMinutes: 10, icon: '🍲', tags: ['暖胃'], available: true, todaySpecial: false, order: 11 },
      { id: 'dish_seaweed_soup', categoryId: 'soup', name: '紫菜蛋花汤', description: '清清淡淡，配饭刚好', price: 10, prepMinutes: 8, icon: '🥣', tags: ['清淡'], available: true, todaySpecial: false, order: 12 },
      { id: 'dish_pear_soup', categoryId: 'sweet', name: '冰糖雪梨', description: '润润喉咙，甜甜的', price: 12, prepMinutes: 20, icon: '🍐', tags: ['润喉'], available: true, todaySpecial: false, order: 13 },
      { id: 'dish_yogurt_fruit', categoryId: 'sweet', name: '酸奶水果杯', description: '饭后的小甜头', price: 15, prepMinutes: 5, icon: '🍓', tags: ['清爽'], available: true, todaySpecial: false, order: 14 }
    ]
  };
}

function buildDocuments(legacy) {
  const now = nowStamp();
  const names = (legacy.loveStory && legacy.loveStory.names) || {};
  const you = clean(names.you) || '老李';
  const partner = clean(names.partner) || '福福';

  const milestones = (legacy.milestones || []).map((item, index) => ({
    ...item,
    id: `ms_${String(index + 1).padStart(3, '0')}`,
    title: clean(item.title),
    description: clean(item.description),
    order: index + 1
  }));

  const goals = (legacy.goals || []).map((item, index) => ({
    ...item,
    id: `goal_${String(index + 1).padStart(3, '0')}`,
    title: clean(item.title),
    order: index + 1
  }));

  const cities = (legacy.visitedCities || []).map((item, index) => ({
    ...item,
    id: `city_${String(index + 1).padStart(3, '0')}`,
    name: clean(item.name),
    description: clean(item.description)
  }));

  if (!cities.some(city => city.name === '古北水镇')) {
    cities.push({
      id: `city_${String(cities.length + 1).padStart(3, '0')}`,
      name: '古北水镇',
      date: '2026-06-16',
      description: '猫、扎染、长城'
    });
  }

  const coupons = (legacy.massageCoupons || []).map(coupon => ({
    id: coupon.id,
    icon: coupon.icon || '💆',
    title: clean(coupon.title) || '恋爱卡',
    duration: coupon.duration,
    durationUnit: coupon.durationUnit || '分钟',
    acquiredDate: coupon.acquiredDate,
    usedDate: coupon.usedDate || null,
    status: coupon.status || (coupon.usedDate ? 'used' : 'available')
  }));

  const maxCouponId = coupons.reduce((max, coupon) => Math.max(max, Number(coupon.id) || 0), 0);

  const docs = new Map();

  docs.set('space.json', {
    schemaVersion: 2,
    id: 'our-space',
    name: '我们的恋爱空间',
    createdAt: now,
    updatedAt: now,
    members: [
      { id: 'user', name: partner, role: 'user' },
      { id: 'chef', name: you, role: 'admin' }
    ],
    settings: {
      currency: '恋爱币',
      kitchenName: `${you}的小灶`,
      timezone: 'Asia/Shanghai'
    }
  });

  docs.set('content/story.json', { ...(legacy.loveStory || {}), updatedAt: now });
  docs.set('content/milestones.json', { version: 1, updatedAt: now, items: milestones });
  docs.set('content/goals.json', { version: 1, updatedAt: now, items: goals });
  docs.set('content/cities.json', { version: 1, updatedAt: now, items: cities });
  docs.set('commerce/menu.json', buildMenu());

  docs.set('commerce/wallet.json', {
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

  docs.set('commerce/counters.json', {
    version: 1,
    order: 0,
    coupon: maxCouponId,
    updatedAt: now
  });

  docs.set('commerce/orders/index.json', {
    version: 1,
    updatedAt: now,
    items: []
  });

  const couponIndex = coupons
    .slice()
    .sort((a, b) => Number(b.id) - Number(a.id));

  docs.set('commerce/coupons/index.json', {
    version: 1,
    updatedAt: now,
    items: couponIndex
  });

  coupons.forEach(coupon => {
    docs.set(`commerce/coupons/${coupon.id}.json`, coupon);
  });

  return {
    docs,
    summary: {
      story: legacy.loveStory && legacy.loveStory.title,
      milestones: milestones.length,
      goals: goals.length,
      cities: cities.length,
      coupons: coupons.length,
      maxCouponId,
      dishes: buildMenu().dishes.length
    }
  };
}

async function exists(key) {
  try {
    await client.head(key);
    return true;
  } catch (error) {
    if (error.status === 404 || error.code === 'NoSuchKey') return false;
    throw error;
  }
}

async function main() {
  console.log('=================================');
  console.log('恋爱空间存储迁移');
  console.log('=================================');
  console.log(`legacy: ${LEGACY_PATH}`);
  console.log(`db root: ${DB_ROOT}`);
  console.log(`mode: ${DRY_RUN ? 'dry-run' : 'write'}${FORCE ? ' +force' : ''}`);
  console.log('');

  if (!DRY_RUN && !FORCE && await exists(`${DB_ROOT}/space.json`)) {
    console.error(`${DB_ROOT}/space.json 已存在。确认要覆盖请加 --force。`);
    process.exit(1);
  }

  const legacyResult = await client.get(LEGACY_PATH);
  const legacy = JSON.parse(legacyResult.content.toString());
  const { docs, summary } = buildDocuments(legacy);

  console.log('将写入:', JSON.stringify(summary, null, 2));
  console.log(`文档数: ${docs.size}`);

  if (DRY_RUN) {
    const out = path.join('/tmp', 'love-db-preview');
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    for (const [key, value] of docs) {
      const file = path.join(out, key.replace(/\//g, '__'));
      fs.writeFileSync(file, JSON.stringify(value, null, 2));
    }
    console.log(`dry-run 预览已写到 ${out}`);
    return;
  }

  let done = 0;
  for (const [key, value] of docs) {
    await client.put(`${DB_ROOT}/${key}`, Buffer.from(JSON.stringify(value, null, 2)), {
      mime: 'application/json'
    });
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${docs.size}`);
  }

  const verify = JSON.parse((await client.get(`${DB_ROOT}/commerce/coupons/index.json`)).content.toString());
  const space = JSON.parse((await client.get(`${DB_ROOT}/space.json`)).content.toString());
  console.log('');
  console.log('验证:');
  console.log(`  space: ${space.name} / ${space.members.map(member => `${member.name}(${member.role})`).join(', ')}`);
  console.log(`  coupons index: ${verify.items.length}`);
  console.log(`  documents written: ${done}`);
  console.log('完成。旧的 config.json 未改动。');
}

main().catch(error => {
  console.error('迁移失败:', error);
  process.exit(1);
});
