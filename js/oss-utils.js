/* ============================================================
   OSS document store
   The bucket is used as a small document database: each domain
   lives in its own JSON document, and append-heavy collections
   (orders, coupons) keep one document per record plus an index.
   ============================================================ */

let ossClient = null;

function initOSS() {
    if (typeof OSS === 'undefined') {
        console.error('OSS SDK 未加载');
        return false;
    }

    if (!ossClient) {
        ossClient = new OSS({
            region: OSS_CONFIG.region,
            bucket: OSS_CONFIG.bucket,
            accessKeyId: CryptoUtils.decrypt(OSS_CONFIG.ak),
            accessKeySecret: CryptoUtils.decrypt(OSS_CONFIG.sk)
        });
    }

    return true;
}

function dbRoot() {
    return String(OSS_CONFIG.dbRoot || 'love-journey/db').replace(/\/+$/, '');
}

function dbFullPath(path) {
    return `${dbRoot()}/${String(path).replace(/^\/+/, '')}`;
}

function isNotFound(error) {
    return !!error && (error.code === 'NoSuchKey' || error.status === 404);
}

async function dbGet(path) {
    if (!initOSS()) throw new Error('OSS 初始化失败');
    const result = await ossClient.get(dbFullPath(path));
    return JSON.parse(result.content.toString());
}

async function dbGetOrNull(path) {
    try {
        return await dbGet(path);
    } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
    }
}

async function dbPut(path, data) {
    if (!initOSS()) throw new Error('OSS 初始化失败');
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    await ossClient.put(dbFullPath(path), blob);
    return data;
}

async function dbDelete(path) {
    if (!initOSS()) throw new Error('OSS 初始化失败');
    await ossClient.delete(dbFullPath(path));
}

async function dbList(prefix) {
    if (!initOSS()) throw new Error('OSS 初始化失败');
    const keys = [];
    let marker;
    do {
        const result = await ossClient.list({
            prefix: dbFullPath(prefix),
            marker,
            'max-keys': 1000
        });
        (result.objects || []).forEach(object => keys.push(object.name));
        marker = result.isTruncated ? result.nextMarker : null;
    } while (marker);
    return keys.map(key => key.slice(dbRoot().length + 1));
}

/**
 * A collection keeps:
 *   <dir>/index.json      — read model, ordered summaries
 *   <dir>/<id>.json       — source of truth, one document per record
 *
 * The index is rebuilt from the documents if it is missing.
 */
function dbCollection(dir, summarize, compare) {
    const base = String(dir).replace(/^\/+|\/+$/g, '');
    const indexPath = `${base}/index.json`;
    const itemPath = id => `${base}/${id}.json`;

    return {
        async list() {
            const index = await dbGetOrNull(indexPath);
            if (index && Array.isArray(index.items)) return index.items;
            return this.rebuild();
        },

        async get(id) {
            return dbGet(itemPath(id));
        },

        async save(id, doc) {
            await dbPut(itemPath(id), doc);

            const index = (await dbGetOrNull(indexPath)) || { version: 1, items: [] };
            const items = (index.items || []).filter(item => String(item.id) !== String(id));
            items.push(summarize(doc));
            items.sort(compare || ((a, b) => String(a.id).localeCompare(String(b.id))));

            await dbPut(indexPath, {
                version: 1,
                updatedAt: nowStamp(),
                items
            });
            return doc;
        },

        async remove(id) {
            await dbDelete(itemPath(id));
            const index = await dbGetOrNull(indexPath);
            if (!index) return;
            const items = (index.items || []).filter(item => String(item.id) !== String(id));
            await dbPut(indexPath, {
                version: 1,
                updatedAt: nowStamp(),
                items
            });
        },

        async rebuild() {
            const keys = (await dbList(base)).filter(key => !key.endsWith('/index.json'));
            const docs = [];
            for (const key of keys) {
                try {
                    docs.push(await dbGet(key));
                } catch (error) {
                    if (!isNotFound(error)) throw error;
                }
            }
            const items = docs.map(summarize);
            items.sort(compare || ((a, b) => String(a.id).localeCompare(String(b.id))));
            await dbPut(indexPath, {
                version: 1,
                updatedAt: nowStamp(),
                items
            });
            return items;
        }
    };
}

function nowStamp(date) {
    const value = date instanceof Date ? date : new Date();
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function verifyPasscode(inputPasscode) {
    return inputPasscode === OSS_CONFIG.adminPasscode;
}
