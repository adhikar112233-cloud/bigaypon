// Fix: Implement the main App component to handle authentication, state management, and render the UI.
import React, { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured, db, auth } from './services/firebase'; // Import the configuration check, db, and auth
import { authService } from './services/authService';
import { apiService } from './services/apiService';
import { User, View, Influencer, PlatformSettings, ProfileData, ConversationParticipant, LiveTvChannel, Transaction, PayoutRequest, AnyCollaboration, PlatformBanner, RefundRequest, DailyPayoutRequest } from './types';
// Fix: Corrected Firebase imports for 'Timestamp', 'doc', and 'getDoc' to align with Firebase v9 modular syntax.
import { Timestamp, doc, getDoc } from 'firebase/firestore';

import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InfluencerCard from './components/InfluencerCard';
import ChatWindow from './components/ChatWindow';
import { findInfluencersWithAI } from './services/geminiService';
import { SparklesIcon, LogoIcon } from './components/Icons';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import SettingsPanel from './components/SettingsPanel';
// Fix: Module '"file:///components/AdminPanel"' has no default export. Changed to named import.
import { AdminPanel } from './components/AdminPanel';
import PostLoginWelcomePage from './components/PostLoginWelcomePage';
import SendMessageModal from './components/SendMessageModal';
import CollabRequestModal from './components/CollabRequestModal';
import CollaborationRequestsPage from './components/CollaborationRequestsPage';
import ProfileDetailDrawer from './components/ProfileDetailDrawer';
import CampaignsPage from './components/CampaignsPage';
import DiscoverCampaignsPage from './components/DiscoverCampaignsPage';
import LiveTvPageForBrand from './components/LiveTvPageForBrand';
import AdRequestsPage from './components/AdRequestsPage';
import BannerAdsPageForBrand from './components/BannerAdsPageForBrand';
import AdBookingsPage from './components/AdBookingsPage';
import UserSupportPage from './components/UserSupportPage';
import SupportAdminPage from './components/SupportAdminPage';
import MembershipPage from './components/MembershipPage';
import MyCollaborationsPage from './components/MyCollaborationsPage';
// Fix: Changed import to named import to resolve module resolution error.
import { MyApplicationsPage } from './components/MyApplicationsPage';
import MyAdBookingsPage from './components/MyAdBookingsPage';
import DailyPayoutRequestModal from './components/DailyPayoutRequestModal';
import CommunityPage from './components/CommunityPage';
import SocialMediaFab from './components/SocialMediaFab';
import PaymentHistoryPage from './components/PaymentHistoryPage';
import KycPage from './components/KycPage';
import PayoutRequestPage from './components/PayoutRequestPage';
import RefundRequestPage from './components/RefundRequestPage';
import BoostPage from './components/BoostPage';
import LiveHelpChat from './components/LiveHelpChat';


// A new component to display a clear error if Firebase is not configured.
const FirebaseConfigError: React.FC = () => (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200">
            <h1 className="text-2xl font-bold text-red-800">🔥 Firebase Configuration Required</h1>
            <p className="mt-4 text-gray-700">
                This application requires a connection to a Firebase project to function, but it hasn't been configured yet.
            </p>
            <p className="mt-2 text-gray-600">
                To get started, please open the file <code className="bg-red-100 text-red-900 px-2 py-1 rounded font-mono text-sm">services/firebase.ts</code> in your code editor and replace the placeholder values with your actual Firebase project credentials.
            </p>
            <p className="mt-4 text-sm text-gray-500">
                You can find your project configuration in the Firebase Console under Project Settings.
            </p>
        </div>
    </div>
);

const MaintenancePage: React.FC = () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
            <LogoIcon showTagline />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-8">Down for Maintenance</h1>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
                BIGYAPON is currently undergoing scheduled maintenance. We'll be back online shortly. Thank you for your patience!
            </p>
        </div>
    </div>
);


const NotificationBanner: React.FC<{ text: string }> = ({ text }) => (
    <div className="bg-indigo-600 text-white text-sm font-medium text-center p-2">
        {text}
    </div>
);

