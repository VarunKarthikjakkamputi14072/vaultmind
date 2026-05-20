import { Web3Provider } from "@/components/providers/Web3Provider"
import { WalletButton } from "@/components/shared/WalletButton"
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        <Web3Provider>
          <nav className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h1 className="text-xl font-bold text-indigo-400 tracking-wider">CHAINVAULT</h1>
            <WalletButton />
          </nav>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
