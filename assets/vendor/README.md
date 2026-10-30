# Third-party libraries (self-hosted)

These files are served from our own origin so the site does not depend on
`cdn.jsdelivr.net` / `gosspublic.alicdn.com`, which are unreliable inside WeChat
and on mainland mobile networks. ECharts and qrcodejs are lazy-loaded by
`loadScript()` in `js/app.js`; the OSS SDK is lazy-loaded by `loadOssSdk()` in
`js/oss-utils.js` on the first write (reads use a plain `fetch`).

| File | Library | Version | License | Source |
|---|---|---|---|---|
| `echarts.min.js` | Apache ECharts | 5.4.3 | Apache-2.0 | https://www.npmjs.com/package/echarts/v/5.4.3 |
| `qrcode.min.js` | qrcodejs | 1.0.0 | MIT | https://www.npmjs.com/package/qrcodejs/v/1.0.0 |
| `aliyun-oss-sdk-6.18.0.min.js` | Aliyun OSS SDK for JavaScript | 6.18.0 | MIT | https://github.com/ali-sdk/ali-oss/releases/tag/v6.18.0 |

Do not point the app back at a CDN for these files. When upgrading, replace the
file, update this table, and bump the cache token.
