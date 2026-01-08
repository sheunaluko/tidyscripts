# Next.js SSR Configuration for Browser-Only Libraries

## Minimal Required Configuration

This document explains the **minimal** configuration needed to use browser-only libraries (like `onnxruntime-web`, WebSpeech API, Web Audio API) in Next.js without SSR errors.

---

## The Problem

Browser-only libraries cause SSR errors in Next.js:
```
⨯ TypeError: Invalid URL
    at (ssr)/./lib/SileroVADClient.ts
```

---

## The Solution (3 Steps)

### 1. Add Webpack Externals

Edit `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Exclude browser-only packages from server-side bundling
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-web': 'commonjs onnxruntime-web',
        'onnxruntime-web/wasm': 'commonjs onnxruntime-web/wasm',
      });
    }

    return config;
  },
};

export default nextConfig;
```

**⚠️ CRITICAL:** You MUST restart the dev server after changing `next.config.mjs`!

**What this does:** Tells webpack "don't try to bundle these packages when building the server bundle."

### 2. Add 'use client' to Component

Add `'use client';` as the **first line** of your React component:

```typescript
// voice_interface.tsx
'use client';

import React from 'react';
// ... rest of imports and component code
```

**What this does:** Tells Next.js "this component and everything it imports should only run on the client."

### 3. Guard Server-Side Window Access

If you import packages that access `window` at import time (like `tidyscripts_web`), add guards:

```typescript
// useInterruptibleVoice.ts
import * as tsw from 'tidyscripts_web';

const getTTSStatus = useCallback(() => {
  // Guard against SSR
  if (typeof window === 'undefined') {
    return { available: false, isSpeaking: false };
  }

  // Safe to use tsw here
  const tts = tsw?.util?.voice_interface?.tts;
  // ...
}, []);
```

**What this does:** Prevents accessing browser-only APIs during SSR.

---

## What You DON'T Need

❌ **No need for 'use client' on library files** - The component-level directive is sufficient
❌ **No need for 'use client' on barrel exports** - Webpack externals handles the imports
❌ **No need for 'use client' on individual modules** - Component boundary propagates down

---

## How It Works

```
Component (voice_interface.tsx)
  ↓ [has 'use client'] ← Client boundary established here
  ↓
Imports (lib/useInterruptibleVoice.ts)
  ↓
More Imports (lib/SileroVADClient.ts)
  ↓
Browser Library (onnxruntime-web) ← Excluded by webpack externals
```

The combination of:
1. **Component-level 'use client'** = establishes client-only boundary
2. **Webpack externals** = prevents server bundling of browser libraries
3. **Window guards** = handles import-time window access

This creates a clean, minimal configuration.

---

## Files Modified

### Required Changes

1. **`next.config.mjs`**
   - Added webpack externals for `onnxruntime-web`

2. **`voice_interface.tsx`**
   - Has `'use client';` (was already present)

3. **`lib/useInterruptibleVoice.ts`**
   - Added `typeof window === 'undefined'` guards in `getTTSStatus()` and `cancelTTS()`

### No Changes Needed

All other files (lib files, barrel exports, VAD modules) work without `'use client'` directives!

---

## Testing Checklist

After configuration:

- [ ] Restart dev server (required after next.config.mjs changes)
- [ ] Page loads without 500 errors
- [ ] No `(ssr)` in error stack traces
- [ ] Component renders correctly
- [ ] Browser APIs work (VAD, WebSpeech, AudioContext)
- [ ] Production build succeeds (`npm run build`)

---

## Common Mistakes

### ❌ Mistake 1: Forgetting to restart dev server
**Fix:** After editing `next.config.mjs`, you MUST `Ctrl+C` and restart with `npm run dev`

### ❌ Mistake 2: Adding 'use client' everywhere
**Fix:** You only need it on the component file, not lib files or barrel exports

### ❌ Mistake 3: Missing webpack externals
**Fix:** The component 'use client' alone isn't enough - you need the webpack config too

### ❌ Mistake 4: 'use client' after comments
**Fix:** It must be the FIRST line of the file, before any comments or imports

---

## Why This Works

### Webpack Externals
- Prevents webpack from trying to bundle browser-only packages for the server
- Stops the "Invalid URL" error at build time

### Component 'use client'
- Tells Next.js the component is client-only
- Automatically makes all imports client-only (no need to mark each file)

### Window Guards
- Handles edge cases where imported modules access `window` during import
- Provides graceful fallback during SSR

---

## Example Error vs Fix

### Before (Error)
```
⨯ TypeError: Invalid URL
    at __webpack_require__ (webpack-runtime.js:33:43)
    at eval (./lib/SileroVADClient.ts:5:78)
    at (ssr)/./lib/SileroVADClient.ts
```

### After (Working)
```
✓ Compiled /laboratory/component_viewer in 12.4s
✓ Page loads successfully
✓ Component renders without errors
```

---

## Architecture: Voice Interface Stack (Updated)

```
┌─────────────────────────────────────────────────────────┐
│  VoiceInterface ('use client') ← Only 'use client' here │
│  ├─ useInterruptibleVoice                               │
│  │   ├─ @ricky0123/vad-react (useMicVAD hook)          │
│  │   │   └─ Handles VAD + ONNX Runtime internally      │
│  │   ├─ WebSpeechClient                                 │
│  │   │   └─ SpeechRecognition API (browser)            │
│  │   └─ tidyscripts_web ← Guarded with typeof window   │
└─────────────────────────────────────────────────────────┘
```

### What Changed (Dec 2025)
- **Removed**: Custom Silero VAD implementation, AudioProcessor, manual ONNX setup
- **Added**: `@ricky0123/vad-react` npm package
- **Reason**: Avoid Terser/webpack complexity, use maintained library

