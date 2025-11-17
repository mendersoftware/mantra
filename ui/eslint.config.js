import reactConfig from '@northern.tech/eslint-config/react.js';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextVitals,
  ...reactConfig,
  {
    rules: {
      '@next/next/no-img-element': 'off'
    }
  }
];
