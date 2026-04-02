module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        stratum: {
          primary: '#002FA7',
          'primary-hover': '#002080',
          secondary: '#0F172A',
          critical: '#FF2A04',
          warning: '#FFC000',
          success: '#059669',
          surface: '#F8FAFC',
          'surface-hover': '#F1F5F9',
          border: '#E2E8F0',
          'border-hover': '#CBD5E1',
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
