# Third-party libraries (self-hosted)

These files are served from our own origin so the site does not depend on
`cdn.jsdelivr.net`, which is unreliable inside WeChat and on mainland mobile
networks. They are lazy-loaded by `loadScript()` in `js/app.js`.

| File | Library | Version | License | Source |
|---|---|---|---|---|
| `echarts.min.js` | Apache ECharts | 5.4.3 | Apache-2.0 | https://www.npmjs.com/package/echarts/v/5.4.3 |
| `qrcode.min.js` | qrcodejs | 1.0.0 | MIT | https://www.npmjs.com/package/qrcodejs/v/1.0.0 |

Do not point the app back at a CDN for these files. When upgrading, replace the
file, update this table, and bump the cache token.