const KycRejectedBanner: React.FC<{ onResubmit: () => void, reason?: string }> = ({ onResubmit, reason }) => (
    <div className="bg-red-600 text-white text-sm font-medium p-3">
        <div className="container mx-auto flex justify-between items-center">
            <div>
                <p className="font-bold">KYC Verification Required</p>
                <p>Your previous submission was rejected. {reason ? `Reason: ${reason}` : 'Please update your details.'}</p>
            </div>
            <button onClick={onResubmit} className="px-4 py-1.5 font-semibold text-red-600 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors flex-shrink-0">
                Resubmit KYC
            </button>
        </div>
    </div>
);

const MembershipInactiveBanner: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
    <div className="bg-yellow-500 text-white text-sm font-medium p-3">
        <div className="container mx-auto flex justify-between items-center gap-4">
            <p>Your membership is inactive. Your profile is not visible to brands/customers until you upgrade your membership.</p>
            <button onClick={onUpgrade} className="px-4 py-1.5 font-semibold text-yellow-600 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors flex-shrink-0 whitespace-nowrap">
                Upgrade to Membership
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  // First, check if Firebase config has been set. If not, show an error page.
  if (!isFirebaseConfigured) {
    return <FirebaseConfigError />;
  }

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [liveTvChannels, setLiveTvChannels] = useState<LiveTvChannel[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // For conversation lookups
  const [filteredInfluencers, setFilteredInfluencers] = useState<Influencer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [platformBanners, setPlatformBanners] = useState<PlatformBanner[]>([]);
  
  // Admin-specific data
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allPayouts, setAllPayouts] = useState<PayoutRequest[]>([]);

  const [activeChat, setActiveChat] = useState<Influencer | null>(null); // Re-using influencer type for chat partner
  const [collabRequestInfluencer, setCollabRequestInfluencer] = useState<Influencer | null>(null);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);
  const [payoutRequestCollab, setPayoutRequestCollab] = useState<AnyCollaboration | null>(null);
  const [refundingCollab, setRefundingCollab] = useState<AnyCollaboration | null>(null);
  const [liveHelpSessionInfo, setLiveHelpSessionInfo] = useState<{ sessionId: string; staff: User | null } | null>(null);


  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const refreshPlatformSettings = useCallback(() => {
    apiService.getPlatformSettings().then(setPlatformSettings).catch(err => {
      console.error("Failed to reload platform settings:", err);
    });
  }, []);

  useEffect(() => {
    // Fetch settings on initial app load.
    refreshPlatformSettings();
    
    apiService.getActivePlatformBanners().then(setPlatformBanners).catch(err => {
        console.error("Failed to fetch platform banners:", err);
    });
  }, [refreshPlatformSettings]);

 const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const profileData = userDoc.data();
                // Reconstruct the user object exactly as onAuthChange does to ensure consistency
                const refreshedUser: User = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || profileData.email, // Use profile email as fallback
                    ...profileData
                } as User;
                setUser(refreshedUser);
            }
        } catch (error) {
            console.error("Failed to refresh user profile", error);
        }
    }
}, []);


  const refreshAllData = useCallback(async () => {
      if (user && platformSettings) {
        // Seed the database with initial data if it's the first time
        await apiService.initializeFirestoreData();
        
        if (user.role === 'brand' || user.role === 'influencer' || user.role === 'staff' || user.role === 'livetv' || user.role === 'banneragency') {
          const influencerData = await apiService.getInfluencers(platformSettings);
          setInfluencers(influencerData);
          setFilteredInfluencers(influencerData);
          
          const channelData = await apiService.getLiveTvChannels(platformSettings);
          setLiveTvChannels(channelData);

          const allUserData = await apiService.getAllUsers();
          setAllUsers(allUserData);
        }

        if (user.role === 'staff') {
            const [transactions, payouts] = await Promise.all([
                apiService.getAllTransactions(),
                apiService.getAllPayouts(),
            ]);
            setAllTransactions(transactions);
            setAllPayouts(payouts);
        }
      }
    }, [user, platformSettings]);


  useEffect(() => {
    const unsubscribe = authService.onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        if (firebaseUser.kycStatus !== 'not_submitted') {
            const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
            if (!hasSeenWelcome) {
                setShowWelcome(true);
                sessionStorage.setItem('hasSeenWelcome', 'true');
            }
        }
         // Set default view based on role
        switch (firebaseUser.role) {
            case 'staff': setActiveView(View.ADMIN); break;
            case 'brand': setActiveView(View.INFLUENCERS); break;
            default: setActiveView(View.DASHBOARD); break;
        }
      } else {
        // User logged out, clear session state
        sessionStorage.removeItem('hasSeenWelcome');
        setActiveView(View.DASHBOARD);
        setActiveChat(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
      refreshAllData();
  }, [refreshAllData]);

  const handleLogout = () => {
    authService.logout();
  };
  
  const handleMembershipActivated = () => {
      refreshUser();
      setActiveView(View.DASHBOARD);
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };
  
  const handleAiSearch = async () => {
      if (!searchQuery.trim()) {
        setFilteredInfluencers(influencers);
        return;
      }
      setIsAiSearching(true);
      try {
        const matchingIds = await findInfluencersWithAI(searchQuery, influencers);
        const matches = influencers.filter(inf => matchingIds.includes(inf.id));
        setFilteredInfluencers(matches);
      } catch (error) {
        console.error("AI Search failed:", error);
        // Maybe show an error to the user
      } finally {
        setIsAiSearching(false);
      }
  };

  const handleViewProfileClick = (profile: ProfileData) => {
    if (user && profile.id !== user.id) {
        setViewingProfile(profile);
    }
  };
  
  const handleConversationSelected = (participant: ConversationParticipant) => {
    // Create a temporary object that looks like an Influencer for the ChatWindow
    const tempChatPartner: Influencer = {
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      handle: participant.handle || participant.companyName || '',
      bio: '',
      followers: 0,
      niche: '',
      engagementRate: 0,
    };
    setActiveChat(tempChatPartner);
  };

  const handleSendMessageFromDrawer = (profile: ProfileData) => {
      setViewingProfile(null); // Close the drawer
      
      // Find the full influencer object if it exists
      const chatPartner = influencers.find(i => i.id === profile.id);
      
      if (chatPartner) {
          setActiveChat(chatPartner);
      } else {
          // If the profile is not in the influencer list (e.g., a brand),
          // create a temporary object that looks enough like an influencer for the chat window.
          const tempChatPartner: Influencer = {
              id: profile.id,
              name: profile.name,
              avatar: profile.avatar,
              handle: profile.handle || profile.companyName || '',
              bio: profile.bio || '',
              followers: 0,
              niche: '',
              engagementRate: 0,
          };
          setActiveChat(tempChatPartner);
      }
  };

  const handleInitiatePayout = (collab: AnyCollaboration) => {
      setPayoutRequestCollab(collab);
      setActiveView(View.PAYOUT_REQUEST);
  };

  const handleInitiateRefund = (collab: AnyCollaboration) => {
      setRefundingCollab(collab);
      setActiveView(View.REFUND_REQUEST);
  };
  
  const handleStartLiveHelp = async () => {
    if (!platformSettings?.liveHelpStaffId) {
        alert("Live help is currently unavailable.");
        return;
    }
    const staffUser = allUsers.find(u => u.id === platformSettings.liveHelpStaffId);
    if (!staffUser) {
        alert("The assigned live help agent could not be found. Please contact support via a ticket.");
        return;
    }
    const sessionId = await apiService.getOrCreateLiveHelpSession(user!.id, user!.name, user!.avatar!, staffUser.id);
    setLiveHelpSessionInfo({ sessionId, staff: staffUser });
  };


  if (isLoading || !platformSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading BIGYAPON...</div>
      </div>
    );
  }

  if (!user) {
    // Show login page if no user is authenticated. This allows staff to access the login form during maintenance mode.
    return <LoginPage platformSettings={platformSettings} />;
  }

  // After authentication, check if the app is in maintenance mode and if the user is not staff.
  if (platformSettings.isMaintenanceModeEnabled && user.role !== 'staff') {
    return <MaintenancePage />;
  }

  if (user.kycStatus === 'not_submitted') {
      return <KycPage user={user} onKycSubmitted={refreshUser} platformSettings={platformSettings} />
  }

  if (showWelcome && platformSettings.isWelcomeMessageEnabled) {
      return <PostLoginWelcomePage user={user} settings={platformSettings} onContinue={() => setShowWelcome(false)} />
  }

  const isCreator = user && ['influencer', 'livetv', 'banneragency'].includes(user.role);
  const isMembershipValid = user && user.membership?.isActive && user.membership?.expiresAt && (user.membership.expiresAt as Timestamp).toDate() > new Date();
  const showMembershipBanner = platformSettings && isCreator && !isMembershipValid && platformSettings.isCreatorMembershipEnabled;

  const renderContent = () => {
    switch (activeView) {
      case View.BOOST_PROFILE:
        return <BoostPage user={user} platformSettings={platformSettings} onBoostActivated={refreshAllData} />;
      case View.KYC:
          return <KycPage user={user} onKycSubmitted={refreshUser} isResubmit={true} platformSettings={platformSettings} />;
      case View.PAYOUT_REQUEST:
          if (!payoutRequestCollab) {
              // Safety net: if we land here without a collab selected, go back to dashboard
              setActiveView(View.DASHBOARD);
              return <Dashboard user={user} setActiveView={setActiveView} platformSettings={platformSettings} banners={platformBanners} />;
          }
          return <PayoutRequestPage 
                    user={user}
                    collaboration={payoutRequestCollab}
                    platformSettings={platformSettings}
                    onClose={() => {
                        setActiveView(View.DASHBOARD);
                        setPayoutRequestCollab(null);
                    }}
                    onSubmitted={() => {
                        alert("Payout request submitted successfully for review!");
                        setActiveView(View.DASHBOARD);
                        setPayoutRequestCollab(null);
                        refreshAllData();
                    }}
                 />;
      case View.REFUND_REQUEST:
        if (!refundingCollab) {
             setActiveView(View.MY_COLLABORATIONS);
             return <Dashboard user={user} setActiveView={setActiveView} platformSettings={platformSettings} banners={platformBanners} />;
        }
        return <RefundRequestPage
                  user={user}
                  collaboration={refundingCollab}
                  onClose={() => {
                      setActiveView(View.MY_COLLABORATIONS);
                      setRefundingCollab(null);
                  }}
                  onSubmitted={() => {
                      alert("Refund request submitted successfully for admin review.");
                      setActiveView(View.MY_COLLABORATIONS);
                      setRefundingCollab(null);
                      refreshAllData();
                  }}
               />;
      case View.INFLUENCERS:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Discover Influencers</h2>
            <div className="mb-6 relative mt-2">
              <input
                type="text"
                placeholder="Describe the influencer you're looking for (e.g., 'fitness coach with over 100k followers')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                className="w-full p-4 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              />
              <button
                onClick={handleAiSearch}
                disabled={isAiSearching}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <SparklesIcon className={`w-5 h-5 mr-2 ${isAiSearching ? 'animate-spin' : ''}`} />
                {isAiSearching ? 'Searching...' : 'AI Search'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInfluencers.map(influencer => (
                <InfluencerCard 
                  key={influencer.id} 
                  influencer={influencer}
                  onStartChat={setActiveChat}
                  onSendCollabRequest={setCollabRequestInfluencer}
                  onViewProfile={handleViewProfileClick}
                />
              ))}
            </div>
          </div>
        );
      case View.DISCOVER_LIVETV:
        return <LiveTvPageForBrand user={user} channels={liveTvChannels} />;
      case View.DISCOVER_BANNERADS:
        return <BannerAdsPageForBrand user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} />;
      case View.ADMIN:
        return <AdminPanel user={user} allUsers={allUsers} allTransactions={allTransactions} allPayouts={allPayouts} platformSettings={platformSettings} onUpdate={refreshAllData} />;
      case View.SETTINGS:
        if (user.role === 'staff') return <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden"><SettingsPanel onSettingsUpdate={refreshPlatformSettings} /></div>;
        return null; // or a not-found/access-denied page
      case View.PROFILE:
        return <ProfilePage user={user} onProfileUpdate={handleProfileUpdate} onGoToMembership={() => setActiveView(View.MEMBERSHIP)} platformSettings={platformSettings} />;
      case View.DASHBOARD:
        return <Dashboard user={user} setActiveView={setActiveView} platformSettings={platformSettings} banners={platformBanners} />;
      case View.COMMUNITY:
        if (!platformSettings.isCommunityFeedEnabled) {
            return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Community Feed Disabled</h2><p className="dark:text-gray-300">This feature is currently turned off by the administrator.</p></div>;
        }
        return <CommunityPage user={user} />;
      case View.MESSAGES:
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Messages</h2><p className="dark:text-gray-300">Select a conversation from the header to start chatting.</p></div>;
      case View.COLLAB_REQUESTS:
        return <CollaborationRequestsPage user={user} onViewProfile={handleViewProfileClick} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiatePayout={handleInitiatePayout} />;
      case View.MY_COLLABORATIONS:
        return <MyCollaborationsPage user={user} onViewProfile={handleViewProfileClick} onStartChat={handleConversationSelected} onInitiateRefund={handleInitiateRefund} platformSettings={platformSettings} />;
      case View.MY_APPLICATIONS:
          return <MyApplicationsPage user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiatePayout={handleInitiatePayout} />;
      case View.CAMPAIGNS:
        if (user.role === 'brand') return <CampaignsPage user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiateRefund={handleInitiateRefund} />;
        if (user.role === 'influencer') return <DiscoverCampaignsPage user={user} />;
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Campaigns</h2><p className="dark:text-gray-300">This feature is not available for your account type.</p></div>;
      case View.AD_BOOKINGS:
        return <MyAdBookingsPage user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiateRefund={handleInitiateRefund} />;
      case View.LIVETV:
        if (user.role === 'livetv') return <AdRequestsPage user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiatePayout={handleInitiatePayout} />;
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Live TV</h2><p className="dark:text-gray-300">This feature is not available for your account type.</p></div>;
      case View.BANNERADS:
        if (user.role === 'banneragency') return <AdBookingsPage user={user} onStartChat={handleConversationSelected} platformSettings={platformSettings} onInitiatePayout={handleInitiatePayout} />;
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Banner Ads</h2><p className="dark:text-gray-300">This feature is not available for your account type.</p></div>;
      case View.SUPPORT:
        if (user.role === 'staff') return <SupportAdminPage user={user} />;
        return <UserSupportPage user={user} platformSettings={platformSettings} onStartLiveHelp={handleStartLiveHelp} />;
      case View.MEMBERSHIP:
        return <MembershipPage user={user} platformSettings={platformSettings} onActivationSuccess={handleMembershipActivated} />;
      case View.PAYMENT_HISTORY:
        return <PaymentHistoryPage user={user} />;
      default:
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow"><h2 className="text-2xl font-bold dark:text-gray-100">Welcome</h2><p className="dark:text-gray-300">Select a view from the sidebar.</p></div>;
    }
  };

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <Sidebar 
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        userRole={user.role}
        platformSettings={platformSettings}
      />
      {/* Mobile Sidebar */}
      <Sidebar 
        isMobile
        user={user}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeView={activeView}
        setActiveView={setActiveView}
        userRole={user.role}
        platformSettings={platformSettings}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {user.kycStatus === 'rejected' && (
            <KycRejectedBanner onResubmit={() => setActiveView(View.KYC)} reason={user.kycDetails?.rejectionReason} />
        )}
        {platformSettings.isNotificationBannerEnabled && platformSettings.notificationBannerText && (
            <NotificationBanner text={platformSettings.notificationBannerText} />
        )}
        {showMembershipBanner && <MembershipInactiveBanner onUpgrade={() => setActiveView(View.MEMBERSHIP)} />}
        <Header 
            user={user} 
            onLogoutClick={handleLogout} 
            setActiveView={setActiveView}
            platformSettings={platformSettings}
            onConversationSelected={handleConversationSelected}
            allUsers={allUsers}
            allInfluencers={influencers}
            onMobileNavToggle={() => setIsMobileNavOpen(true)}
            theme={theme}
            setTheme={setTheme}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      
      {activeChat && (
        <ChatWindow 
          user={user}
          influencer={activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}
      
      {liveHelpSessionInfo && (
        <LiveHelpChat 
            user={user}
            sessionInfo={liveHelpSessionInfo}
            onClose={() => setLiveHelpSessionInfo(null)}
        />
      )}


      {collabRequestInfluencer && (
        <CollabRequestModal
          user={user}
          influencer={collabRequestInfluencer}
          onClose={() => setCollabRequestInfluencer(null)}
        />
      )}

      {viewingProfile && (
        <ProfileDetailDrawer
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onSendMessage={handleSendMessageFromDrawer}
        />
      )}

      {platformSettings.isSocialMediaFabEnabled && (
        <SocialMediaFab links={platformSettings.socialMediaLinks} />
      )}
    </div>
  );
};

export default App;