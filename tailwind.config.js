/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4648d4',
        'primary-container': '#6063ee',
        'on-primary': '#ffffff',
        'on-primary-container': '#fffbff',
        'primary-fixed': '#e1e0ff',
        tertiary: '#00685d',
        'tertiary-container': '#008376',
        'on-tertiary-container': '#f4fffb',
        secondary: '#b4136d',
        'secondary-container': '#fd56a7',
        surface: '#f7f9fb',
        'surface-variant': '#e0e3e5',
        'surface-container': '#eceef0',
        'surface-container-low': '#f2f4f6',
        'on-surface': '#191c1e',
        'on-surface-variant': '#464554',
        'outline-variant': '#c7c4d7',
        background: '#f7f9fb',
        error: '#ba1a1a',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
