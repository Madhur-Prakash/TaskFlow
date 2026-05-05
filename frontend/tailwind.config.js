/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        'primary-hover': '#4338ca',
        danger: '#ef4444',
        'danger-hover': '#dc2626',
      },
    },
  },
  plugins: [],
};
