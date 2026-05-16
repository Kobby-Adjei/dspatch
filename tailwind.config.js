export default {
  content: ["./app/**/*.{js,jsx}", "./dashboard/**/*.{html,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 80px rgba(255, 77, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
