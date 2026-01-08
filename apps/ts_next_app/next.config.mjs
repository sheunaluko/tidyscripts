// @ts-check

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.extensions.push(".ts", ".tsx");
    config.resolve.fallback = { fs: false };

    if (!isServer) {
      // Tell Webpack 'onnxruntime-web' is a global variable 'ort'
      // that will be loaded outside the bundle
      config.externals = {
        ...config.externals,
        'onnxruntime-web': 'ort',
        'onnxruntime-web/wasm': 'ort',
      };
    }

    config.plugins.push(new NodePolyfillPlugin());

    return config;
  },
}

export default nextConfig
