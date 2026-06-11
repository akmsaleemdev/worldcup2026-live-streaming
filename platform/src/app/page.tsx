import Link from "next/link";
import { PlayCircle, ChevronRight, Calendar } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050B16] text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col justify-center overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/20 via-transparent to-[#00FFB3]/10 opacity-50 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518605368461-1e128222204b?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay z-0"></div>
        
        <div className="container mx-auto px-6 relative z-10 max-w-7xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A] border border-[#00D4FF]/30 text-[#00D4FF] text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            FIFA World Cup 2026™
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black font-orbitron tracking-tight mb-6 leading-none">
            WITNESS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#00FFB3]">GREATNESS.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 font-sans leading-relaxed">
            The ultimate sports streaming platform. Experience every goal, every tackle, and every moment of the World Cup in stunning high definition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/live" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#00FFB3] text-slate-900 font-bold hover:scale-105 transition-transform duration-300">
              <PlayCircle className="w-5 h-5" />
              Watch Live Now
            </Link>
            <Link href="/matches" className="glass inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg text-white font-semibold hover:bg-slate-800 transition-colors duration-300">
              <Calendar className="w-5 h-5" />
              Match Schedule
            </Link>
          </div>
        </div>

        {/* Live Ticker Bar */}
        <div className="absolute bottom-0 left-0 w-full glass border-t border-white/10 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap py-3">
            <span className="text-sm font-medium mx-4 text-[#00FFB3]">LIVE: Brazil 2 - 0 Argentina (78')</span>
            <span className="text-sm font-medium mx-4 text-slate-400">•</span>
            <span className="text-sm font-medium mx-4 text-[#FFD700]">GOAL! Vini Jr. scores a stunner!</span>
            <span className="text-sm font-medium mx-4 text-slate-400">•</span>
            <span className="text-sm font-medium mx-4 text-white">UPCOMING: France vs England (20:00 GMT)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
