/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#9c9a66',
        secondary: '#bf9d70',
        background: '#f9f5f0',
        'background-alt': '#faf8f5',

        iyengar: '#9c9a66',
        ashtanga: '#7a6b5f',
        flow: '#b8a68e',
        teen: '#d4b5a0',
        'donna-gravidanza': '#c89797',

        'text-main': '#2a2a2a',
        'text-secondary': '#6b6b6b',

        border: '#e8e4df',
        error: '#c95a4a',
        success: '#7a9d6e',
      },
      fontFamily: {
        serif: ['"New York"', 'Cormorant Garamond', 'Playfair Display', 'EB Garamond', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        'display':        ['64px', { lineHeight: '1.1',  letterSpacing: '-0.01em' }],
        'display-mobile': ['44px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h1':             ['48px', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
        'h1-mobile':      ['36px', { lineHeight: '1.2' }],
        'h2':             ['36px', { lineHeight: '1.2' }],
        'h2-mobile':      ['28px', { lineHeight: '1.25' }],
        'h3':             ['24px', { lineHeight: '1.3' }],
        'h3-mobile':      ['22px', { lineHeight: '1.3' }],
        'h4':             ['20px', { lineHeight: '1.3' }],
        'body':           ['16px', { lineHeight: '1.6' }],
        'small':          ['14px', { lineHeight: '1.5' }],
        'tiny':           ['12px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      spacing: {
        '5xl': '128px',
        '6xl': '160px',
      },
      borderRadius: {
        'sm':   '4px',
        'md':   '8px',
        'lg':   '16px',
        'full': '9999px',
      },
      boxShadow: {
        'sm':    '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md':    '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg':    '0 12px 24px rgba(0, 0, 0, 0.10)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth':  'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      maxWidth: {
        'narrow':    '800px',
        'container': '1280px',
        'wide':      '1440px',
      },
    },
  },
  plugins: [],
};
