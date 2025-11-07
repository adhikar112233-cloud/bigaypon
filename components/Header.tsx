import React, { useState, useEffect, useRef } from 'react';
import { LogoIcon, MessagesIcon, SupportIcon, YoutubeIcon, MenuIcon, SunIcon, MoonIcon } from './Icons';
import { User, View, PlatformSettings, Influencer, Conversation, ConversationParticipant } from '../types';
import ConversationsPanel from './ConversationsPanel';
import { apiService } from '../services/apiService';

interface HeaderProps {
  user: User;
  onLogoutClick: () => void;
  setActiveView: (view: View) => void;
  platformSettings: PlatformSettings;
  onConversationSelected: (participant: ConversationParticipant) => void;
  allUsers: User[];
  allInfluencers: Influencer[];
  onMobileNavToggle: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const DEFAULT_AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDRjMCAwIDAtMSAwLTJoMTJ2Mmg0di00YzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

const Header: React.FC<HeaderProps> = ({ user, onLogoutClick, setActiveView, platformSettings, onConversationSelected, allUsers, allInfluencers, onMobileNavToggle, theme, setTheme }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (conversationsRef.current && !conversationsRef.current.contains(event.target as Node)) {
        setIsConversationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleProfileClick = () => {
    setActiveView(View.PROFILE);
    setIsDropdownOpen(false);
  }

  const handleConversationClick = (participant: ConversationParticipant) => {
    onConversationSelected(participant);
    setIsConversationsOpen(false);
  };

  const toggleConversations = async () => {
    if (!isConversationsOpen) {
      setIsLoadingConversations(true);
      setIsConversationsOpen(true);
      try {
        const convos = await apiService.getConversations(user.id, allUsers, allInfluencers);
        setConversations(convos);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    } else {
      setIsConversationsOpen(false);
    }
  };


  return (
    <header className="h-16 md:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-2 sm:px-4 dark:bg-gray-800 dark:border-gray-700 relative z-20">
      {/* LEFT SECTION: Menu and Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMobileNavToggle}
          className="p-1 rounded-md text-gray-500 hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center md:hidden">
           <LogoIcon className="h-8 w-auto" />
        </div>
      </div>

      {/* RIGHT SECTION: Combined Actions and Profile */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Action Icons Group */}
        <div className="flex items-center gap-0 md:gap-1">
           {platformSettings.youtubeTutorialUrl && (
              <a
                href={platformSettings.youtubeTutorialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="View Tutorials on YouTube"
                title="Tutorials & Updates"
              >
                <YoutubeIcon className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
           <button
              onClick={() => setActiveView(View.SUPPORT)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Live Help"
              title="Live Help"
            >
              <SupportIcon className="w-5 h-5" />
            </button>

          <div className="relative" ref={conversationsRef}>
            <button
              onClick={toggleConversations}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="View conversations"
              title="Conversations"
            >
              <MessagesIcon className="w-5 h-5" />
            </button>
            {isConversationsOpen && (
              <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 z-50">
               <ConversationsPanel
                conversations={conversations}
                isLoading={isLoadingConversations}
                onSelect={handleConversationClick}
              />
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-0"></div>

        {/* Profile Section */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block text-right">
              <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Welcome</h1>
          </div>

          <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="hidden lg:block text-right">
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[100px]">{user.name}</p>
                      {user.companyName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{user.companyName}</p>}
                  </div>
                  <img
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  src={user.avatar || DEFAULT_AVATAR_URL}
                  alt="User Avatar"
                  />
              </button>

              {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700 divide-y dark:divide-gray-700">
                      <div className="p-2">
                          <div className="px-4 py-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Current Plan</p>
                              <p className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                                  {(user.membership?.plan || 'free').replace(/_/g, ' ')}
                              </p>
                          </div>
                      </div>
                      <div className="p-2">
                          <button onClick={handleProfileClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                              Profile Details
                          </button>
                          <button onClick={() => { setActiveView(View.MEMBERSHIP); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                              Manage Membership
                          </button>
                      </div>
                      <div className="p-2">
                          <button onClick={onLogoutClick} className="w-full text-left px-4 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 dark:text-red-400">
                              Logout
                          </button>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
