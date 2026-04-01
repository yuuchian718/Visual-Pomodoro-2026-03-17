# PWA Icon Template

本文档沉淀的是本项目已经验证通过的 PWA icon 方案，目标是让新项目可以直接复制使用。

## 1. 适用范围

- Vite 项目
- 使用 `vite-plugin-pwa`
- 静态资源放在 `public/`
- 需要同时兼容：
  - 浏览器标签页 favicon
  - PWA manifest 图标
  - iOS 主屏幕 `apple-touch-icon`
  - 自定义 `public/sw.js` 预缓存

## 2. 推荐目录结构

```text
public/
├─ favicon.ico
├─ favicon-16x16.png
├─ favicon-32x32.png
├─ apple-touch-icon.png
├─ sw.js
└─ icons/
   ├─ icon-192.png
   └─ icon-512.png
```

说明：

- 根目录下的 favicon / apple-touch-icon 主要给浏览器和 iOS 使用。
- `public/icons/` 下的 `192` 和 `512` 主要给 manifest 使用。
- `public/sw.js` 的缓存清单必须和上面的真实文件保持一致。

## 3. 需要哪些图标文件

| 文件 | 用途 | 尺寸 | 格式 |
| --- | --- | --- | --- |
| `public/favicon.ico` | 兼容老浏览器和通用 favicon 回退 | 多尺寸封装均可 | `.ico` |
| `public/favicon-16x16.png` | 浏览器标签页 favicon | `16x16` | `PNG` |
| `public/favicon-32x32.png` | 浏览器标签页 favicon | `32x32` | `PNG` |
| `public/apple-touch-icon.png` | iOS 添加到主屏幕 | `180x180` | `PNG` |
| `public/icons/icon-192.png` | PWA manifest icon | `192x192` | `PNG` |
| `public/icons/icon-512.png` | PWA manifest icon | `512x512` | `PNG` |

## 4. 图标资源规范

- 推荐全部使用 `PNG`，只有 `favicon.ico` 单独保留为 `.ico`。
- 图标建议使用正方形源图，四周留足安全边距，避免被不同平台裁切。
- `icon-512.png` 同时可复用于 `purpose: "maskable"` 配置，但前提是这张图本身已经为安全裁切做过设计。
- 文件名尽量固定，不要随意改名。这样 `manifest`、`index.html`、`sw.js` 可以直接复用模板。

## 5. Vite manifest 标准写法

在 `vite.config.ts` 中使用 `vite-plugin-pwa`，保持如下结构：

```ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['apple-touch-icon.png'],
  filename: 'sw.js',
  manifestFilename: 'manifest.json',
  manifest: {
    name: 'Your App Name',
    short_name: 'YourApp',
    description: 'Your app description.',
    theme_color: '#10b981',
    background_color: '#000000',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
});
```

关键点：

- `includeAssets: ['apple-touch-icon.png']`
  - 让插件把该静态资源纳入产物处理范围。
- `filename: 'sw.js'`
  - 与项目实际使用的 service worker 文件名保持一致。
- `manifestFilename: 'manifest.json'`
  - 明确产出标准 manifest 文件名，便于排查和缓存。
- `start_url` 与 `scope`
  - 如果项目部署在根路径，统一使用 `/`。
  - 如果部署在子路径，`start_url`、`scope`、资源路径都要一起调整，不能只改一处。

## 6. `index.html` 标准写法

`index.html` 中保留以下标签：

```html
<!-- 标准 Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

<!-- iOS 专用 -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- Web App Manifest -->
<!-- VitePWA will automatically inject the manifest link -->
```

建议：

- 如果 `vite-plugin-pwa` 会自动注入 manifest，则不要手写重复的 `<link rel="manifest">`。
- favicon 和 `apple-touch-icon` 路径全部使用绝对路径，如 `/favicon-32x32.png`。
- `sizes` 必须与真实文件尺寸一致，避免浏览器识别异常。

## 7. `public/sw.js` 标准写法

`public/sw.js` 的核心要求不是复杂，而是和真实文件保持完全一致。

参考模板：

```js
const CACHE_NAME = 'your-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

保持一致的原则：

- 只要图标文件名或路径有任何改动，`ASSETS_TO_CACHE` 必须同步更新。
- 只要缓存资源列表有变更，`CACHE_NAME` 必须升级版本。
- `manifest.json`、`apple-touch-icon.png`、`icons/icon-192.png`、`icons/icon-512.png` 一定要在缓存清单里。
- 如果项目不需要手写 `public/sw.js`，可以不用照搬这份文件；但只要用了自定义 SW，就必须显式维护这份清单。

## 8. 新项目复制步骤

1. 复制以下文件到新项目 `public/`：
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `icons/icon-192.png`
   - `icons/icon-512.png`
2. 在 `vite.config.ts` 中加入 `VitePWA` 配置。
3. 在 `index.html` 中加入 favicon 和 `apple-touch-icon` 标签。
4. 如果项目使用自定义 `public/sw.js`，同步补齐缓存清单。
5. 启动项目后验证：
   - 浏览器 tab icon 是否正确
   - DevTools Application > Manifest 是否正确识别图标
   - iOS 加到主屏幕后图标是否正确
   - 修改资源后是否通过升级 `CACHE_NAME` 刷新缓存

## 9. 本项目已验证通过的落地版本

当前项目采用的真实映射关系如下：

- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `vite.config.ts` 中由 `vite-plugin-pwa` 生成 `manifest.json`
- `index.html` 中显式声明 favicon 与 `apple-touch-icon`
- `public/sw.js` 中手动缓存上述资源

这套组合已经验证可用，后续新项目优先直接复用，不建议随意改文件名或拆散目录。
