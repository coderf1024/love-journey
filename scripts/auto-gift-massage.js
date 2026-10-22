const OSS = require('ali-oss');

const config = {
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
};

const DB_ROOT = (process.env.OSS_DB_ROOT || 'love-journey/db').replace(/\/+$/, '');

const couponConfig = {
  duration: parseInt(process.env.COUPON_DURATION, 10) || 5,
  title: process.env.COUPON_TITLE || '每周按摩卡'
};

const client = new OSS(config);

function formatDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
  await client.put(`${DB_ROOT}/${key}`, Buffer.from(JSON.stringify(value, null, 2)), {
    mime: 'application/json'
  });
}

async function listCouponDocs() {
  const keys = [];
  let marker;
  do {
    const result = await client.list({
      prefix: `${DB_ROOT}/commerce/coupons/`,
      marker,
      'max-keys': 1000
    });
    (result.objects || []).forEach(object => {
      if (!object.name.endsWith('/index.json')) keys.push(object.name);
    });
    marker = result.isTruncated ? result.nextMarker : null;
  } while (marker);

  const docs = [];
  for (const key of keys) {
    const result = await client.get(key);
    docs.push(JSON.parse(result.content.toString()));
  }
  return docs;
}

async function addMassageCoupon(coupon) {
  const index = await getJSON('commerce/coupons/index.json', null);
  const items = index && Array.isArray(index.items) ? index.items : await listCouponDocs();
  const counters = await getJSON('commerce/counters.json', { version: 1, order: 0, coupon: 0 });

  const maxId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const id = Math.max(Number(counters.coupon) || 0, maxId) + 1;

  const doc = {
    id,
    icon: coupon.icon || '💆',
    title: coupon.title,
    duration: coupon.duration,
    durationUnit: coupon.durationUnit,
    acquiredDate: formatDate(new Date()),
    usedDate: null,
    status: 'available'
  };

  await putJSON(`commerce/coupons/${id}.json`, doc);

  const nextItems = [doc, ...items.filter(item => String(item.id) !== String(id))]
    .sort((a, b) => Number(b.id) - Number(a.id));

  await putJSON('commerce/coupons/index.json', {
    version: 1,
    updatedAt: formatDate(new Date()),
    items: nextItems
  });

  await putJSON('commerce/counters.json', {
    ...counters,
    version: 1,
    coupon: id,
    updatedAt: formatDate(new Date())
  });

  return doc;
}

async function main() {
  console.log('=================================');
  console.log('开始自动赠送按摩卡');
  console.log('=================================');
  console.log(`标题: ${couponConfig.title}`);
  console.log(`时长: ${couponConfig.duration} 分钟`);
  console.log(`db root: ${DB_ROOT}`);
  console.log('');

  try {
    const requiredEnvVars = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
    }

    const coupon = {
      icon: '💆',
      title: couponConfig.title,
      duration: couponConfig.duration,
      durationUnit: '分钟'
    };

    const result = await addMassageCoupon(coupon);

    console.log('按摩卡赠送成功！');
    console.log('---------------------------------');
    console.log(`ID: ${result.id}`);
    console.log(`标题: ${result.title}`);
    console.log(`时长: ${result.duration} ${result.durationUnit}`);
    console.log(`获取时间: ${result.acquiredDate}`);
    console.log(`状态: ${result.status}`);
    console.log('=================================');
  } catch (error) {
    console.error('赠送失败:', error.message);
    process.exit(1);
  }
}

main();
