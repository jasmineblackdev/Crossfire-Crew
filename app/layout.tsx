import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Crossfire Crew | Grab your crew. Join the battle.',description:'A tactical multiplayer arena for 2–8 players. Share a room code, choose a rifle or SMG, and race to 25 eliminations. No account required.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
