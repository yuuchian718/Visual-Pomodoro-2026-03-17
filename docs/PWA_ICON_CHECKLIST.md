# PWA Icon Checklist

本文档用于排查 PWA icon 不生效、显示旧图标、iOS 图标不更新、manifest 图标异常等问题。

## 1. 标准排查顺序

建议严格按这个顺序检查，不要一开始就怀疑浏览器缓存。

1. 先检查文件是否真实存在。
2. 再检查文件路径和文件名是否完全一致。
3. 再检查 `vite.config.ts` 的 manifest 配置。
4. 再检查 `index.html` 的 favicon / apple-touch-icon 标签。
5. 再检查 `public/sw.js` 缓存清单是否同步。
6. 最后再清理浏览器缓存、Service Worker 和主屏幕安装记录。

## 2. 文件层检查

确认以下文件都存在，并且尺寸正确：

- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

重点检查：

- `favicon-16x16.png` 必须真的是 `16x16`
- `favicon-32x32.png` 必须真的是 `32x32`
- `apple-touch-icon.png` 必须真的是 `180x180`
- `icon-192.png` 必须真的是 `192x192`
- `icon-512.png` 必须真的是 `512x512`
- 不要只有文件名对，实际尺寸却不对

## 3. `vite.config.ts` 检查

确认 `VitePWA` 配置中至少满足以下几点：

- `manifestFilename` 是 `manifest.json`
- `includeAssets` 包含 `apple-touch-icon.png`
- `manifest.icons` 中声明了：
  - `/icons/icon-192.png`
  - `/icons/icon-512.png`
- `sizes`、`type` 与真实文件一致
- 如果写了 `purpose: 'maskable'`，对应图片要能安全裁切

常见问题：

- manifest 里写的是 `/icon-192.png`，实际文件却在 `/icons/icon-192.png`
- `sizes` 写错
- 只配了 `192`，漏了 `512`
- 改了目录结构但没同步改 manifest

## 4. `index.html` 检查

确认包含以下内容：

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

重点检查：

- `href` 路径必须能直接访问
- `sizes` 必须和真实文件一致
- 不要把旧路径和新路径同时留在页面里
- 如果插件自动注入 manifest，就不要再手写一份重复 manifest link

## 5. `public/sw.js` 检查

确认缓存清单包含：

- `/manifest.json`
- `/favicon.ico`
- `/favicon-16x16.png`
- `/favicon-32x32.png`
- `/apple-touch-icon.png`
- `/icons/icon-192.png`
- `/icons/icon-512.png`

重点检查：

- 改了图标但忘了更新 `ASSETS_TO_CACHE`
- 改了缓存资源但没升级 `CACHE_NAME`
- Service Worker 还在返回旧缓存

结论：

- 文件已换新，但页面仍显示旧图标，优先怀疑 SW 缓存。
- manifest 正常，但 iOS 主屏幕图标不对，优先检查 `apple-touch-icon.png` 与 iOS 缓存。

## 6. 浏览器与设备验证顺序

### 桌面浏览器

1. 打开页面，确认标签页 favicon 是否更新。
2. 打开 DevTools > Application > Manifest。
3. 检查 manifest 是否成功加载。
4. 检查 icons 列表是否出现 `192` 和 `512`。
5. 直接访问以下路径确认返回的是新文件：
   - `/favicon-16x16.png`
   - `/favicon-32x32.png`
   - `/apple-touch-icon.png`
   - `/icons/icon-192.png`
   - `/icons/icon-512.png`

### Service Worker

1. 打开 DevTools > Application > Service Workers。
2. 确认当前生效的 SW 是否是预期版本。
3. 如果换过图标，确认 `CACHE_NAME` 已升级。
4. 必要时执行：
   - Unregister service worker
   - Clear storage
   - Hard reload

### iOS 主屏幕

1. 确认页面里有 `apple-touch-icon`。
2. 确认该文件尺寸是 `180x180`。
3. 如果旧图标还在，先删除主屏幕上的旧安装项。
4. 关闭 Safari 标签页后重新访问。
5. 再次“添加到主屏幕”。

说明：

- iOS 对主屏幕图标缓存比较激进，仅替换文件但不删安装项，经常看起来像“没有生效”。

## 7. 最常见的失败模式

### 现象 1：浏览器 tab 图标不对

优先排查：

- `index.html` 的 favicon 标签是否存在
- `href` 是否正确
- `favicon-16x16.png` 和 `favicon-32x32.png` 是否真的是对应尺寸
- 浏览器是否缓存了旧 favicon

### 现象 2：Manifest 里没有图标

优先排查：

- `vite.config.ts` 里是否正确配置 `manifest.icons`
- 图标路径是否使用了正确的绝对路径
- 构建产物里是否成功生成 `manifest.json`

### 现象 3：PWA 安装后图标不对

优先排查：

- `icon-192.png`、`icon-512.png` 是否被 manifest 正确引用
- `purpose: 'maskable'` 是否误用了不适合裁切的图片
- 设备是否使用了旧缓存

### 现象 4：iOS 添加到主屏幕后图标不对

优先排查：

- `apple-touch-icon.png` 是否存在
- `index.html` 是否声明了 `apple-touch-icon`
- 是否删除了旧主屏幕安装项再重新添加

### 现象 5：明明文件换了，页面还是旧图标

优先排查：

- `public/sw.js` 是否仍缓存旧文件
- `CACHE_NAME` 是否没有升级
- 浏览器缓存和 PWA 安装缓存是否都清理过

## 8. 可复制检查清单

每次新项目接入 PWA icon 时，按下面逐项打勾：

- [ ] `public/` 下已放入全部图标文件
- [ ] `public/icons/` 下已有 `icon-192.png` 和 `icon-512.png`
- [ ] `vite.config.ts` 已配置 `VitePWA.manifest.icons`
- [ ] `includeAssets` 已包含 `apple-touch-icon.png`
- [ ] `index.html` 已声明 favicon
- [ ] `index.html` 已声明 `apple-touch-icon`
- [ ] 自定义 `public/sw.js` 已缓存全部图标和 `manifest.json`
- [ ] 修改缓存清单后已升级 `CACHE_NAME`
- [ ] DevTools Manifest 已验证通过
- [ ] iOS 主屏幕已重新安装验证

## 9. 一句话原则

PWA icon 问题大多数不是“图片不对”，而是“同一套资源没有在文件、manifest、HTML、SW 缓存里保持完全一致”。
