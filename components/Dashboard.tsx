import React, { useState, useEffect, useMemo } from 'react';
// Fix: Imported `CollaborationRequest` to resolve TypeScript error when casting an item.
import { User, View, CollaborationStatusItem, CollabRequestStatus, CampaignApplication, CollaborationRequest, PlatformSettings, PlatformBanner } from '../types';
import { InfluencersIcon, MessagesIcon, BannerAdsIcon, LiveTvIcon, AdminIcon, SparklesIcon, AudioIcon as CampaignIcon, CollabIcon } from './Icons';
import { generateDashboardTip } from '../services/geminiService';
import { apiService } from '../services/apiService';
// Fix: Corrected Firebase import for 'Timestamp' to align with Firebase v9 modular syntax.
import { Timestamp } from 'firebase/firestore';


interface DashboardProps {
  user: User;
  setActiveView: (view: View) => void;
  platformSettings: PlatformSettings;
  banners: PlatformBanner[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex items-center space-x-4">
        <div className="bg-indigo-100 dark:bg-gray-700 p-3 rounded-full flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <button onClick={onClick} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg text-left w-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-start space-x-4">
            <div className="bg-teal-100 text-teal-600 dark:bg-gray-700 dark:text-teal-400 p-3 rounded-full flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-sm">{description}</p>
            </div>
        </div>
    </button>
);

const StatusBadge: React.FC<{ status: CollaborationStatusItem['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap";
    // Fix: Removed invalid 'accepted' status check.
    if (status === 'agreement_reached' || status === 'completed') return <span className={`${baseClasses} text-green-800 bg-green-100 dark:bg-green-900/50 dark:text-green-300`}>Accepted</span>;
    if (status === 'rejected') return <span className={`${baseClasses} text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300`}>Rejected</span>;
    return <span className={`${baseClasses} text-yellow-800 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300`}>Pending</span>;
};

const CollaborationStatus: React.FC<{ items: CollaborationStatusItem[]; isLoading: boolean; onSeeAll: () => void; }> = ({ items, isLoading, onSeeAll }) => (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Collaboration Status</h3>
            <button onClick={onSeeAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">See all</button>
        </div>
        <div className="mt-4 space-y-3">
            {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading activity...</p>
            ) : items.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity found.</p>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <img src={item.partnerAvatar} alt={item.partnerName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {item.type.includes('sent') || item.type.includes('received') ? `With: ${item.partnerName}` : `From: ${item.partnerName}`}
                            </p>
                        </div>
                        <StatusBadge status={item.status} />
                    </div>
                ))
            )}
        </div>
    </div>
);

