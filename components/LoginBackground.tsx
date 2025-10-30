"use client";

export default function LoginBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-900" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Transportation elements */}
      {/* Truck icons */}
      <div className="absolute top-1/4 left-1/6 transform -translate-x-1/2 -translate-y-1/2 animate-float drop-shadow-lg">
        <svg width="85" height="42" viewBox="0 0 85 42" fill="none" opacity="0.35">
          <rect x="15" y="15" width="35" height="15" rx="2" fill="#60a5fa" />
          <rect x="50" y="18" width="20" height="12" rx="2" fill="#3b82f6" />
          <rect x="17" y="16" width="12" height="8" rx="1" fill="white" opacity="0.4" />
          <circle cx="22" cy="32" r="3" fill="#1e3a8a" />
          <circle cx="38" cy="32" r="3" fill="#1e3a8a" />
          <circle cx="55" cy="32" r="3" fill="#1e3a8a" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/3 right-1/5 transform translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '1s' }}>
        <svg width="80" height="40" viewBox="0 0 80 40" fill="none" opacity="0.25">
          <rect x="15" y="15" width="35" height="15" rx="2" fill="#22d3ee" />
          <rect x="50" y="18" width="20" height="12" rx="2" fill="#06b6d4" />
          <rect x="17" y="16" width="12" height="8" rx="1" fill="white" opacity="0.4" />
          <circle cx="22" cy="32" r="3" fill="#164e63" />
          <circle cx="38" cy="32" r="3" fill="#164e63" />
          <circle cx="55" cy="32" r="3" fill="#164e63" />
        </svg>
      </div>
      
      {/* Third truck in center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2s' }}>
        <svg width="60" height="30" viewBox="0 0 60 30" fill="none" opacity="0.20">
          <rect x="12" y="12" width="26" height="12" rx="2" fill="#a78bfa" />
          <rect x="38" y="14" width="15" height="10" rx="2" fill="#8b5cf6" />
          <rect x="14" y="13" width="9" height="6" rx="1" fill="white" opacity="0.4" />
          <circle cx="18" cy="26" r="2.5" fill="#4c1d95" />
          <circle cx="30" cy="26" r="2.5" fill="#4c1d95" />
          <circle cx="43" cy="26" r="2.5" fill="#4c1d95" />
        </svg>
      </div>
      
      {/* Distribution hub markers - 4 hubs now */}
      <div className="absolute top-1/3 right-1/4 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <div className="w-6 h-6 border-2 border-cyan-400 rounded-full absolute -top-2 -left-2 animate-ping" />
      </div>
      
      <div className="absolute bottom-1/4 left-1/3 transform -translate-x-1/2 translate-y-1/2">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="w-6 h-6 border-2 border-blue-400 rounded-full absolute -top-2 -left-2 animate-ping" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <div className="absolute top-1/5 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="w-6 h-6 border-2 border-indigo-400 rounded-full absolute -top-2 -left-2 animate-ping" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="absolute bottom-1/3 right-1/3 transform translate-x-1/2 translate-y-1/2">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="w-6 h-6 border-2 border-purple-400 rounded-full absolute -top-2 -left-2 animate-ping" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Package/delivery boxes */}
      <div className="absolute top-2/3 right-1/6 transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '0.5s' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity="0.3">
          <rect x="6" y="8" width="12" height="12" rx="1" fill="#34d399" />
          <path d="M12 8 L18 12 L12 16 L6 12 Z" fill="#10b981" opacity="0.7" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/5 left-1/5 transform -translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '1.5s' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity="0.3">
          <rect x="6" y="8" width="12" height="12" rx="1" fill="#34d399" />
          <path d="M12 8 L18 12 L12 16 L6 12 Z" fill="#10b981" opacity="0.7" />
        </svg>
      </div>
      
      {/* Route lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="20%" y1="25%" x2="70%" y2="75%" stroke="url(#routeGrad)" strokeWidth="2" strokeDasharray="8,4">
          <animate attributeName="stroke-dashoffset" values="0;12" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="15%" y1="70%" x2="80%" y2="30%" stroke="url(#routeGrad)" strokeWidth="2" strokeDasharray="8,4">
          <animate attributeName="stroke-dashoffset" values="0;12" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="30%" y1="15%" x2="85%" y2="85%" stroke="url(#routeGrad)" strokeWidth="2" strokeDasharray="8,4">
          <animate attributeName="stroke-dashoffset" values="0;12" dur="8s" repeatCount="indefinite" />
        </line>
      </svg>
      
      {/* More trucks scattered around */}
      <div className="absolute top-1/6 right-1/6 transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2.5s' }}>
        <svg width="50" height="25" viewBox="0 0 50 25" fill="none" opacity="0.18">
          <rect x="10" y="10" width="25" height="10" rx="1" fill="#60a5fa" />
          <rect x="35" y="12" width="12" height="8" rx="1" fill="#3b82f6" />
          <circle cx="16" cy="22" r="2" fill="#1e3a8a" />
          <circle cx="28" cy="22" r="2" fill="#1e3a8a" />
        </svg>
      </div>
      
      <div className="absolute top-3/4 left-1/4 transform -translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '3s' }}>
        <svg width="50" height="25" viewBox="0 0 50 25" fill="none" opacity="0.18">
          <rect x="10" y="10" width="25" height="10" rx="1" fill="#22d3ee" />
          <rect x="35" y="12" width="12" height="8" rx="1" fill="#06b6d4" />
          <circle cx="16" cy="22" r="2" fill="#164e63" />
          <circle cx="28" cy="22" r="2" fill="#164e63" />
        </svg>
      </div>
      
      {/* Warehouse/building shapes */}
      <div className="absolute top-1/8 left-3/4 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-16 h-20 border-2 border-cyan-300 rounded opacity-15 animate-pulse" />
        <div className="w-4 h-4 border-2 border-cyan-400 rounded-t opacity-20 absolute -top-2 left-1/2 transform -translate-x-1/2" />
      </div>
      
      <div className="absolute bottom-1/6 right-1/5 transform translate-x-1/2 translate-y-1/2">
        <div className="w-20 h-16 border-2 border-blue-300 rounded opacity-15 animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="w-6 h-6 border-2 border-blue-400 rounded-t opacity-20 absolute -top-3 left-1/2 transform -translate-x-1/2" style={{ animationDelay: '0.7s' }} />
      </div>
      
      {/* More package boxes */}
      <div className="absolute top-1/12 right-2/5 transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2s' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" opacity="0.25">
          <rect x="4" y="6" width="8" height="8" rx="0.5" fill="#34d399" />
          <path d="M8 6 L12 9 L8 12 L4 9 Z" fill="#10b981" opacity="0.8" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/8 left-1/2 transform -translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '2.5s' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" opacity="0.25">
          <rect x="5" y="7" width="10" height="10" rx="0.5" fill="#60a5fa" />
          <path d="M10 7 L16 11 L10 15 L4 11 Z" fill="#3b82f6" opacity="0.8" />
        </svg>
      </div>
      
      {/* Directional arrows indicating movement */}
      <div className="absolute top-1/3 left-1/8 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.3s' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity="0.2">
          <path d="M4 12 L20 12 M16 8 L20 12 L16 16" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/2 right-1/8 transform translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '0.8s' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity="0.2">
          <path d="M20 12 L4 12 M8 8 L4 12 L8 16" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      
      {/* Additional geometric shapes for depth */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/6 right-1/3 w-8 h-8 border border-cyan-300 rounded rotate-45 animate-float" style={{ animationDelay: '3.5s' }} />
        <div className="absolute bottom-1/8 left-2/5 w-6 h-6 border border-blue-300 rounded-full animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-2/3 right-2/5 w-10 h-10 border-2 border-indigo-300 rounded-lg rotate-12 animate-float" style={{ animationDelay: '4.5s' }} />
      </div>
      
      {/* More trucks - 3 additional */}
      <div className="absolute top-3/5 left-1/8 transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '3.5s' }}>
        <svg width="55" height="28" viewBox="0 0 55 28" fill="none" opacity="0.15">
          <rect x="12" y="12" width="28" height="12" rx="2" fill="#60a5fa" />
          <rect x="40" y="14" width="14" height="9" rx="2" fill="#3b82f6" />
          <circle cx="18" cy="25" r="2.5" fill="#1e3a8a" />
          <circle cx="32" cy="25" r="2.5" fill="#1e3a8a" />
        </svg>
      </div>
      
      <div className="absolute bottom-2/5 right-1/6 transform translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '4s' }}>
        <svg width="55" height="28" viewBox="0 0 55 28" fill="none" opacity="0.15">
          <rect x="12" y="12" width="28" height="12" rx="2" fill="#22d3ee" />
          <rect x="40" y="14" width="14" height="9" rx="2" fill="#06b6d4" />
          <circle cx="18" cy="25" r="2.5" fill="#164e63" />
          <circle cx="32" cy="25" r="2.5" fill="#164e63" />
        </svg>
      </div>
      
      <div className="absolute top-1/8 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '4.5s' }}>
        <svg width="55" height="28" viewBox="0 0 55 28" fill="none" opacity="0.15">
          <rect x="12" y="12" width="28" height="12" rx="2" fill="#a78bfa" />
          <rect x="40" y="14" width="14" height="9" rx="2" fill="#8b5cf6" />
          <circle cx="18" cy="25" r="2.5" fill="#4c1d95" />
          <circle cx="32" cy="25" r="2.5" fill="#4c1d95" />
        </svg>
      </div>
      
      {/* More distribution hubs - 2 additional */}
      <div className="absolute top-2/5 right-1/5 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="w-6 h-6 border-2 border-cyan-300 rounded-full absolute -top-2 -left-2 animate-ping" style={{ animationDelay: '0.3s' }} />
      </div>
      
      <div className="absolute bottom-1/5 right-2/5 transform translate-x-1/2 translate-y-1/2">
        <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="w-6 h-6 border-2 border-purple-300 rounded-full absolute -top-2 -left-2 animate-ping" style={{ animationDelay: '0.7s' }} />
      </div>
      
      {/* More packages - 3 additional */}
      <div className="absolute top-1/4 right-1/3 transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2.5s' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" opacity="0.2">
          <rect x="5" y="7" width="8" height="8" rx="0.5" fill="#fbbf24" />
          <path d="M9 7 L14 10 L9 13 L4 10 Z" fill="#f59e0b" opacity="0.8" />
        </svg>
      </div>
      
      <div className="absolute top-5/8 left-1/5 transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '3s' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" opacity="0.2">
          <rect x="4" y="6" width="6" height="6" rx="0.5" fill="#f43f5e" />
          <path d="M7 6 L11 8.5 L7 11 L3 8.5 Z" fill="#e11d48" opacity="0.8" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/12 right-3/10 transform translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '3.5s' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" opacity="0.2">
          <rect x="5" y="7" width="6" height="6" rx="0.5" fill="#10b981" />
          <path d="M8 7 L12 9.5 L8 12 L4 9.5 Z" fill="#059669" opacity="0.8" />
        </svg>
      </div>
      
      {/* More warehouses - 1 additional */}
      <div className="absolute top-4/7 left-1/6 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-14 h-18 border-2 border-indigo-300 rounded opacity-12 animate-pulse" style={{ animationDelay: '0.9s' }} />
        <div className="w-3 h-3 border-2 border-indigo-400 rounded-t opacity-18 absolute -top-1.5 left-1/2 transform -translate-x-1/2" style={{ animationDelay: '0.9s' }} />
      </div>
      
      {/* Additional route lines - 3 more */}
      <svg className="absolute inset-0 w-full h-full opacity-18">
      </svg>
      
      {/* More directional arrows - 2 additional */}
      <div className="absolute top-2/3 left-2/5 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '1.2s' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" opacity="0.18">
          <path d="M3 10 L17 10 M14 6 L17 10 L14 14" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/6 left-3/5 transform -translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1.5s' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" opacity="0.18">
          <path d="M17 10 L3 10 M6 6 L3 10 L6 14" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      
      {/* Trucks on left side of login form */}
      <div className="absolute top-1/3 left-[8%] transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '1.8s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(-10deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#60a5fa" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#3b82f6" />
          <circle cx="15" cy="21" r="2" fill="#1e3a8a" />
          <circle cx="26" cy="21" r="2" fill="#1e3a8a" />
        </svg>
      </div>
      
      <div className="absolute top-3/5 left-[5%] transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2.3s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(15deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#22d3ee" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#06b6d4" />
          <circle cx="15" cy="21" r="2" fill="#164e63" />
          <circle cx="26" cy="21" r="2" fill="#164e63" />
        </svg>
      </div>
      
      <div className="absolute top-4/5 left-[12%] transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2.8s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(-5deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#a78bfa" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#8b5cf6" />
          <circle cx="15" cy="21" r="2" fill="#4c1d95" />
          <circle cx="26" cy="21" r="2" fill="#4c1d95" />
        </svg>
      </div>
      
      {/* Trucks on right side of login form */}
      <div className="absolute top-2/5 right-[8%] transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(10deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#60a5fa" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#3b82f6" />
          <circle cx="15" cy="21" r="2" fill="#1e3a8a" />
          <circle cx="26" cy="21" r="2" fill="#1e3a8a" />
        </svg>
      </div>
      
      <div className="absolute top-1/2 right-[5%] transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '2.5s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(-15deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#22d3ee" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#06b6d4" />
          <circle cx="15" cy="21" r="2" fill="#164e63" />
          <circle cx="26" cy="21" r="2" fill="#164e63" />
        </svg>
      </div>
      
      <div className="absolute top-3/4 right-[10%] transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '3s' }}>
        <svg width="45" height="22" viewBox="0 0 45 22" fill="none" opacity="0.2" style={{ transform: 'rotate(5deg)' }}>
          <rect x="10" y="10" width="22" height="10" rx="1.5" fill="#fbbf24" />
          <rect x="32" y="11.5" width="11" height="7" rx="1.5" fill="#f59e0b" />
          <circle cx="15" cy="21" r="2" fill="#78350f" />
          <circle cx="26" cy="21" r="2" fill="#78350f" />
        </svg>
      </div>
      
      {/* Final overlay with depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-transparent to-slate-950/20" />
      
      {/* Additional sparkle effect */}
      <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', opacity: 0.3 }} />
      <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s', opacity: 0.3 }} />
      <div className="absolute bottom-1/3 left-3/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', opacity: 0.3 }} />
      
      {/* More trucks scattered */}
      <div className="absolute top-1/6 left-[15%] transform -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '3.5s' }}>
        <svg width="50" height="26" viewBox="0 0 50 26" fill="none" opacity="0.18">
          <rect x="12" y="11" width="26" height="11" rx="2" fill="#f59e0b" />
          <rect x="38" y="13" width="13" height="8" rx="2" fill="#d97706" />
          <circle cx="17" cy="23" r="2.5" fill="#78350f" />
          <circle cx="30" cy="23" r="2.5" fill="#78350f" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/12 left-[20%] transform -translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '4s' }}>
        <svg width="50" height="26" viewBox="0 0 50 26" fill="none" opacity="0.18">
          <rect x="12" y="11" width="26" height="11" rx="2" fill="#ef4444" />
          <rect x="38" y="13" width="13" height="8" rx="2" fill="#dc2626" />
          <circle cx="17" cy="23" r="2.5" fill="#991b1b" />
          <circle cx="30" cy="23" r="2.5" fill="#991b1b" />
        </svg>
      </div>
      
      <div className="absolute top-1/12 right-[18%] transform translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '4.5s' }}>
        <svg width="50" height="26" viewBox="0 0 50 26" fill="none" opacity="0.18">
          <rect x="12" y="11" width="26" height="11" rx="2" fill="#10b981" />
          <rect x="38" y="13" width="13" height="8" rx="2" fill="#059669" />
          <circle cx="17" cy="23" r="2.5" fill="#065f46" />
          <circle cx="30" cy="23" r="2.5" fill="#065f46" />
        </svg>
      </div>
      
      <div className="absolute bottom-1/4 right-[15%] transform translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '5s' }}>
        <svg width="50" height="26" viewBox="0 0 50 26" fill="none" opacity="0.18">
          <rect x="12" y="11" width="26" height="11" rx="2" fill="#8b5cf6" />
          <rect x="38" y="13" width="13" height="8" rx="2" fill="#7c3aed" />
          <circle cx="17" cy="23" r="2.5" fill="#5b21b6" />
          <circle cx="30" cy="23" r="2.5" fill="#5b21b6" />
        </svg>
      </div>
      
      {/* More glowing hub markers */}
      <div className="absolute top-1/6 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-7 h-7 border-2 border-emerald-400 rounded-full absolute -top-2.25 -left-2.25 animate-ping" style={{ animationDelay: '0.2s' }} />
      </div>
      
      <div className="absolute bottom-1/6 left-1/5 transform -translate-x-1/2 translate-y-1/2">
        <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        <div className="w-7 h-7 border-2 border-amber-400 rounded-full absolute -top-2.25 -left-2.25 animate-ping" style={{ animationDelay: '0.4s' }} />
      </div>
      
      <div className="absolute top-4/5 right-1/6 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
        <div className="w-7 h-7 border-2 border-pink-400 rounded-full absolute -top-2.25 -left-2.25 animate-ping" style={{ animationDelay: '0.6s' }} />
      </div>
      
      {/* More route lines connecting hubs */}
      <svg className="absolute inset-0 w-full h-full opacity-22">
        <line x1="5%" y1="60%" x2="45%" y2="20%" stroke="url(#routeGrad)" strokeWidth="2.5" strokeDasharray="10,5">
          <animate attributeName="stroke-dashoffset" values="0;15" dur="7s" repeatCount="indefinite" />
        </line>
        <line x1="18%" y1="95%" x2="72%" y2="10%" stroke="url(#routeGrad)" strokeWidth="2.5" strokeDasharray="10,5">
          <animate attributeName="stroke-dashoffset" values="0;15" dur="8s" repeatCount="indefinite" />
        </line>
        
        {/* Additional random dotted lines - non-overlapping */}
        <line x1="0%" y1="30%" x2="40%" y2="100%" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.25">
          <animate attributeName="stroke-dashoffset" values="0;9" dur="6s" repeatCount="indefinite" />
        </line>
        <line x1="50%" y1="0%" x2="100%" y2="50%" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.25">
          <animate attributeName="stroke-dashoffset" values="0;9" dur="7s" repeatCount="indefinite" />
        </line>
        <line x1="70%" y1="0%" x2="10%" y2="100%" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.25">
          <animate attributeName="stroke-dashoffset" values="0;9" dur="8s" repeatCount="indefinite" />
        </line>
        <line x1="0%" y1="55%" x2="60%" y2="0%" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.25">
          <animate attributeName="stroke-dashoffset" values="0;9" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="100%" y1="70%" x2="30%" y2="100%" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.25">
          <animate attributeName="stroke-dashoffset" values="0;9" dur="6.5s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