---

## Performance

- **Package size:** Handled by @ricky0123/vad-react (auto-downloads models)
- **CPU usage:** ~1-2% on modern hardware
- **Memory:** ~20-30MB
- **VAD latency:** <100ms speech detection

---

## Summary

**Minimal Next.js SSR fix for browser-only libraries:**

1. ✅ Add webpack externals to `next.config.mjs`
2. ✅ Add `'use client'` to component file only
3. ✅ Add `typeof window` guards for import-time window access
4. ✅ Restart dev server

That's it! No need to add `'use client'` to every file.

---

## Production Build Journey: The Terser Issue

### The Problem (Dec 2025)

After successfully fixing SSR errors in development, production builds failed with:

```
Failed to compile.

static/media/ort.bundle.min.c2a6bbb5.mjs from Terser
  x 'import.meta' cannot be used outside of module code.
```

### Root Cause Analysis

**Initial Architecture:**
- Custom Silero VAD implementation
- Manual ONNX Runtime setup with files in `public/vad/`
- Direct `onnxruntime-web` npm package usage

**The Issue:**
1. Next.js 14 webpack was trying to process `.mjs` files from `onnxruntime-web` package
2. These files contained ES module syntax (`import.meta`)
3. Despite setting `swcMinify: true`, Terser was still being used for static assets
4. Terser cannot parse ES module syntax with `import.meta`

### What We Tried (All Failed)

1. ❌ **Webpack externals** - Only works for server-side, not client bundles
2. ❌ **Explicitly setting `swcMinify: true`** - SWC only handles main code, not static assets
3. ❌ **Removing webpack-cli dependency** - Terser still invoked from webpack's optimization
4. ❌ **Filtering TerserPlugin from minimizer array** - Terser still ran on assets
5. ❌ **Disabling minification entirely** - Would hurt production performance
6. ❌ **Excluding .mjs files with loader rules** - Loaders don't exist / wrong approach
7. ❌ **Manual ONNX file management in public/**  - Files still got processed by webpack

### Why Manual ONNX Setup Failed

The fundamental issue: **Next.js webpack processes node_modules differently than public/ files**

- Files in `node_modules/onnxruntime-web/dist/*.mjs` → processed by webpack → hit Terser
- Files in `public/vad/*.mjs` → not processed, but package still imported from node_modules
- No clean way to tell webpack "use public/ files instead of node_modules files"

### The Solution: Use @ricky0123/vad-react

**Why This Works:**
The library avoids the Terser issue not through webpack configuration, but through **module format**:

1. **Pre-compiled to CommonJS**: The package is bundled as CommonJS, not ES modules
2. **Uses `require()` internally**: Gets `onnxruntime-web/dist/ort.min.js` (CommonJS)
3. **Avoids ES module resolution**: Never triggers `ort.bundle.min.mjs` (which has `import.meta`)
4. **Terser-safe**: All files are plain JavaScript without ES module syntax

**Technical Deep Dive:**

`onnxruntime-web` has conditional exports:
```json
{
  "exports": {
    "import": "./dist/ort.bundle.min.mjs",  // ← ES module (has import.meta)
    "require": "./dist/ort.min.js"           // ← CommonJS (no import.meta)
  }
}
```

Our custom implementation:
```typescript
import * as ort from 'onnxruntime-web';  // ES import → gets .mjs → Terser fails
```

The npm package:
```javascript
const vad_web_1 = require("@ricky0123/vad-web");  // CommonJS → gets .js → Terser succeeds
```

**The Real Issue:**
It wasn't a webpack/Terser configuration problem - it was an **ES module vs CommonJS import problem**. When Next.js sees `import`, it uses the ES module export (`.mjs` with `import.meta`). When it sees `require`, it uses the CommonJS export (`.js` without `import.meta`).

**Changes Made:**
```bash
# Install official VAD library
npm install @ricky0123/vad-react

# Remove custom implementation
rm -rf lib/vad/ lib/SileroVADClient.ts lib/audio-utils.ts public/vad/

# Update useInterruptibleVoice.ts to use useMicVAD hook
```

**New Configuration:**
```javascript
// next.config.mjs (simplified!)
const nextConfig = {
  swcMinify: true,

  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = 'eval-source-map';
    }

    // Handle .wasm files from @ricky0123/vad-react
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};
```

### ✅ Current Status: WORKING

- ✅ Development builds work
- ✅ Production builds work
- ✅ No Terser errors
- ✅ SWC minification working correctly
- ✅ Simpler codebase (~500 lines removed)
- ✅ Better maintained (using npm package vs custom code)

**Build Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Static pages generated
```

### Key Takeaways

**When facing webpack/bundler issues with complex libraries:**
1. Check if an official React integration exists (e.g., `@ricky0123/vad-react`)
2. Don't fight the bundler - use libraries that handle it for you
3. Manual ONNX/WASM setup in Next.js is complex - avoid if possible
4. Trust maintained packages over custom implementations for bundler compatibility

**Module format matters:**
- ES module imports (`import`) trigger different package exports than CommonJS (`require`)
- Libraries with `import.meta` in ES modules will fail Terser minification
- Pre-compiled CommonJS packages avoid this by using `require()` internally
- Sometimes the solution isn't webpack config - it's using the right module format

**Debugging checklist for similar issues:**
1. Check if the error is from an `.mjs` file (ES module)
2. Look for `import.meta` in the failing file (Terser can't handle it)
3. Check the library's package.json `exports` field for conditional exports
4. Consider whether a CommonJS-based wrapper package exists
5. Don't assume webpack config is the answer - module format often is

---

## References

- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Next.js Webpack Configuration](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
- [Next.js SWC Minification](https://nextjs.org/docs/architecture/nextjs-compiler#minification)