const FreeTierLimitBanner: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 text-center rounded-lg shadow-md dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-600" role="alert">
        <p className="font-bold">Free Plan Limit Reached</p>
        <p className="text-sm">You have used your free collaboration for this year. To connect with more creators, please upgrade to a Pro Membership.</p>
        <button onClick={onUpgrade} className="mt-2 font-semibold text-yellow-900 underline hover:text-yellow-700 dark:text-yellow-200 dark:hover:text-yellow-100">
            Upgrade Now
        </button>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ user, setActiveView, platformSettings, banners }) => {
    const [aiTip, setAiTip] = useState<string>('');
    const [isGeneratingTip, setIsGeneratingTip] = useState(false);
    const [collabItems, setCollabItems] = useState<CollaborationStatusItem[]>([]);
    const [isCollabLoading, setIsCollabLoading] = useState(true);

    useEffect(() => {
        const fetchCollaborationStatus = async () => {
            setIsCollabLoading(true);
            let rawItems: any[] = [];
            
            try {
                switch (user.role) {
                    case 'brand':
                        const sentRequests = await apiService.getCollabRequestsForBrand(user.id);
                        // FIX: Property 'getCampaignsForBrand' does not exist on type '{...}'.
                        const campaigns = await apiService.getCampaignsForBrand(user.id);
                        // FIX: Property 'getApplicationsForCampaign' does not exist on type '{...}'.
                        const appPromises = campaigns.map(c => apiService.getApplicationsForCampaign(c.id));
                        const campaignApps = (await Promise.all(appPromises)).flat();
                        rawItems = [...sentRequests, ...campaignApps];
                        break;
                    case 'influencer':
                        const receivedRequests = await apiService.getCollabRequestsForInfluencer(user.id);
                        // FIX: Property 'getCampaignApplicationsForInfluencer' does not exist on type '{...}'.
                        const sentApps = await apiService.getCampaignApplicationsForInfluencer(user.id);
                        rawItems = [...receivedRequests, ...sentApps];
                        break;
                    case 'livetv':
                        // FIX: Property 'getAdSlotRequestsForLiveTv' does not exist on type '{...}'.
                        rawItems = await apiService.getAdSlotRequestsForLiveTv(user.id);
                        break;
                    case 'banneragency':
                        // FIX: Property 'getBannerAdBookingRequestsForAgency' does not exist on type '{...}'.
                        rawItems = await apiService.getBannerAdBookingRequestsForAgency(user.id);
                        break;
                }

                const mappedItems = rawItems.map((item): CollaborationStatusItem | null => {
                    if ('influencerId' in item && 'brandId' in item && 'campaignTitle' in item) { // CampaignApplication
                        const app = item as CampaignApplication;
                        if(user.role === 'brand') { // App received by brand
                            return { id: app.id, title: app.campaignTitle, partnerName: app.influencerName, partnerAvatar: app.influencerAvatar, status: app.status, timestamp: app.timestamp, type: 'campaign-application-received', view: View.CAMPAIGNS };
                        } else { // App sent by influencer
                            return { id: app.id, title: app.campaignTitle, partnerName: app.brandName, partnerAvatar: app.brandAvatar, status: app.status, timestamp: app.timestamp, type: 'campaign-application-sent', view: View.CAMPAIGNS };
                        }
                    }
                    if ('influencerId' in item && 'brandId' in item) { // CollaborationRequest
                        const req = item as CollaborationRequest;
                        if(user.role === 'brand') { // Request sent by brand
                             return { id: req.id, title: req.title, partnerName: req.influencerName, partnerAvatar: req.influencerAvatar, status: req.status, timestamp: req.timestamp, type: 'collab-request-sent', view: View.MY_COLLABORATIONS };
                        } else { // Request received by influencer
                             return { id: req.id, title: req.title, partnerName: req.brandName, partnerAvatar: req.brandAvatar, status: req.status, timestamp: req.timestamp, type: 'collab-request-received', view: View.COLLAB_REQUESTS };
                        }
                    }
                    if ('liveTvId' in item) { // AdSlotRequest
                        const req = item as any;
                        return { id: req.id, title: req.campaignName, partnerName: req.brandName, partnerAvatar: req.brandAvatar, status: req.status, timestamp: req.timestamp, type: 'ad-slot-request', view: View.LIVETV };
                    }
                    if ('agencyId' in item) { // BannerAdBookingRequest
                        const req = item as any;
                         return { id: req.id, title: req.campaignName, partnerName: req.brandName, partnerAvatar: req.brandAvatar, status: req.status, timestamp: req.timestamp, type: 'banner-booking-request', view: View.BANNERADS };
                    }
                    return null;
                }).filter((i): i is CollaborationStatusItem => i !== null);
                
                mappedItems.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
                setCollabItems(mappedItems.slice(0, 5));

            } catch (error) {
                console.error("Failed to fetch collaboration statuses:", error);
            } finally {
                setIsCollabLoading(false);
            }
        };

        fetchCollaborationStatus();
    }, [user]);

    const handleGenerateTip = async () => {
        setIsGeneratingTip(true);
        setAiTip('');
        const tip = await generateDashboardTip(user.role, user.name);
        setAiTip(tip);
        setIsGeneratingTip(false);
    };
    
    const getRoleSpecificActions = () => {
        switch (user.role) {
            case 'brand':
                return {
                    managementActions: [
                        { title: 'My Campaigns', description: 'Create and manage bulk campaigns.', icon: <CampaignIcon className="w-6 h-6" />, view: View.CAMPAIGNS },
                        { title: 'My Collaborations', description: 'Manage your one-on-one partnerships.', icon: <CollabIcon className="w-6 h-6" />, view: View.MY_COLLABORATIONS },
                        { title: 'My Ad Bookings', description: 'Track your TV and Banner ad requests.', icon: <LiveTvIcon className="w-6 h-6" />, view: View.AD_BOOKINGS },
                    ],
                    discoveryActions: [
                        { title: 'Find Influencers', description: 'Discover and connect with new talent.', icon: <InfluencersIcon className="w-6 h-6" />, view: View.INFLUENCERS },
                        { title: 'Book Live TV Ads', description: 'Advertise on live television channels.', icon: <LiveTvIcon className="w-6 h-6" />, view: View.INFLUENCERS },
                        { title: 'Book Banner Ads', description: 'Book outdoor advertising spaces.', icon: <BannerAdsIcon className="w-6 h-6" />, view: View.INFLUENCERS },
                    ],
                    seeAllView: View.MY_COLLABORATIONS
                };
            case 'influencer':
                 return {
                    managementActions: [
                        { title: 'Collaboration Invites', description: 'View and respond to brand requests.', icon: <MessagesIcon className="w-6 h-6" />, view: View.COLLAB_REQUESTS },
                        { title: 'My Profile', description: 'Keep your portfolio up-to-date.', icon: <InfluencersIcon className="w-6 h-6" />, view: View.PROFILE },
                    ],
                    discoveryActions: [],
                    seeAllView: View.COLLAB_REQUESTS
                };
            case 'livetv':
                return {
                    managementActions: [
                        { title: 'Review Ad Requests', description: 'Manage incoming advertisement proposals.', icon: <LiveTvIcon className="w-6 h-6" />, view: View.LIVETV },
                        { title: 'My Channel Details', description: 'Update your channel information.', icon: <InfluencersIcon className="w-6 h-6" />, view: View.PROFILE },
                    ],
                    discoveryActions: [],
                    seeAllView: View.LIVETV
                };
            case 'banneragency':
                 return {
                     managementActions: [
                        { title: 'Manage Ad Bookings', description: 'Oversee and schedule banner ad placements.', icon: <BannerAdsIcon className="w-6 h-6" />, view: View.BANNERADS },
                        { title: 'My Agency Profile', description: 'Update your agency information.', icon: <InfluencersIcon className="w-6 h-6" />, view: View.PROFILE },
                    ],
                    discoveryActions: [],
                    seeAllView: View.BANNERADS
                 };
            case 'staff':
                return {
                    managementActions: [
                        { title: 'Admin Panel', description: 'Access platform management tools.', icon: <AdminIcon className="w-6 h-6" />, view: View.ADMIN },
                        { title: 'User Management', description: 'View and manage all platform users.', icon: <InfluencersIcon className="w-6 h-6" />, view: View.ADMIN },
                    ],
                    discoveryActions: [],
                    seeAllView: View.ADMIN
                };
            default:
                return { managementActions: [], discoveryActions: [], seeAllView: View.DASHBOARD };
        }
    }

    const { managementActions, discoveryActions, seeAllView } = getRoleSpecificActions();
    
    const hasUsedFreeCollab = user.role === 'brand' && user.membership.plan === 'free' && (
        user.membership.usage.directCollaborations > 0 ||
        user.membership.usage.campaigns > 0 ||
        user.membership.usage.liveTvBookings > 0 ||
        user.membership.usage.bannerAdBookings > 0
    );

    return (
        <div className="space-y-6">
            
            {banners.length > 0 && (
                <a href={banners[0].targetUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <img src={banners[0].imageUrl} alt={banners[0].title} className="w-full h-auto object-cover max-h-32 sm:max-h-48" />
                </a>
            )}

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome back, {user.name}!</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">Here's a snapshot of your BIGYAPON dashboard.</p>
            </div>

            {hasUsedFreeCollab && platformSettings.isProMembershipEnabled && <FreeTierLimitBanner onUpgrade={() => setActiveView(View.MEMBERSHIP)} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title="Available Influencers" value="1,250+" icon={<InfluencersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />} />
                <StatCard title="Active Collaborations" value="28" icon={<MessagesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />} />
                <StatCard title="Pending Requests" value="4" icon={<BannerAdsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />} />
            </div>

            <div>
                 <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Manage</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {managementActions.map(action => (
                        <ActionCard 
                            key={action.title}
                            title={action.title}
                            description={action.description}
                            icon={action.icon}
                            onClick={() => setActiveView(action.view)}
                        />
                    ))}
                 </div>
            </div>

             {discoveryActions.length > 0 && (
                <div>
                     <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Discover</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {discoveryActions.map(action => (
                            <ActionCard 
                                key={action.title}
                                title={action.title}
                                description={action.description}
                                icon={action.icon}
                                onClick={() => setActiveView(action.view)}
                            />
                        ))}
                     </div>
                </div>
            )}
            
            {user.role !== 'staff' && (
                <CollaborationStatus items={collabItems} isLoading={isCollabLoading} onSeeAll={() => setActiveView(seeAllView)} />
            )}

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                         <div className="bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 p-3 rounded-full flex-shrink-0">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">AI-Powered Pro Tip</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Get a personalized tip to boost your success.</p>
                        </div>
                    </div>
                    <button onClick={handleGenerateTip} disabled={isGeneratingTip} className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 whitespace-nowrap">
                        <SparklesIcon className={`w-5 h-5 mr-2 ${isGeneratingTip ? 'animate-spin' : ''}`} />
                        {isGeneratingTip ? 'Generating...' : 'Get Tip'}
                    </button>
                </div>
                {aiTip && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 border-l-4 border-teal-400 rounded-r-lg">
                        <p className="text-gray-700 dark:text-gray-200 text-sm">{aiTip}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;