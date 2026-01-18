const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Handle ESM .js imports in TypeScript files (for react-grid-layout)
    '^\\.(.+)\\.js$': '.$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/page.tsx', // Exclude Next.js page files
    '!app/**/layout.tsx', // Exclude Next.js layout files
  ],
  // Generate a static HTML report under public/laboratory/3d_cam_test_suite
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: 'public/laboratory/3d_cam_test_suite',
        filename: 'index.html',
        expand: true,
        pageTitle: '3D‑CAM Test Suite'
      }
    ]
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
