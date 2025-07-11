import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '夜職管理システム',
  description: 'キャバクラ・ラウンジ・スナック店舗管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="font-noto-sans-jp antialiased">
        {children}
      </body>
    </html>
  )
} 