import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiService } from '../services/apiService';
// Fix: Import `CombinedCollabItem` from the central types file.
import { PlatformSettings, User, PayoutRequest, Post, Influencer, SocialMediaLink, Transaction, KycStatus, KycDetails, AnyCollaboration, CollaborationRequest, CampaignApplication, AdSlotRequest, BannerAdBookingRequest, CollabRequestStatus, CampaignApplicationStatus, AdBookingStatus, PlatformBanner, UserRole, StaffPermission, Message, RefundRequest, DailyPayoutRequest, Dispute, DiscountSetting, Membership, CombinedCollabItem } from '../types';
import { Timestamp, doc, updateDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import PostCard from './PostCard';
import AdminPaymentHistoryPage from './AdminPaymentHistoryPage';
import { AnalyticsIcon, PaymentIcon, CommunityIcon, SupportIcon, ChatBubbleLeftEllipsisIcon, CollabIcon, AdminIcon as KycIcon, UserGroupIcon, LockClosedIcon, LockOpenIcon, KeyIcon, SparklesIcon, RocketIcon, ExclamationTriangleIcon, BannerAdsIcon } from './Icons';
import LiveHelpPanel from './LiveHelpPanel';
import { db } from '../services/firebase';
import PayoutsPanel from './PayoutsPanel';
import { authService } from '../services/authService';
// FIX: Cleaned up the geminiService import to only include what's used in this file.
import { filterDisputesWithAI, filterPostsWithAI } from '../services/geminiService';
import MarketingPanel from './MarketingPanel';
import PlatformBannerPanel from './PlatformBannerPanel';

// Fix: Add props passed from App.tsx to the interface to resolve type error.
interface AdminPanelProps {
    user: User;
    allUsers: User[];
    allTransactions: Transaction[];
    allPayouts: PayoutRequest[];
    allCollabs: AnyCollaboration[];
    allRefunds: RefundRequest[];
    allDailyPayouts: DailyPayoutRequest[];
    platformSettings: PlatformSettings;
    onUpdate: () => void;
}

// Fix: Defined ToggleSwitch at the module level so it can be used by multiple components within this file.
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`${
            enabled ? 'bg-indigo-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
    >
        <span
            aria-hidden="true"
            className={`${
                enabled ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

type AdminTab = 'dashboard' | 'user_management' | 'staff_management' | 'collaborations' | 'kyc' | 'payouts' | 'payment_history' | 'community' | 'live_help' | 'marketing' | 'disputes' | 'discounts' | 'platform_banners';


// --- KYC Detail Modal ---
const KycDetailModal: React.FC<{ user: User, onClose: () => void, onActionComplete: () => void }> = ({ user, onClose, onActionComplete }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const { kycDetails } = user;

    const handleAction = async (status: 'approved' | 'rejected') => {
        let reason: string | undefined;
        if (status === 'rejected') {
            reason = prompt("Please provide a reason for rejection:");
            if (!reason) return; // User cancelled the prompt
        }

        if (!window.confirm(`Are you sure you want to ${status} this KYC submission?`)) return;

        setIsProcessing(true);
        try {
            await apiService.updateKycStatus(user.id, status, reason);
            onActionComplete();
            onClose();
        } catch (error) {
            console.error(`Failed to ${status} KYC`, error);
            alert(`Could not ${status} KYC. Please try again.`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!kycDetails) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">KYC Verification for {user.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2 dark:text-gray-200">Submitted Details</h3>
                        <dl className="text-sm space-y-2 dark:text-gray-300">
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">Address:</dt><dd className="col-span-2">{kycDetails.address}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">Village/Town:</dt><dd className="col-span-2">{kycDetails.villageTown}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">Road/Area:</dt><dd className="col-span-2">{kycDetails.roadNameArea}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">PIN Code:</dt><dd className="col-span-2">{kycDetails.pincode}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">City:</dt><dd className="col-span-2">{kycDetails.city}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">District:</dt><dd className="col-span-2">{kycDetails.district}</dd></div>
                            <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500 dark:text-gray-400">State:</dt><dd className="col-span-2">{kycDetails.state}</dd></div>
                        </dl>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2 dark:text-gray-200">Documents</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-600 dark:text-gray-400">ID Proof</h4>
                                <a href={kycDetails.idProofUrl} target="_blank" rel="noopener noreferrer"><img src={kycDetails.idProofUrl} alt="ID Proof" className="mt-1 rounded-lg border dark:border-gray-600 max-h-60 w-auto" /></a>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-600 dark:text-gray-400">Live Selfie</h4>
                                <a href={kycDetails.selfieUrl} target="_blank" rel="noopener noreferrer"><img src={kycDetails.selfieUrl} alt="Live Selfie" className="mt-1 rounded-lg border dark:border-gray-600 max-h-60 w-auto" /></a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 flex justify-end gap-3">
                    <button onClick={() => handleAction('rejected')} disabled={isProcessing} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
                    <button onClick={() => handleAction('approved')} disabled={isProcessing} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Approve</button>
                </div>
            </div>
        </div>
    );
};

// --- KYC Panel ---
const KycPanel: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const [submissions, setSubmissions] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingUser, setViewingUser] = useState<User | null>(null);

    const fetchSubmissions = useCallback(() => {
        setIsLoading(true);
        apiService.getKycSubmissions()
            .then(setSubmissions)
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    if (isLoading) return <p className="p-4 text-gray-500 dark:text-gray-400">Loading KYC submissions...</p>;
    if (submissions.length === 0) return <p className="p-4 text-gray-500 dark:text-gray-400">No pending KYC submissions.</p>;

    return (
        <div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {submissions.map(user => (
                    <li key={user.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex items-center space-x-3">
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold dark:text-gray-200">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email} ({user.role})</p>
                            </div>
                        </div>
                        <button onClick={() => setViewingUser(user)} className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">Review</button>
                    </li>
                ))}
            </ul>
            {viewingUser && (
                <KycDetailModal 
                    user={viewingUser}
                    onClose={() => setViewingUser(null)}
                    onActionComplete={() => {
                        fetchSubmissions();
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
};

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] | Transaction['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const statusMap: Record<string, { text: string; classes: string }> = {
        // PayoutRequest statuses
        pending: { text: "Pending", classes: "text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/50" },
        on_hold: { text: "On Hold", classes: "text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50" },
        processing: { text: "Processing", classes: "text-purple-800 bg-purple-100 dark:text-purple-200 dark:bg-purple-900/50" },
        approved: { text: "Approved", classes: "text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900/50" },
        rejected: { text: "Rejected", classes: "text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/50" },
        // Transaction statuses
        completed: { text: "Completed", classes: "text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900/50" },
        failed: { text: "Failed", classes: "text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/50" },
    };
    const statusInfo = statusMap[status];

    if (!statusInfo) {
        return <span className={`${baseClasses} text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-700`}>{status || 'Unknown'}</span>;
    }

    const { text, classes } = statusInfo;
    return <span className={`${baseClasses} ${classes}`}>{text}</span>;
};

// --- Community Management Panel ---
const CommunityManagementPanel: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiSearching, setIsAiSearching] = useState(false);

    const fetchPosts = useCallback(() => {
        setIsLoading(true);
        apiService.getPosts().then(data => {
            setPosts(data);
            setFilteredPosts(data);
        }).finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        const dummyAdmin: User = { id: 'admin', name: 'Admin', email: '', role: 'staff', membership: {} as any, kycStatus: 'approved' };
        setCurrentUser(dummyAdmin);
        fetchPosts();
    }, [fetchPosts]);
    
    const handleDelete = async (postId: string) => {
        if(window.confirm("Are you sure you want to delete this post?")) {
            await apiService.deletePost(postId);
            fetchPosts();
        }
    };

    const handleUpdate = async (postId: string, data: Partial<Post>) => {
        await apiService.updatePost(postId, data);
        fetchPosts();
    };

    const handleAiSearch = async () => {
        if (!searchQuery.trim()) {
            setFilteredPosts(posts);
            return;
        }
        setIsAiSearching(true);
        try {
            const matchedIds = await filterPostsWithAI(searchQuery, posts);
            setFilteredPosts(posts.filter(p => matchedIds.includes(p.id)));
        } catch (err) {
            console.error(err);
            alert("AI Search failed. Showing all results.");
            setFilteredPosts(posts);
        } finally {
            setIsAiSearching(false);
        }
    };

    if (isLoading || !currentUser) return <p className="dark:text-gray-300 p-4">Loading posts...</p>;

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="AI search posts (e.g., 'posts by influencers', 'blocked content')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    className="w-full p-3 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
                <button
                    onClick={handleAiSearch}
                    disabled={isAiSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-md shadow hover:shadow-md disabled:opacity-50"
                >
                    <SparklesIcon className={`w-4 h-4 mr-1 ${isAiSearching ? 'animate-spin' : ''}`} />
                    {isAiSearching ? 'Searching...' : 'AI Search'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
                 {filteredPosts.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No posts match your search.</p>
                ) : (
                    filteredPosts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            currentUser={currentUser}
                            onDelete={handleDelete}
                            onUpdate={handleUpdate}
                            onToggleLike={() => {}} // Admin doesn't need to like
                            onCommentChange={() => {}} // Admin doesn't need to comment from this panel
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const DetailsModal: React.FC<{ data: object, onClose: () => void }> = ({ data, onClose }) => {
    const replacer = (key: string, value: any) => {
        // Convert Firestore Timestamps to ISO strings for readability
        if (value && typeof value === 'object' && value.toDate instanceof Function) {
            return value.toDate().toISOString();
        }
        return value;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Collaboration Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                    <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded">{JSON.stringify(data, replacer, 2)}</pre>
                </div>
            </div>
        </div>
    );
};

const ConversationModal: React.FC<{ collab: AnyCollaboration, onClose: () => void }> = ({ collab, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getParticipantIds = () => {
        if ('brandId' in collab) {
            if ('influencerId' in collab) return [collab.brandId, collab.influencerId];
            if ('liveTvId' in collab) return [collab.brandId, (collab as AdSlotRequest).liveTvId];
            if ('agencyId' in collab) return [collab.brandId, (collab as BannerAdBookingRequest).agencyId];
        }
        return [];
    };

    const [brandId] = getParticipantIds();

    useEffect(() => {
        const [userId1, userId2] = getParticipantIds();
        if (userId1 && userId2) {
            apiService.getMessages(userId1, userId2)
                .then(setMessages)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [collab]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Conversation</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {isLoading ? <p>Loading messages...</p> : messages.length === 0 ? <p>No messages found.</p> :
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === brandId ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.senderId === brandId ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={`text-xs mt-1 text-right ${msg.senderId === brandId ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>{msg.timestamp}</p>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

const CollaborationsPanel: React.FC<{ collaborations: CombinedCollabItem[], onUpdate: (id: string, type: string, data: Partial<AnyCollaboration>) => void }> = ({ collaborations, onUpdate }) => {
    const [viewingDetails, setViewingDetails] = useState<AnyCollaboration | null>(null);
    const [viewingConversation, setViewingConversation] = useState<AnyCollaboration | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const collabRequestStatusValues: CollabRequestStatus[] = [
        'pending', 'rejected', 'influencer_offer', 'brand_offer', 'agreement_reached',
        'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending', 'refund_pending_admin_review'
    ];
    const campaignApplicationStatusValues: CampaignApplicationStatus[] = [
        'pending_brand_review', 'rejected', 'brand_counter_offer', 'influencer_counter_offer',
        'agreement_reached', 'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending', 'refund_pending_admin_review'
    ];
    const adBookingStatusValues: AdBookingStatus[] = [
        'pending_approval', 'rejected', 'agency_offer', 'brand_offer', 'agreement_reached',
        'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending', 'refund_pending_admin_review'
    ];
    
    const bookingStatuses = [...new Set([
        ...collabRequestStatusValues,
        ...campaignApplicationStatusValues,
        ...adBookingStatusValues
    ])];

    const filteredCollaborations = useMemo(() => {
        if (!searchTerm) return collaborations;
        const lowercasedFilter = searchTerm.toLowerCase();
        return collaborations.filter(item => 
            item.customerName.toLowerCase().includes(lowercasedFilter) ||
            item.providerName.toLowerCase().includes(lowercasedFilter) ||
            item.title.toLowerCase().includes(lowercasedFilter) ||
            item.id.toLowerCase().includes(lowercasedFilter) ||
            (item.customerPiNumber && item.customerPiNumber.toLowerCase().includes(lowercasedFilter)) ||
            (item.providerPiNumber && item.providerPiNumber.toLowerCase().includes(lowercasedFilter)) ||
            (item.originalData.collabId && item.originalData.collabId.toLowerCase().includes(lowercasedFilter))
        );
    }, [collaborations, searchTerm]);

    const handleStatusChange = (item: CombinedCollabItem, newStatus: string) => {
        onUpdate(item.id, item.type, { status: newStatus as any });
    };

    const handlePaymentChange = (item: CombinedCollabItem, newStatus: 'Paid' | 'Unpaid') => {
        onUpdate(item.id, item.type, { paymentStatus: newStatus === 'Paid' ? 'paid' : undefined });
    };
    
    const handlePayoutChange = (item: CombinedCollabItem, newStatus: string) => {
        let paymentStatusUpdate: AnyCollaboration['paymentStatus'];
        if (newStatus === 'Requested') paymentStatusUpdate = 'payout_requested';
        else if (newStatus === 'Completed') paymentStatusUpdate = 'payout_complete';
        else paymentStatusUpdate = 'paid';
        
        onUpdate(item.id, item.type, { paymentStatus: paymentStatusUpdate });
    };

    return (
        <div className="h-full overflow-auto p-4">
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by customer, provider, title, ID or PI number..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-inner overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collab ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-200">
                            {filteredCollaborations.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-8 w-8 rounded-full" src={item.customerAvatar} alt="" />
                                            <div className="ml-2">
                                                <div className="text-sm font-medium">{item.customerName}</div>
                                                {item.customerPiNumber && <div className="text-xs text-gray-400 font-mono">{item.customerPiNumber}</div>}
                                                <div className="text-xs text-gray-500">{item.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-8 w-8 rounded-full" src={item.providerAvatar} alt="" />
                                            <div className="ml-2">
                                                <div className="text-sm font-medium">{item.providerName}</div>
                                                {item.providerPiNumber && <div className="text-xs text-gray-400 font-mono">{item.providerPiNumber}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{item.date?.toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <div className="text-xs font-mono" title={item.id}>
                                            {item.originalData.collabId || item.id}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <select value={item.status} onChange={(e) => handleStatusChange(item, e.target.value)} className="w-full text-sm rounded-md border-gray-300 dark:bg-gray-600 dark:border-gray-500 capitalize">
                                            {bookingStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <select value={item.paymentStatus} onChange={(e) => handlePaymentChange(item, e.target.value as any)} className="w-full text-sm rounded-md border-gray-300 dark:bg-gray-600 dark:border-gray-500">
                                            <option value="Unpaid">Unpaid</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <select value={item.payoutStatus} onChange={(e) => handlePayoutChange(item, e.target.value)} className="w-full text-sm rounded-md border-gray-300 dark:bg-gray-600 dark:border-gray-500">
                                            <option value="N/A">N/A</option>
                                            <option value="Requested">Requested</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                                        <button onClick={() => setViewingDetails(item.originalData)} className="text-indigo-600 hover:underline">Details</button>
                                        <button onClick={() => setViewingConversation(item.originalData)} className="text-indigo-600 hover:underline">Message</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {viewingDetails && <DetailsModal data={viewingDetails} onClose={() => setViewingDetails(null)} />}
            {viewingConversation && <ConversationModal collab={viewingConversation} onClose={() => setViewingConversation(null)} />}
        </div>
    );
};

const DashboardPanel: React.FC<{ users: User[], collaborations: CombinedCollabItem[], transactions: Transaction[], payouts: PayoutRequest[], dailyPayouts: DailyPayoutRequest[] }> = ({ users, collaborations, transactions, payouts, dailyPayouts }) => {
    const totalUsers = users.length;
    const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {} as Record<UserRole, number>);
    
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const finalPayoutsTotal = payouts.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0);
    const dailyPayoutsTotal = dailyPayouts.filter(p => p.status === 'approved' && p.approvedAmount).reduce((sum, p) => sum + (p.approvedAmount || 0), 0);
    const totalPayouts = finalPayoutsTotal + dailyPayoutsTotal;

    
    const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-gray-700 rounded-lg">{icon}</div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold dark:text-gray-100">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={totalUsers} icon={<UserGroupIcon className="w-6 h-6 text-indigo-500" />} />
                <StatCard title="Total Collaborations" value={collaborations.length} icon={<CollabIcon className="w-6 h-6 text-indigo-500" />} />
                <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<PaymentIcon className="w-6 h-6 text-indigo-500" />} />
                <StatCard title="Total Payouts" value={`₹${totalPayouts.toLocaleString()}`} icon={<PaymentIcon className="w-6 h-6 text-indigo-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                    <h3 className="font-semibold mb-2 dark:text-gray-200">User Distribution</h3>
                    <div className="space-y-2 text-sm">
                        {Object.entries(usersByRole).map(([role, count]) => (
                             <div key={role} className="flex justify-between items-center">
                                 <span className="capitalize dark:text-gray-300">{role}</span>
                                 <span className="font-bold dark:text-gray-100">{count}</span>
                             </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                     <h3 className="font-semibold mb-2 dark:text-gray-200">Financial Overview</h3>
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center dark:text-gray-300"><span>Revenue:</span> <span className="font-bold text-green-600">+ ₹{totalRevenue.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center dark:text-gray-300"><span>Payouts:</span> <span className="font-bold text-red-600">- ₹{totalPayouts.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t mt-2 font-semibold dark:text-gray-100"><span>Platform Earnings:</span> <span>₹{(totalRevenue - totalPayouts).toLocaleString()}</span></div>
                     </div>
                </div>
            </div>
        </div>
    );
};

// --- Staff Management ---
const allPermissions: StaffPermission[] = [
    'analytics', 'user_management', 'collaborations', 'kyc', 'financial',
    'community', 'support', 'marketing', 'live_help'
];

const StaffDetailsModal: React.FC<{
    staffMember: User;
    currentUser: User;
    onClose: () => void;
    onUpdate: () => void;
}> = ({ staffMember, currentUser, onClose, onUpdate }) => {
    const [permissions, setPermissions] = useState<StaffPermission[]>(staffMember.staffPermissions || []);
    const [isBlocked, setIsBlocked] = useState(staffMember.isBlocked || false);
    const [isSaving, setIsSaving] = useState(false);
    const isSelf = staffMember.id === currentUser.id;

    const handlePermissionChange = (permission: StaffPermission, checked: boolean) => {
        setPermissions(prev =>
            checked ? [...prev, permission] : prev.filter(p => p !== permission)
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.updateUser(staffMember.id, {
                staffPermissions: permissions,
                isBlocked: isBlocked,
            });
            alert('Staff member updated successfully.');
            onUpdate();
            onClose();
        } catch (e) {
            alert('Failed to update staff member.');
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Staff: {staffMember.name}</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    {isSelf && <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm mb-4">You cannot edit your own permissions or block status.</div>}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Permissions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {allPermissions.map(permission => (
                                <label key={permission} className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(permission)}
                                        onChange={e => handlePermissionChange(permission, e.target.checked)}
                                        disabled={isSelf}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm capitalize">{permission.replace(/_/g, ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h3 className="font-semibold mb-2">Account Status</h3>
                        <div className="flex items-center space-x-4">
                            <ToggleSwitch enabled={!isBlocked} onChange={val => setIsBlocked(!val)} />
                            <span className={isBlocked ? 'text-red-600' : 'text-green-600'}>{isBlocked ? 'Blocked' : 'Active'}</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={handleSave} disabled={isSaving || isSelf} className="px-6 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StaffManagementPanel: React.FC<{
    allUsers: User[];
    currentUser: User;
    onUpdate: () => void;
}> = ({ allUsers, currentUser, onUpdate }) => {
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
    const staffUsers = useMemo(() => allUsers.filter(u => u.role === 'staff'), [allUsers]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Staff Management</h2>
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-inner">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {staffUsers.map(staff => (
                            <tr key={staff.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img className="h-8 w-8 rounded-full" src={staff.avatar} alt={staff.name} />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium">{staff.name}</div>
                                            <div className="text-xs text-gray-500">{staff.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 max-w-md">
                                    {staff.staffPermissions?.includes('super_admin') ? (
                                        <span className="font-bold text-indigo-600">Super Admin</span>
                                    ) : (
                                        staff.staffPermissions?.map(p => p.replace(/_/g, ' ')).join(', ') || 'None'
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {staff.isBlocked ? <span className="text-red-600 font-semibold">Blocked</span> : <span className="text-green-600 font-semibold">Active</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <button onClick={() => setSelectedStaff(staff)} className="text-indigo-600 hover:underline">Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedStaff && (
                <StaffDetailsModal
                    staffMember={selectedStaff}
                    currentUser={currentUser}
                    onClose={() => setSelectedStaff(null)}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
};


// --- User Management ---

const UserDetailsModal: React.FC<{ 
    user: User, 
    onClose: () => void, 
    onUpdate: () => void 
}> = ({ user, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'kyc' | 'bank' | 'history'>('profile');
    const [editableUser, setEditableUser] = useState(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

    useEffect(() => {
        // Fetch user-specific history when modal opens
        apiService.getTransactionsForUser(user.id).then(setTransactions);
        apiService.getPayoutHistoryForUser(user.id).then(setPayouts);
    }, [user.id]);

    const lastPayoutInfo = useMemo(() => {
        if (!payouts || payouts.length === 0) return null;
        const sortedPayouts = [...payouts].sort((a, b) => {
            const timeB = (b.timestamp && typeof (b.timestamp as any).toMillis === 'function') ? (b.timestamp as any).toMillis() : 0;
            const timeA = (a.timestamp && typeof (a.timestamp as any).toMillis === 'function') ? (a.timestamp as any).toMillis() : 0;
            return timeB - timeA;
        });
        return sortedPayouts[0] || null;
    }, [payouts]);


    const handleFieldChange = (field: keyof User | `membership.${keyof Membership}`, value: any) => {
        if (typeof field === 'string' && field.startsWith('membership.')) {
            const membershipField = field.split('.')[1] as keyof Membership;
            setEditableUser(prev => ({
                ...prev,
                membership: {
                    ...prev.membership,
                    [membershipField]: value
                }
            }));
        } else {
            setEditableUser(prev => ({ ...prev, [field as keyof User]: value }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.updateUser(editableUser.id, {
                name: editableUser.name,
                role: editableUser.role,
                companyName: editableUser.companyName,
                isBlocked: editableUser.isBlocked,
                membership: editableUser.membership,
            });
            alert('User updated successfully.');
            onUpdate();
        } catch (e) {
            alert('Failed to update user.');
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendPasswordReset = async () => {
        try {
            await authService.sendPasswordResetEmail(user.email);
            alert('Password reset email sent successfully.');
        } catch (e) {
            alert('Failed to send email. User might not have a password authentication method linked.');
            console.error(e);
        } finally {
            setShowResetConfirm(false);
        }
    };

    const resetUsage = async () => {
        if(window.confirm("Are you sure you want to reset this user's usage counters to zero?")) {
            handleFieldChange('membership.usage', { directCollaborations: 0, campaigns: 0, liveTvBookings: 0, bannerAdBookings: 0 });
        }
    }
    
    const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
        <div className="grid grid-cols-3 gap-4 py-2">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="text-sm text-gray-900 col-span-2">{children}</dd>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage User: {user.name}</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="flex border-b">
                    {(['profile', 'membership', 'kyc', 'bank', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <dl>
                           <DetailRow label="Name"><input value={editableUser.name} onChange={e => handleFieldChange('name', e.target.value)} className="w-full p-1 border rounded" /></DetailRow>
                           <DetailRow label="Profile ID"><span className="font-mono">{editableUser.piNumber || 'N/A'}</span></DetailRow>
                           <DetailRow label="Email">{editableUser.email}</DetailRow>
                           <DetailRow label="Mobile">{editableUser.mobileNumber || 'N/A'}</DetailRow>
                           <DetailRow label="Company"><input value={editableUser.companyName || ''} onChange={e => handleFieldChange('companyName', e.target.value)} className="w-full p-1 border rounded" /></DetailRow>
                           <DetailRow label="Role">
                               <select value={editableUser.role} onChange={e => handleFieldChange('role', e.target.value)} className="w-full p-1 border rounded">
                                   {(['brand', 'influencer', 'livetv', 'banneragency'] as UserRole[]).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                           </DetailRow>
                        </dl>
                    )}
                    {activeTab === 'membership' && (
                        <dl>
                           <DetailRow label="Plan">
                               <select value={editableUser.membership?.plan} onChange={e => handleFieldChange('membership.plan', e.target.value)} className="w-full p-1 border rounded capitalize">
                                   <option value="free">Free</option>
                                   <option value="pro_10">Pro 10</option>
                                   <option value="pro_20">Pro 20</option>
                                   <option value="pro_unlimited">Pro Unlimited</option>
                                   <option value="normal_1m">Normal 1 Month</option>
                                   <option value="normal_6m">Normal 6 Months</option>
                                   <option value="normal_1y">Normal 1 Year</option>
                                </select>
                           </DetailRow>
                           <DetailRow label="Status">
                                <ToggleSwitch enabled={editableUser.membership?.isActive} onChange={val => handleFieldChange('membership.isActive', val)} />
                           </DetailRow>
                           <DetailRow label="Expires At">
                                <input 
                                    type="date" 
                                    value={(editableUser.membership?.expiresAt as Timestamp)?.toDate?.().toISOString().split('T')[0] || ''}
                                    onChange={e => handleFieldChange('membership.expiresAt', Timestamp.fromDate(new Date(e.target.value)))}
                                    className="w-full p-1 border rounded" 
                                />
                           </DetailRow>
                           <DetailRow label="Usage">
                                <div className="text-xs space-y-1">
                                    <p>Direct Collabs: {editableUser.membership?.usage?.directCollaborations || 0}</p>
                                    <p>Campaigns: {editableUser.membership?.usage?.campaigns || 0}</p>
                                </div>
                           </DetailRow>
                           <DetailRow label="Reset Usage">
                                <button onClick={resetUsage} className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded">Reset Counters</button>
                           </DetailRow>
                        </dl>
                    )}
                    {activeTab === 'kyc' && (
                        <dl>
                            <DetailRow label="KYC Status"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.kycStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>{user.kycStatus}</span></DetailRow>
                            {user.kycDetails && Object.entries(user.kycDetails).map(([key, value]) => {
                                if (key.endsWith('Url')) {
                                    return <DetailRow key={key} label={key.replace('Url', '')}><a href={value as string} target="_blank" rel="noopener noreferrer"><img src={value as string} alt={key} className="h-40 w-auto border rounded"/></a></DetailRow>;
                                }
                                return <DetailRow key={key} label={key}>{String(value)}</DetailRow>;
                            })}
                        </dl>
                    )}
                     {activeTab === 'bank' && (
                        <div>
                            <h3 className="font-semibold mb-2">Last Used Payout Information</h3>
                            {lastPayoutInfo ? (
                                <dl>
                                    <DetailRow label="Method">{lastPayoutInfo.bankDetails ? 'Bank Transfer' : 'UPI'}</DetailRow>
                                    {lastPayoutInfo.bankDetails && <DetailRow label="Bank Details"><pre className="text-xs bg-gray-100 p-2 rounded">{lastPayoutInfo.bankDetails}</pre></DetailRow>}
                                    {lastPayoutInfo.upiId && <DetailRow label="UPI ID">{lastPayoutInfo.upiId}</DetailRow>}
                                </dl>
                            ) : <p className="text-sm text-gray-500">No payout requests found for this user.</p>}
                        </div>
                    )}
                    {activeTab === 'history' && (
                        <div className="h-96">
                            <AdminPaymentHistoryPage transactions={transactions} payouts={payouts} allUsers={[user]} collaborations={[]} />
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <div className="flex gap-4">
                         <button onClick={() => handleFieldChange('isBlocked', !editableUser.isBlocked)} className={`px-4 py-2 text-sm rounded-md flex items-center gap-2 ${editableUser.isBlocked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                           {editableUser.isBlocked ? <><LockOpenIcon className="w-4 h-4" /> Unblock User</> : <><LockClosedIcon className="w-4 h-4"/> Block User</>}
                        </button>
                        <button onClick={() => setShowResetConfirm(true)} className="px-4 py-2 text-sm rounded-md flex items-center gap-2 bg-blue-100 text-blue-700">
                           <KeyIcon className="w-4 h-4" /> Send Password Reset
                        </button>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
                
                {/* Confirmation Modal */}
                {showResetConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <KeyIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold dark:text-gray-100">Confirm Reset Password</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Are you sure you want to send a password reset email to <span className="font-semibold">{user.email}</span>?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                                    Cancel
                                </button>
                                <button onClick={handleSendPasswordReset} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                    Confirm & Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const UserManagementPanel: React.FC<{ onUpdate: () => void, allUsers: User[] }> = ({ onUpdate, allUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        const nonStaffUsers = allUsers.filter(u => u.role !== 'staff');
        if (!searchTerm) return nonStaffUsers;
        const lowerSearch = searchTerm.toLowerCase();
        return nonStaffUsers.filter(u => u.name.toLowerCase().includes(lowerSearch) || u.email.toLowerCase().includes(lowerSearch) || u.piNumber?.toLowerCase().includes(lowerSearch));
    }, [allUsers, searchTerm]);
    
    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <input 
                type="text"
                placeholder="Search by name, email, or PI number..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
            />
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-inner">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img className="h-8 w-8 rounded-full" src={user.avatar} alt={user.name} />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                            {user.piNumber && <div className="text-xs text-gray-400 font-mono mt-1">{user.piNumber}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">{user.role}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">{user.kycStatus.replace('_', ' ')}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{user.isBlocked ? <span className="text-red-600 font-semibold">Blocked</span> : <span className="text-green-600 font-semibold">Active</span>}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <button onClick={() => setSelectedUser(user)} className="text-indigo-600 hover:underline">View Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedUser && <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={() => { onUpdate(); setSelectedUser(null); }} />}
        </div>
    );
};

// --- Disputes Panel ---
const DisputeDetailsModal: React.FC<{ dispute: Dispute, onClose: () => void }> = ({ dispute, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Dispute Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-6 overflow-auto">
                    <dl className="text-sm space-y-3">
                        {Object.entries(dispute).map(([key, value]) => {
                            let displayValue = String(value);
                            if (typeof value === 'object' && value !== null && 'toDate' in value) {
                                displayValue = value.toDate().toLocaleString();
                            } else if (value === null || value === undefined) {
                                displayValue = 'N/A';
                            }
                             const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                            return (
                                <div key={key} className="grid grid-cols-3 gap-2 py-2 border-b dark:border-gray-700">
                                    <dt className="font-medium text-gray-500 capitalize">{displayKey}</dt>
                                    <dd className="col-span-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{displayValue}</dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
            </div>
        </div>
    );
};

const DisputesPanel: React.FC<{ onUpdate: () => void, allUsers: User[] }> = ({ onUpdate, allUsers }) => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmation, setConfirmation] = useState<{ dispute: Dispute, action: 'creator' | 'brand' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
    const [viewingDisputeDetails, setViewingDisputeDetails] = useState<Dispute | null>(null);

    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const fetchDisputes = useCallback(() => {
        setIsLoading(true);
        apiService.getDisputes()
            .then(data => {
                setDisputes(data);
                setFilteredDisputes(data);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        fetchDisputes();
    }, [fetchDisputes]);

    const handleAiSearch = async () => {
        if (!searchQuery.trim()) {
            setFilteredDisputes(disputes);
            return;
        }
        setIsAiSearching(true);
        try {
            const matchedIds = await filterDisputesWithAI(searchQuery, disputes, allUsers);
            setFilteredDisputes(disputes.filter(d => matchedIds.includes(d.id)));
        } catch (err) {
            console.error(err);
            alert("AI Search failed. Showing all results.");
            setFilteredDisputes(disputes);
        } finally {
            setIsAiSearching(false);
        }
    };

    const confirmResolve = async () => {
        if (!confirmation) return;
        const { dispute, action } = confirmation;
        try {
            if (action === 'creator') {
                await apiService.resolveDisputeForCreator(dispute.id, dispute.collaborationId, dispute.collaborationType);
            } else {
                await apiService.resolveDisputeForBrand(dispute.id, dispute.collaborationId, dispute.collaborationType);
            }
            alert('Dispute resolved successfully.');
            fetchDisputes();
            onUpdate();
        } catch (error) {
            console.error('Failed to resolve dispute:', error);
            alert('Failed to resolve dispute. Please try again.');
        } finally {
            setConfirmation(null);
        }
    };

    if (isLoading) return <p className="p-6 text-gray-500 dark:text-gray-400">Loading disputes...</p>;
    
    return (
        <div className="p-6 h-full flex flex-col relative">
            <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">Disputes Management</h2>
            
            {/* AI Search Section */}
            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Describe the disputes you want to see (e.g., 'open disputes about payment', 'fraud', 'by brands')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    className="w-full p-3 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
                <button
                    onClick={handleAiSearch}
                    disabled={isAiSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-md shadow hover:shadow-md disabled:opacity-50"
                >
                    <SparklesIcon className={`w-4 h-4 mr-1 ${isAiSearching ? 'animate-spin' : ''}`} />
                    {isAiSearching ? 'Searching...' : 'AI Search'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                {filteredDisputes.length === 0 ? (
                    <p className="p-4 text-gray-500 dark:text-gray-400 text-center">No disputes found.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reporter</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Against</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Collaboration</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Collab ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredDisputes.map(dispute => {
                                const reporter = userMap.get(dispute.disputedById);
                                const against = userMap.get(dispute.disputedAgainstId);
                                return (
                                <tr key={dispute.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {dispute.disputedByName}
                                        {reporter?.piNumber && <div className="text-xs text-gray-400 font-mono">{reporter.piNumber}</div>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {dispute.disputedAgainstName}
                                        {against?.piNumber && <div className="text-xs text-gray-400 font-mono">{against.piNumber}</div>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={dispute.collaborationTitle}>{dispute.collaborationTitle}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono text-xs" title={dispute.collaborationId}>{dispute.collabId || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        ₹{dispute.amount?.toLocaleString('en-IN') ?? 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs overflow-hidden text-ellipsis" title={dispute.reason}>{dispute.reason}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${dispute.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {dispute.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                                        <button onClick={() => setViewingDisputeDetails(dispute)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Details</button>
                                        {dispute.status === 'open' && (
                                            <>
                                                <button onClick={() => setConfirmation({ dispute, action: 'creator' })} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">For Creator</button>
                                                <button onClick={() => setConfirmation({ dispute, action: 'brand' })} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">For Brand</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>

            {confirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                            </div>
                            <h3 className="text-lg font-bold dark:text-gray-100">Confirm Resolution</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Are you sure you want to resolve this dispute in favor of the <span className="font-semibold capitalize">{confirmation.action}</span>?
                            <br />
                            <span className="text-sm mt-2 block text-gray-500 dark:text-gray-400">This action will close the dispute and cannot be undone.</span>
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setConfirmation(null)} className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                                Cancel
                            </button>
                            <button onClick={confirmResolve} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                                Confirm Resolution
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingDisputeDetails && (
                <DisputeDetailsModal dispute={viewingDisputeDetails} onClose={() => setViewingDisputeDetails(null)} />
            )}
        </div>
    );
};

// --- Discounts Panel ---
// Fix: Moved DiscountsPanel outside of AdminPanel to prevent re-renders and follow React best practices.
const DiscountsPanel: React.FC<{
    settings: PlatformSettings;
    onDiscountChange: (
        discountType: keyof PlatformSettings['discountSettings'],
        field: keyof DiscountSetting,
        value: boolean | number
    ) => void;
}> = ({ settings, onDiscountChange }) => {
    const DiscountSettingRow: React.FC<{
        label: string;
        discountKey: keyof PlatformSettings['discountSettings'];
    }> = ({ label, discountKey }) => {
        const setting = settings.discountSettings[discountKey];
        return (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 border-t first:border-t-0 dark:border-gray-700">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                <dd className="mt-1 flex text-sm text-gray-900 sm:col-span-2 sm:mt-0 items-center gap-4">
                    <ToggleSwitch enabled={setting.isEnabled} onChange={(val) => onDiscountChange(discountKey, 'isEnabled', val)} />
                    <div className="relative flex-1">
                        <input
                            type="number"
                            value={setting.percentage}
                            onChange={(e) => onDiscountChange(discountKey, 'percentage', parseInt(e.target.value, 10) || 0)}
                            min="0"
                            max="100"
                            className="w-full rounded-md border-gray-300 shadow-sm pl-4 pr-8 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200 disabled:opacity-50"
                            disabled={!setting.isEnabled}
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                </dd>
            </div>
        );
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">Discount Management</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <dl>
                    <DiscountSettingRow label="Creator Profile Boost" discountKey="creatorProfileBoost" />
                    <DiscountSettingRow label="Brand Membership Plans" discountKey="brandMembership" />
                    <DiscountSettingRow label="Creator Membership Plans" discountKey="creatorMembership" />
                    <DiscountSettingRow label="Brand Campaign Boosts" discountKey="brandCampaignBoost" />
                </dl>
            </div>
        </div>
    );
};


export const AdminPanel: React.FC<AdminPanelProps> = ({ user, allUsers, allTransactions, allPayouts, allCollabs, allRefunds, allDailyPayouts, platformSettings, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [settings, setSettings] = useState<PlatformSettings>(platformSettings);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        setSettings(platformSettings);
        setIsDirty(false);
    }, [platformSettings]);

    // FIX: Removed call to undefined function setError. The state is managed by `feedback` and `setFeedback`.
    const handleSettingChange = (key: keyof PlatformSettings, value: any) => {
        if (settings) {
            setSettings(prev => ({ ...prev, [key]: value }));
            setIsDirty(true); setFeedback(null);
        }
    };
    
// FIX: Corrected the 'handleDiscountChange' function to properly update nested state for discount settings. 
// The previous implementation was likely causing a "not callable" error due to incorrect property access syntax. 
// This new implementation is type-safe and follows standard React immutable update patterns.
    const handleDiscountChange = (
        discountType: keyof PlatformSettings['discountSettings'],
        field: keyof DiscountSetting,
        value: boolean | number
    ) => {
        if (!settings) return;

        handleSettingChange('discountSettings', {
            ...settings.discountSettings,
            [discountType]: {
                // FIX: Corrected property access from function call `()` to bracket notation `[]` to resolve "not callable" error.
                ...settings.discountSettings[discountType],
                [field]: value,
            },
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await apiService.updatePlatformSettings(settings);
            setFeedback({ type: 'success', message: 'Settings saved successfully!' });
            setIsDirty(false);
            onUpdate();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to save settings.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const users = useMemo(() => allUsers.filter(u => u.role !== 'staff'), [allUsers]);
    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

     const combinedCollaborations: CombinedCollabItem[] = useMemo(() => {
        const safeToDate = (ts: any): Date | undefined => {
            if (ts && typeof ts.toDate === 'function') {
                return ts.toDate();
            }
            return undefined;
        };

        const mapToItem = (collab: AnyCollaboration): CombinedCollabItem => {
            let type: CombinedCollabItem['type'] = 'Direct';
            let providerName = '';
            let providerAvatar = '';
            let providerId = '';

            if ('campaignId' in collab && 'influencerId' in collab) { // CampaignApplication
                type = 'Campaign';
                providerName = collab.influencerName;
                providerAvatar = collab.influencerAvatar;
                providerId = collab.influencerId;
            } else if ('influencerId' in collab) { // CollaborationRequest
                type = 'Direct';
                providerName = collab.influencerName;
                providerAvatar = collab.influencerAvatar;
                providerId = collab.influencerId;
            } else if ('liveTvId' in collab) { // AdSlotRequest
                type = 'Live TV';
                providerName = (collab as AdSlotRequest).liveTvName;
                providerAvatar = (collab as AdSlotRequest).liveTvAvatar;
                providerId = (collab as AdSlotRequest).liveTvId;
            } else if ('agencyId' in collab) { // Banner Ad
                type = 'Banner Ad';
                providerName = (collab as BannerAdBookingRequest).agencyName;
                providerAvatar = (collab as BannerAdBookingRequest).agencyAvatar;
                providerId = (collab as BannerAdBookingRequest).agencyId;
            }

            const customer = usersMap.get(collab.brandId);
            const providerUser = usersMap.get(providerId);

            return {
                id: collab.id,
                type,
                title: 'title' in collab ? collab.title : 'campaignTitle' in collab ? collab.campaignTitle : 'campaignName' in collab ? collab.campaignName : '',
                customerName: collab.brandName,
                customerAvatar: collab.brandAvatar,
                customerPiNumber: customer?.piNumber,
                providerName: providerName,
                providerAvatar: providerAvatar,
                providerPiNumber: providerUser?.piNumber,
                date: safeToDate(collab.timestamp),
                status: collab.status,
                paymentStatus: collab.paymentStatus === 'paid' ? 'Paid' : 'Unpaid',
                payoutStatus: collab.paymentStatus === 'payout_requested' ? 'Requested' : collab.paymentStatus === 'payout_complete' ? 'Completed' : 'N/A',
                originalData: collab,
            };
        };

        return allCollabs.map(mapToItem);
    }, [allCollabs, usersMap]);
    
    const handleCollabUpdate = async (id: string, type: string, data: Partial<AnyCollaboration>) => {
        let collectionName: string;
        switch(type) {
            case 'Direct': collectionName = 'collaboration_requests'; break;
            case 'Campaign': collectionName = 'campaign_applications'; break;
            case 'Live TV': collectionName = 'ad_slot_requests'; break;
            case 'Banner Ad': collectionName = 'banner_booking_requests'; break;
            default: return;
        }
        try {
            await updateDoc(doc(db, collectionName, id), data);
            onUpdate();
        } catch (error) {
            console.error("Failed to update collaboration:", error);
        }
    };

    const hasPermission = (permission: StaffPermission) => {
        if (!user.staffPermissions) return false;
        return user.staffPermissions.includes('super_admin') || user.staffPermissions.includes(permission);
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: AnalyticsIcon, permission: 'analytics' },
        { id: 'user_management', label: 'User Management', icon: UserGroupIcon, permission: 'user_management' },
        { id: 'staff_management', label: 'Staff Management', icon: KycIcon, permission: 'super_admin' },
        { id: 'collaborations', label: 'Collaborations', icon: CollabIcon, permission: 'collaborations' },
        { id: 'kyc', label: 'KYC', icon: KycIcon, permission: 'kyc' },
        { id: 'payouts', label: 'Payouts & Refunds', icon: PaymentIcon, permission: 'financial' },
        { id: 'payment_history', label: 'Payment History', icon: PaymentIcon, permission: 'financial' },
        { id: 'community', label: 'Community', icon: CommunityIcon, permission: 'community' },
        { id: 'disputes', label: 'Disputes', icon: ExclamationTriangleIcon, permission: 'support' },
        { id: 'live_help', label: 'Live Help', icon: ChatBubbleLeftEllipsisIcon, permission: 'live_help' },
        { id: 'marketing', label: 'Marketing', icon: RocketIcon, permission: 'marketing' },
        { id: 'platform_banners', label: 'Platform Banners', icon: BannerAdsIcon, permission: 'marketing' },
        { id: 'discounts', label: 'Discounts', icon: SparklesIcon, permission: 'marketing' },
    ].filter(tab => hasPermission(tab.permission as StaffPermission));

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardPanel users={users} collaborations={combinedCollaborations} transactions={allTransactions} payouts={allPayouts} dailyPayouts={allDailyPayouts} />;
            case 'user_management': return <UserManagementPanel onUpdate={onUpdate} allUsers={allUsers} />;
            case 'staff_management': return <StaffManagementPanel allUsers={allUsers} currentUser={user} onUpdate={onUpdate} />;
            case 'kyc': return <KycPanel onUpdate={onUpdate} />;
            case 'collaborations': return <CollaborationsPanel collaborations={combinedCollaborations} onUpdate={handleCollabUpdate} />;
            case 'payouts': return <PayoutsPanel payouts={allPayouts} refunds={allRefunds} dailyPayouts={allDailyPayouts} collaborations={combinedCollaborations} allUsers={allUsers} onUpdate={onUpdate} />;
            case 'payment_history': return <AdminPaymentHistoryPage transactions={allTransactions} payouts={allPayouts} allUsers={allUsers} collaborations={combinedCollaborations} />;
            case 'community': return <CommunityManagementPanel />;
            case 'disputes': return <DisputesPanel onUpdate={onUpdate} allUsers={allUsers} />;
            case 'live_help': return <LiveHelpPanel adminUser={user} />;
            case 'marketing': return <MarketingPanel allUsers={allUsers} platformSettings={settings} onUpdate={onUpdate} />;
            case 'platform_banners': return <PlatformBannerPanel onUpdate={onUpdate} />;
            case 'discounts': return <DiscountsPanel settings={settings} onDiscountChange={handleDiscountChange} />;
            default: return <div>Select a tab</div>;
        }
    };

    return (
        <div className="flex h-full bg-gray-100 dark:bg-gray-900">
            <nav className="w-60 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col p-4">
                <h2 className="text-xl font-bold mb-6 dark:text-gray-100">Admin Panel</h2>
                <div className="space-y-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                            <tab.icon className="w-5 h-5" /> {tab.label}
                        </button>
                    ))}
                </div>
            </nav>
            <main className="flex-1 flex flex-col">
                {isDirty && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 flex justify-between items-center text-yellow-800 dark:text-yellow-300">
                        <p className="text-sm">You have unsaved changes.</p>
                        <button onClick={handleSaveChanges} disabled={isSaving} className="px-3 py-1 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto">
                   {renderContent()}
                </div>
            </main>
        </div>
    );
};
