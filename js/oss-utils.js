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
    // The bucket's browser CORS rule allows GET/POST/PUT but not DELETE.
    // OSS's multi-object delete uses POST ?delete, so use that for a single key.
    await ossClient.deleteMulti([dbFullPath(path)]);
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

/* ---------- dish photo uploads ----------
   Dishes live in the JSON store; their photos are plain objects under
   love-journey/uploads/dishes/ in the same public-read bucket.
   -------------------------------------------------------------- */

const DISH_UPLOAD_PREFIX = 'love-journey/uploads/dishes/';
const DISH_REQUEST_UPLOAD_PREFIX = 'love-journey/uploads/requests/';
const SPACE_UPLOAD_PREFIX = 'love-journey/uploads/space/';
const DISH_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const DISH_UPLOAD_MAX_DIMENSION = 1600;
const DISH_UPLOAD_QUALITY = 0.82;

function dishUploadUrl(key) {
    return `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com/${key}`;
}

function sanitizeDishUploadName(name) {
    const base = String(name || '')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 40);
    return base || 'photo';
}

function dishUploadExtension(file) {
    const allowed = { jpeg: 'jpg', jpg: 'jpg', png: 'png', gif: 'gif', webp: 'webp', bmp: 'bmp' };
    const fromName = (String(file && file.name || '').match(/\.([a-z0-9]+)$/i) || [])[1];
    if (fromName && allowed[fromName.toLowerCase()]) return allowed[fromName.toLowerCase()];
    const fromType = String(file && file.type || '').split('/')[1];
    return (fromType && allowed[fromType.toLowerCase()]) || 'jpg';
}

function loadImageSource(file) {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file, { imageOrientation: 'from-image' })
            .catch(() => createImageBitmap(file))
            .catch(() => null)
            .then(bitmap => {
                if (bitmap) return bitmap;
                return loadImageElement(file);
            });
    }
    return loadImageElement(file);
}

function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('图片读取失败'));
        };
        image.src = url;
    });
}

/**
 * Downscale a photo to at most DISH_UPLOAD_MAX_DIMENSION on its long edge
 * and re-encode it as JPEG. Photos have no alpha, so transparency is
 * flattened onto white. Throws so callers can fall back to the original.
 */
async function compressDishImage(file) {
    const image = await loadImageSource(file);
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    if (!width || !height) throw new Error('无法读取图片尺寸');

    const scale = Math.min(1, DISH_UPLOAD_MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持图片压缩');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    if (typeof image.close === 'function') image.close();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', DISH_UPLOAD_QUALITY));
    if (!blob) throw new Error('图片压缩失败');
    return { blob, width: targetWidth, height: targetHeight, scaled: scale < 1 };
}

/**
 * Upload a photo to OSS and resolve with its public URL.
 * @param {File} file
 * @param {string} prefix folder under the bucket, e.g. DISH_UPLOAD_PREFIX
 * @returns {Promise<string>} https://<bucket>.<region>.aliyuncs.com/<key>
 */
async function uploadBucketImage(file, prefix) {
    if (!initOSS()) throw new Error('OSS 初始化失败，请检查网络后重试');
    if (!file) throw new Error('请选择一张照片');

    const type = String(file.type || '').toLowerCase();
    const isImage = type.startsWith('image/') ||
        /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(file.name || ''));
    if (!isImage) throw new Error('只能上传图片文件');
    if (file.size > DISH_UPLOAD_MAX_BYTES) throw new Error('图片不能超过 20MB');

    let blob = file;
    let contentType = type || 'application/octet-stream';
    let extension = dishUploadExtension(file);

    try {
        const compressed = await compressDishImage(file);
        // Re-encoding an already small photo can grow it; only prefer the
        // compressed copy when it is smaller or when it was actually downscaled.
        if (compressed.scaled || compressed.blob.size < file.size) {
            blob = compressed.blob;
            contentType = 'image/jpeg';
            extension = 'jpg';
        }
    } catch (error) {
        console.warn('图片压缩失败，改为上传原图:', error);
    }

    const stamp = nowStamp().replace(/[-: ]/g, '');
    const random = Math.random().toString(36).slice(2, 8);
    const key = `${prefix}${stamp}-${random}-${sanitizeDishUploadName(file.name)}.${extension}`;

    await ossClient.put(key, blob, { headers: { 'Content-Type': contentType } });
    return dishUploadUrl(key);
}

async function uploadDishImage(file) {
    return uploadBucketImage(file, DISH_UPLOAD_PREFIX);
}

async function uploadDishRequestImage(file) {
    return uploadBucketImage(file, DISH_REQUEST_UPLOAD_PREFIX);
}

async function uploadSpaceImage(file) {
    return uploadBucketImage(file, SPACE_UPLOAD_PREFIX);
}
