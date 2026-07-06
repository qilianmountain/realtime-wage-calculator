import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "实时工资计算器",
  description: "按日薪和工作时间实时计算今天已经赚到的工资。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
