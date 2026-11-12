import type { Metadata, Viewport } from "next"; import "./globals.css";
export const metadata:Metadata={title:"Cross-border Shopping",description:"Order from China, Thailand and Vietnam",manifest:"/manifest.webmanifest"};
export const viewport:Viewport={themeColor:"#102a43",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
