import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
