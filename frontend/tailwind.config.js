/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: "#F9F6F0",
          warm: "#EAE4D9",
          deep: "#DFD7CA",
        },
        cocoa: {
          DEFAULT: "#2A1F1D",
          muted: "#5C4E4A",
        },
        ember: "#C05A3A",
        ochre: "#B9935A",
        background: "#F9F6F0",
        foreground: "#2A1F1D",
        border: "#DFD7CA",
        input: "#DFD7CA",
        ring: "#2A1F1D",
        primary: { DEFAULT: "#2A1F1D", foreground: "#F9F6F0" },
        secondary: { DEFAULT: "#EAE4D9", foreground: "#2A1F1D" },
        muted: { DEFAULT: "#EAE4D9", foreground: "#5C4E4A" },
        accent: { DEFAULT: "#C05A3A", foreground: "#F9F6F0" },
        destructive: { DEFAULT: "#B23A2A", foreground: "#F9F6F0" },
        card: { DEFAULT: "#F9F6F0", foreground: "#2A1F1D" },
        popover: { DEFAULT: "#F9F6F0", foreground: "#2A1F1D" },
      },
      fontFamily: {
        serif: ['"Bodoni Moda"', "ui-serif", "Georgia", "serif"],
        sans: ['Manrope', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "3px",
      },
      letterSpacing: {
        widest2: "0.22em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 1.2s ease-out both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
