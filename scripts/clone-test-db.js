#!/usr/bin/env node
/**
 * Clone the production OSS document store into the test prefix.
 *
 *   npm install ali-oss
 *   OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
 *     node scripts/clone-test-db.js --dry-run
 *
 * Source is read-only. Target must contain "test" and can never equal the
 * source. Existing target data requires --force; --force deletes only the
 * target prefix before copying.
 *
 * Bark and 催一催 are disabled in the cloned space.json so test actions never
 * notify the real accounts.
 */

const fs = require('fs');
const path = require('path');
const OSS = require('ali-oss');

const REQUIRED = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];

function decryptConfig(encrypted) {
    const obfuscated = Buffer.from(encrypted, 'base64').toString('latin1');
    let reversed = '';
    for (let i = 0; i < obfuscated.length; i++) {
        reversed += String.fromCharCode(obfuscated.charCodeAt(i) - 3);
    }
    return Buffer.from(reversed.split('').reverse().join(''), 'base64').toString('utf8');
}

function configCredentials() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'oss-config.js'), 'utf8');
    const config = new Function(`${source}; return OSS_CONFIG;`)();
    return {
        region: config.region,
        bucket: config.bucket,
        accessKeyId: decryptConfig(config.ak),
        accessKeySecret: decryptConfig(config.sk)
    };
}

const present = REQUIRED.filter(key => process.env[key]);
let credentials;
if (present.length === REQUIRED.length) {
    credentials = {
        region: process.env.OSS_REGION,
        bucket: process.env.OSS_BUCKET,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
    };
} else if (present.length === 0) {
    credentials = configCredentials();
    console.log('未提供 OSS_* 环境变量，使用 js/oss-config.js 中的共享配置。');
} else {
    const missing = REQUIRED.filter(key => !process.env[key]);
    console.error(`环境变量不完整，缺少：${missing.join(', ')}；要么全部设置，要么全部不设置（读取 js/oss-config.js）。`);
    process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const source = String(process.env.SOURCE_DB_ROOT || 'love-journey/db').replace(/\/+$/, '');
const target = String(process.env.TARGET_DB_ROOT || 'love-journey/db-test').replace(/\/+$/, '');

if (!/test/i.test(target)) {
    console.error('目标路径必须包含 test，拒绝执行。');
    process.exit(1);
}
if (source === target) {
    console.error('源和目标相同，拒绝执行。');
    process.exit(1);
}

const client = new OSS(credentials);

async function listAll(prefix) {
    const keys = [];
    let marker;
    do {
        const result = await client.list({ prefix: `${prefix}/`, marker, 'max-keys': 1000 });
        (result.objects || []).forEach(object => keys.push(object.name));
        marker = result.isTruncated ? result.nextMarker : null;
    } while (marker);
    return keys;
}

async function deleteAll(keys) {
    for (let i = 0; i < keys.length; i += 1000) {
        await client.deleteMulti(keys.slice(i, i + 1000));
    }
}

async function main() {
    const sourceKeys = (await listAll(source)).sort();
    const targetKeys = (await listAll(target)).sort();
    console.log(`源：${source}（${sourceKeys.length} 个对象）`);
    console.log(`目标：${target}（${targetKeys.length} 个对象）`);

    if (dryRun) {
        targetKeys.slice(0, 20).forEach(key => console.log(`目标已有 ${key}`));
        if (targetKeys.length > 20) console.log(`……目标其余 ${targetKeys.length - 20} 个`);
        sourceKeys.slice(0, 20).forEach(key => console.log(`将复制 ${key} -> ${target}/${key.slice(source.length + 1)}`));
        if (sourceKeys.length > 20) console.log(`……其余 ${sourceKeys.length - 20} 个`);
        console.log('dry-run：未写入任何对象。');
        return;
    }
    if (targetKeys.length && !force) {
        console.error('目标非空。确认要覆盖测试库后加 --force。');
        process.exit(1);
    }

    if (targetKeys.length) {
        console.log('清理目标测试库……');
        await deleteAll(targetKeys);
    }

    for (const sourceKey of sourceKeys) {
        const rel = sourceKey.slice(source.length + 1);
        const result = await client.get(sourceKey);
        let content = result.content;
        if (rel === 'space.json') {
            const space = JSON.parse(content.toString());
            space.settings = space.settings || {};
            space.settings.bark = { ...(space.settings.bark || {}), enabled: false };
            space.settings.nudgeEnabled = false;
            content = Buffer.from(JSON.stringify(space, null, 2));
        }
        await client.put(`${target}/${rel}`, content, {
            headers: { 'Content-Type': rel.endsWith('.json') ? 'application/json' : 'application/octet-stream' }
        });
        console.log(`✓ ${rel}`);
    }
    console.log(`完成：${sourceKeys.length} 个对象已写入 ${target}；Bark / 催一催已关闭。`);
}

main().catch(error => {
    const code = error && (error.code || error.name);
    console.error(`克隆失败${code ? `（${code}）` : ''}：${error && error.message ? error.message : error}`);
    process.exit(1);
});
