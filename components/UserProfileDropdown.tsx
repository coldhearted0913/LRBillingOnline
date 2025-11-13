'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, User, Settings } from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';

interface UserProfileDropdownProps {
  email?: string;
  name?: string;
  role?: string;
}

export default function UserProfileDropdown({ email, name, role }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const displayName = name || email?.split('@')[0] || 'User';
  const initial = (name || email || 'U').charAt(0).toUpperCase();
  const isAdmin = role === 'Admin' || role === 'MANAGER';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Avatar Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
          title="Click to open profile menu"
        >
          {initial}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                  {initial}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{displayName}</p>
                  <p className="text-blue-100 text-sm truncate">{email}</p>
                  <p className="text-blue-200 text-xs mt-1 font-medium">{role}</p>
                </div>
              </div>
            </div>

            {/* Menu Divider */}
            <div className="h-px bg-gray-200"></div>

            {/* Menu Items */}
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSettings(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Profile Settings {isAdmin && '(Admin)'}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ redirect: true, callbackUrl: "/login" });
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">LR Billing • Mangesh Transport</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      {showSettings && (
        <ProfileSettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          userRole={role}
          userName={displayName}
          userEmail={email}
        />
      )}
    </>
  );
}
