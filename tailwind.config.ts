import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF1F3',
          100: '#FFE4E8',
          200: '#FECDD3',
          500: '#E31837',
          600: '#C91430',
          700: '#A70F28',
          800: '#881337',
          900: '#4C0519',
        },
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        'surface-muted': '#F1F5F9',
        border: '#E2E8F0',
        text: '#0F172A',
        'text-muted': '#475569',
        'text-subtle': '#64748B',
      },
    },
  },
  plugins: [],
};

export default config;
