import "./globals.css";

export const metadata = {
  title: "DSPatch - AI Operations Command Center",
  description:
    "DSPatch is a premium AI operations command center for intake, urgency detection, dispatch, and owner updates.",
  icons: {
    icon: "/dspatch_logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
