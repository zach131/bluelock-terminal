import { Orbitron } from "next/font/google";
import { Metadata } from "next";

const orbitron = Orbitron({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BLUE LOCK TERMINAL",
  description: "DEVOUR OR BE DEVOURED",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={orbitron.className} style={{ margin: 0, backgroundColor: "#0A0A0A" }}>
        {children}
      </body>
    </html>
  );
}
