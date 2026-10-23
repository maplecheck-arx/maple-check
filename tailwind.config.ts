import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: { lg: '8px', xl: '10px', '2xl': '12px', '3xl': '16px' },
      fontFamily: { sans: ['Segoe UI', 'system-ui', 'sans-serif'] },
      colors: {
        zinc: { 50:'#f6f6f3',100:'#f1f2ef',200:'#e3e5df',300:'#cbd1c9',400:'#737e77',500:'#606b65',600:'#505b55',700:'#3f4943',800:'#303933',900:'#252b29' },
        emerald: { 50:'#edf6f0',100:'#dfefe4',200:'#c8e2d1',300:'#a3cdb3',500:'#34865b',600:'#26734c',700:'#20633f',800:'#194f33',900:'#123b26' },
        amber: { 50:'#fff7e8',100:'#faeccd',200:'#ebd8b0',300:'#d8bb7d',500:'#a97624',600:'#93641c',700:'#855915',800:'#704b12',900:'#573a0d' },
        brand: {
          50: '#fdf0f2',
          100: '#f9dfe4',
          200: '#edbec8',
          500: '#c8223b',
          600: '#ad1b31',
          700: '#8f1428',
          800: '#761426',
          900: '#4c1120',
        },
        canvas: '#f6f6f3',
        surface: '#FFFFFF',
        'surface-muted': '#f1f2ef',
        border: '#e3e5df',
        text: '#252b29',
        'text-muted': '#606b65',
        'text-subtle': '#737e77',
      },
    },
  },
  plugins: [],
};

export default config;
