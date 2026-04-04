import { Shield, Lock, Key, EyeOff, Server, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export function Security() {
  const principles = [
    {
      icon: Shield,
      title: "Zero-Knowledge Architecture",
      desc: "Our platform never receives or stores your unencrypted private keys. Decryption occurs entirely client-side meaning a server breach exposes zero access to your infrastructure."
    },
    {
      icon: Lock,
      title: "AES-GCM 256 Encryption",
      desc: "Vaults handling SSH keys and connection telemetry utilize standard military-grade AES-GCM 256 encryption enforcing tight boundaries before a packet leaves your device."
    },
    {
      icon: EyeOff,
      title: "Telemetry Opt-Out Built In",
      desc: "We enforce strict 'No-Track by Default' options. Only explicit organizational audit requirements enable session pinging—protecting your individual operational privacy endlessly."
    },
    {
      icon: Key,
      title: "Local Secret Caching",
      desc: "Passwords and configuration environments bypass the global state sync and are exclusively locked to your OS native keychain handlers upon authorization."
    },
    {
      icon: Server,
      title: "Segmented Data Isolation",
      desc: "Organizational databases deploy explicit ID boundaries inside multi-tenant architectures, ensuring that row-level data is completely severed from standard query executions."
    },
    {
      icon: CheckCircle2,
      title: "Granular Access Auditing",
      desc: "Administrators utilize comprehensive historical tracking paginated against explicit sessions, leaving zero gaps in compliance or accountability monitoring."
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-32">
      <div className="text-center mb-20">
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary-light border border-primary/20 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>Enterprise-Grade Security</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 mt-4">Trust No One.<br/>We Built It That Way.</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We fundamentally believe that infrastructure access tooling should never be a weak link. Sparks Connect leverages absolute zero-trust verification schemas to keep your servers secure.
            </p>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {principles.map((p, i) => (
             <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-black/20 border border-white/5 p-8 rounded-2xl hover:bg-white/[0.03] transition-colors group"
             >
                 <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <p.icon className="w-7 h-7 text-primary-light" />
                 </div>
                 <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                 <p className="text-muted-foreground leading-relaxed">
                   {p.desc}
                 </p>
             </motion.div>
         ))}
      </div>
      
      <div className="mt-32 p-12 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1">
                 <h3 className="text-3xl font-bold mb-4">Undergoing Compliance Review?</h3>
                 <p className="text-lg text-muted-foreground">Our team can provide explicit breakdown documents detailing cryptographic hashing routines to satisfy SOC2 mapping constraints.</p>
              </div>
              <button className="bg-primary hover:bg-primary-light text-white font-semibold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all transform hover:scale-105">
                 Request Architecture Whitepaper
              </button>
          </div>
      </div>
    </div>
  )
}

import { Download as DownloadIcon, Monitor, HardDrive, Terminal } from 'lucide-react'

export function Download() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-32">
       <div className="text-center mb-16">
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary-light border border-primary/20 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <DownloadIcon className="w-4 h-4" />
              <span>Available Across Platforms</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 mt-4">Install Sparks Connect</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
              Seamless infrastructure management directly from your native operating system. Secure, lightweight, and blazing fast.
            </p>
         </motion.div>

         {/* Visual Mockup Frame simulating application environment */}
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-24 relative max-w-4xl mx-auto w-full aspect-[16/9] rounded-2xl border border-white/5 bg-[#0a0b10] shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col"
         >
            {/* Fake Mac Toolbar */}
            <div className="h-10 border-b border-white/5 bg-black/40 flex items-center px-4 gap-2 w-full shrink-0">
               <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
               <div className="mx-auto text-xs font-medium text-white/40 tracking-wider">Sparks Connect</div>
            </div>
            {/* Fake Content area split */}
            <div className="flex-1 flex w-full relative">
               <div className="w-48 border-r border-white/5 bg-black/20 p-4 pt-6 space-y-4">
                  <div className="h-6 w-3/4 rounded bg-white/5"></div>
                  <div className="h-6 w-full rounded bg-primary/20"></div>
                  <div className="h-6 w-5/6 rounded bg-white/5"></div>
               </div>
               <div className="flex-1 p-6 relative col-span-1">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
                     <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Terminal className="text-green-500 w-5 h-5" />
                     </div>
                     <div>
                       <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                       <div className="h-3 w-48 bg-white/5 rounded"></div>
                     </div>
                  </div>
                  <div className="font-mono text-sm text-green-400 space-y-3">
                     <p>sparks-connect@v1.0 ~$ connecting to webserver_prod...</p>
                     <p>Connected natively via RSA.</p>
                     <p className="animate-pulse">❯ _</p>
                  </div>
               </div>
            </div>
         </motion.div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* macOS */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
             className="bg-black/20 border border-white/5 p-8 rounded-2xl hover:bg-white/[0.03] transition-colors flex flex-col relative overflow-hidden"
          >
             <Monitor className="w-10 h-10 text-primary-light mb-6" />
             <h3 className="text-2xl font-bold mb-2">macOS</h3>
             <p className="text-muted-foreground mb-8 flex-1">Apple Silicon or Intel. Built natively for maximum battery efficiency.</p>
             <div className="flex flex-col gap-3">
                <a href="/client/mac/sparks-connect-arm64_latest.dmg" download className="w-full text-center bg-primary hover:bg-primary-light text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
                  Download for Apple Silicon (M1/M2/M3)
                </a>
                <a href="/client/mac/sparks-connect-x64_latest.dmg" download className="w-full text-center bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                  Download for Intel Mac
                </a>
             </div>
          </motion.div>

          {/* Windows */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
             className="bg-black/20 border border-white/5 p-8 rounded-2xl hover:bg-white/[0.03] transition-colors flex flex-col relative overflow-hidden"
          >
             <HardDrive className="w-10 h-10 text-primary-light mb-6" />
             <h3 className="text-2xl font-bold mb-2">Windows</h3>
             <p className="text-muted-foreground mb-8 flex-1">Fully integrated with Windows 10 & 11 natively leveraging robust cryptography layers.</p>
             <div className="flex flex-col gap-3">
                <a href="/client/windows/sparks-connect_latest.exe" download className="w-full text-center bg-primary hover:bg-primary-light text-white rounded-lg py-2.5 text-sm font-semibold transition-colors mt-auto">
                  Download Setup (.exe)
                </a>
             </div>
          </motion.div>

          {/* Linux */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
             className="bg-black/20 border border-white/5 p-8 rounded-2xl hover:bg-white/[0.03] transition-colors flex flex-col relative overflow-hidden"
          >
             <Terminal className="w-10 h-10 text-primary-light mb-6" />
             <h3 className="text-2xl font-bold mb-2">Linux</h3>
             <p className="text-muted-foreground mb-8 flex-1">Available in universal packages built dynamically across Debian and Arch structures.</p>
             <div className="flex flex-col gap-3">
                <a href="/client/linux/sparks-connect_latest.deb" download className="w-full text-center bg-primary hover:bg-primary-light text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
                  Download (.deb)
                </a>
                <div className="grid grid-cols-2 gap-2">
                   <a href="/client/linux/sparks-connect_latest.tar.gz" download className="text-center bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-xs font-medium transition-colors">
                     .tar.gz
                   </a>
                   <a href="/client/linux/sparks-connect_latest.AppImage" download className="text-center bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-xs font-medium transition-colors">
                     AppImage
                   </a>
                </div>
             </div>
          </motion.div>
       </div>
    </div>
  )
}
