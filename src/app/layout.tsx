import { Web3Provider } from "@/components/providers/Web3Provider"
import { WalletButton } from "@/components/shared/WalletButton"
import { Space_Mono } from 'next/font/google';
import './theme.css'

const brutalist = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-brutalist',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${brutalist.variable} font-sans`}>
        <Web3Provider>
          <nav className="p-4 border-b-[4px] border-[#111111] flex justify-between items-center bg-[#f8f5eb] shadow-[0px_4px_0px_0px_#111111] relative z-10">
            <h1 className="logo-icon text-2xl font-bold tracking-widest text-[#111111] uppercase">VAULTMIND</h1>
            <WalletButton />
          </nav>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
