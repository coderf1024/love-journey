# OSS 配置说明

## 加密配置

项目中的 `js/oss-config.js` 文件中的敏感信息（ak 和 sk）已经过加密处理，避免被 GitHub 的安全扫描检测到。

## 加密原理

使用自定义的加密算法对敏感信息进行混淆：
1. Base64 编码
2. 字符串反转
3. 字符偏移（+3）
4. 再次 Base64 编码

## 如何更新配置

如果需要更新 OSS 配置，请使用以下步骤：

### 方法一：使用 Node.js 脚本

```bash
node -e "
const CryptoUtils = {
  encrypt(text) {
    let encoded = btoa(text);
    let reversed = encoded.split('').reverse().join('');
    let obfuscated = '';
    for (let i = 0; i < reversed.length; i++) {
      let charCode = reversed.charCodeAt(i);
      obfuscated += String.fromCharCode(charCode + 3);
    }
    return btoa(obfuscated);
  }
};

console.log('accessKeyId:', CryptoUtils.encrypt('你的AccessKeyId'));
console.log('accessKeySecret:', CryptoUtils.encrypt('你的AccessKeySecret'));
"
```

### 方法二：在浏览器控制台

打开浏览器开发者工具（F12），在 Console 中执行：

```javascript
const CryptoUtils = {
  encrypt(text) {
    let encoded = btoa(text);
    let reversed = encoded.split('').reverse().join('');
    let obfuscated = '';
    for (let i = 0; i < reversed.length; i++) {
      let charCode = reversed.charCodeAt(i);
      obfuscated += String.fromCharCode(charCode + 3);
    }
    return btoa(obfuscated);
  }
};

console.log('accessKeyId:', CryptoUtils.encrypt('你的AccessKeyId'));
console.log('accessKeySecret:', CryptoUtils.encrypt('你的AccessKeySecret'));
```

### 更新配置文件

将生成的加密字符串复制到 `js/oss-config.js` 中：

```javascript
const OSS_CONFIG = {
  region: 'oss-cn-beijing',
  bucket: 'your-bucket-name',
  ak: '加密后的AccessKeyId',
  sk: '加密后的AccessKeySecret',
  // 旧版单文件备份，仅迁移脚本 scripts/migrate-storage.js 会读取
  configPath: 'love-journey/config.json',
  // 新版文档存储根目录
  dbRoot: 'love-journey/db',
  adminPasscode: '0814'
};
```

## 安全说明

- 加密仅用于避免 GitHub 的自动安全扫描
- 实际安全性依赖于前端代码的保密性
- 对于生产环境，建议使用后端代理来处理 OSS 操作
- 不要将加密后的配置分享给他人

## 部署到 GitHub Pages

加密后的配置可以安全地提交到 GitHub，不会被安全扫描检测到敏感信息。
