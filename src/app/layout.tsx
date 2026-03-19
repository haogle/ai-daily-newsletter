import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Daily Newsletter",
  description: "AI / 大模型行业日报 - 每日自动生成",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
