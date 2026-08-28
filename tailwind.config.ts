import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        horizon: {
          blue: "#2563EB",
          gold: "#F59E0B",
          navy: "#0F172A",
          cloud: "#F8FAFC",
        },
      },
      fontFamily: {
        heading: ["var(--font-montserrat)", "sans-serif"],
        body: ["var(--font-open-sans)", "sans-serif"],
      },
      backgroundImage: {
        "horizon-glow":
          "linear-gradient(180deg, #0F172A 0%, #142049 38%, #2563EB 72%, #F59E0B 100%)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rise": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.7s ease-out both",
        "rise": "rise 1.1s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
