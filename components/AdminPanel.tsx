
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { PlatformSettings, User, PayoutRequest, Post, Influencer, SocialMediaLink, Transaction, KycStatus, KycDetails, AnyCollaboration, CollaborationRequest, CampaignApplication, AdSlotRequest, BannerAdBookingRequest, CollabRequestStatus, CampaignApplicationStatus, AdBookingStatus, PlatformBanner, UserRole, StaffPermission, Message, RefundRequest, DailyPayoutRequest, Dispute } from '../types';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import PostCard from './PostCard';
import AdminPaymentHistoryPage from './AdminPaymentHistoryPage';
import { AnalyticsIcon, PaymentIcon, CommunityIcon, SupportIcon, ChatBubbleLeftEllipsisIcon, CollabIcon, AdminIcon as KycIcon, UserGroupIcon, LockClosedIcon, LockOpenIcon, KeyIcon, SparklesIcon, RocketIcon, ExclamationTriangleIcon } from './Icons';
import LiveHelpPanel from './LiveHelpPanel';
import { db } from '../services/firebase';
import PayoutsPanel from './PayoutsPanel';
import { authService } from '../services/authService';
import { filterPayoutsWithAI, filterDisputesWithAI } from '../services/geminiService';
import MarketingPanel from './MarketingPanel';

interface AdminPanelProps {
    user: User;
    allUsers: User[];
    allTransactions: Transaction[];
    allPayouts: PayoutRequest[];
    platformSettings: PlatformSettings;
    onUpdate: () => void;
}

type AdminTab = 'dashboard' | 'user_management' | 'collaborations' | 'kyc' | 'payouts' | 'payment_history' | 'community' | 'live_help' | 'marketing' | 'disputes';


interface CombinedCollabItem {
  id: string;
  type: 'Direct' | 'Campaign' | 'Live TV' | 'Banner Ad';
  title: string;
  customerName: string;
  customerAvatar: string;
  providerName: string;
  providerAvatar: string;
  date: Date | undefined;
  status: CollabRequestStatus | CampaignApplicationStatus | AdBookingStatus;
  paymentStatus: 'Paid' | 'Unpaid';
  payoutStatus: 'N/A' | 'Requested' | 'Completed';
  originalData: AnyCollaboration;
}


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
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null); // A dummy admin user for PostCard

    useEffect(() => {
        const dummyAdmin: User = { id: 'admin', name: 'Admin', email: '', role: 'staff', membership: {} as any, kycStatus: 'approved' };
        setCurrentUser(dummyAdmin);
        apiService.getPosts().then(setPosts).finally(() => setIsLoading(false));
    }, []);
    
    const handleDelete = async (postId: string) => {
        if(window.confirm("Are you sure you want to delete this post?")) {
            await apiService.deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
        }
    };

    const handleUpdate = async (postId: string, data: Partial<Post>) => {
        await apiService.updatePost(postId, data);
        // If an admin blocks a post, it should disappear from the public feed
        if (data.isBlocked) {
            setPosts(posts.filter(p => p.id !== postId));
        } else {
            setPosts(posts.map(p => p.id === postId ? { ...p, ...data } : p));
        }
    };

    if (isLoading || !currentUser) return <p className="dark:text-gray-300">Loading posts...</p>;

    return (
        <div className="space-y-4 p-4">
            {posts.map(post => (
                <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onToggleLike={() => {}} // Admin doesn't need to like
                    onCommentChange={() => {}} // Admin doesn't need to comment from this panel
                />
            ))}
        </div>
    );
};

const DetailsModal: React.FC<{ data: object, onClose: () => void }> = ({ data, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Collaboration Details</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    </div>
);

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
        'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending'
    ];
    const campaignApplicationStatusValues: CampaignApplicationStatus[] = [
        'pending_brand_review', 'rejected', 'brand_counter_offer', 'influencer_counter_offer',
        'agreement_reached', 'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending'
    ];
    const adBookingStatusValues: AdBookingStatus[] = [
        'pending_approval', 'rejected', 'agency_offer', 'brand_offer', 'agreement_reached',
        'in_progress', 'work_submitted', 'completed', 'disputed', 'brand_decision_pending'
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
            item.title.toLowerCase().includes(lowercasedFilter)
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
                    placeholder="Search by customer, provider, or title..."
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
                                            <div className="ml-2 text-sm font-medium">{item.customerName}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-8 w-8 rounded-full" src={item.providerAvatar} alt="" />
                                            <div className="ml-2 text-sm font-medium">{item.providerName}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{item.date?.toLocaleDateString()}</td>
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

// --- User Management ---

const UserDetailsModal: React.FC<{ 
    user: User, 
    allTransactions: Transaction[], 
    allPayouts: PayoutRequest[],
    onClose: () => void, 
    onUpdate: () => void 
}> = ({ user, allTransactions, allPayouts, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'bank' | 'history'>('profile');
    const [editableUser, setEditableUser] = useState(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const userHistory = useMemo(() => {
        const userTransactions = allTransactions.filter(t => t.userId === user.id);
        const userPayouts = allPayouts.filter(p => p.userId === user.id);
        return { transactions: userTransactions, payouts: userPayouts };
    }, [allTransactions, allPayouts, user.id]);

    const lastPayoutInfo = useMemo(() => {
        const userPayouts = allPayouts.filter(p => p.userId === user.id)
            .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        return userPayouts[0] || null;
    }, [allPayouts, user.id]);

    const handleFieldChange = (field: keyof User, value: any) => {
        setEditableUser(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.updateUser(editableUser.id, {
                name: editableUser.name,
                role: editableUser.role,
                companyName: editableUser.companyName,
                isBlocked: editableUser.isBlocked,
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
                    {(['profile', 'kyc', 'bank', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <dl>
                           <DetailRow label="Name"><input value={editableUser.name} onChange={e => handleFieldChange('name', e.target.value)} className="w-full p-1 border rounded" /></DetailRow>
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
                            <AdminPaymentHistoryPage transactions={userHistory.transactions} payouts={userHistory.payouts} allUsers={[user]} />
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

const UserManagementPanel: React.FC<{ users: User[], onUpdate: () => void, allTransactions: Transaction[], allPayouts: PayoutRequest[] }> = ({ users, onUpdate, allTransactions, allPayouts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowerSearch = searchTerm.toLowerCase();
        return users.filter(u => u.name.toLowerCase().includes(lowerSearch) || u.email.toLowerCase().includes(lowerSearch));
    }, [users, searchTerm]);
    
    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <input 
                type="text"
                placeholder="Search by name or email..."
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
            {selectedUser && <UserDetailsModal user={selectedUser} allTransactions={allTransactions} allPayouts={allPayouts} onClose={() => setSelectedUser(null)} onUpdate={() => { onUpdate(); setSelectedUser(null); }} />}
        </div>
    );
};

// --- Disputes Panel ---
const DisputesPanel: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmation, setConfirmation] = useState<{ dispute: Dispute, action: 'creator' | 'brand' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);

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
            const matchedIds = await filterDisputesWithAI(searchQuery, disputes);
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
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredDisputes.map(dispute => (
                                <tr key={dispute.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{dispute.disputedByName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{dispute.disputedAgainstName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={dispute.collaborationTitle}>{dispute.collaborationTitle}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs overflow-hidden text-ellipsis" title={dispute.reason}>{dispute.reason}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${dispute.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {dispute.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                                        {dispute.status === 'open' && (
                                            <>
                                                <button onClick={() => setConfirmation({ dispute, action: 'creator' })} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">Resolve for Creator</button>
                                                <button onClick={() => setConfirmation({ dispute, action: 'brand' })} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">Resolve for Brand</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
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
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, allUsers, allTransactions, allPayouts, platformSettings, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [allCollabs, setAllCollabs] = useState<AnyCollaboration[]>([]);
    const [allRefunds, setAllRefunds] = useState<RefundRequest[]>([]);
    const [allDailyPayouts, setAllDailyPayouts] = useState<DailyPayoutRequest[]>([]);
    
    const users = useMemo(() => allUsers.filter(u => u.role !== 'staff'), [allUsers]);
    
    const refreshAllAdminData = useCallback(async () => {
        const [
            direct, campaign, adslot, banner, refunds, dailyPayouts
        ] = await Promise.all([
            apiService.getAllCollaborationRequests(),
            apiService.getAllCampaignApplications(),
            apiService.getAllAdSlotRequests(),
            apiService.getAllBannerAdBookingRequests(),
            apiService.getAllRefundRequests(),
            apiService.getAllDailyPayoutRequests(),
        ]);
        setAllCollabs([...direct, ...campaign, ...adslot, ...banner]);
        setAllRefunds(refunds);
        setAllDailyPayouts(dailyPayouts);
        onUpdate(); // Propagate update to parent
    }, [onUpdate]);

    useEffect(() => {
        refreshAllAdminData();
    }, [refreshAllAdminData]);

     const combinedCollaborations: CombinedCollabItem[] = useMemo(() => {
        const safeToDate = (ts: any): Date | undefined => {
            if (ts && typeof ts.toDate === 'function') {
                return (ts as Timestamp).toDate();
            }
            return undefined;
        };

        const mapToItem = (collab: AnyCollaboration): CombinedCollabItem => {
            let type: CombinedCollabItem['type'] = 'Direct';
            let providerName = '';
            let providerAvatar = '';

            if ('campaignId' in collab && 'influencerId' in collab) { // CampaignApplication
                type = 'Campaign';
                providerName = collab.influencerName;
                providerAvatar = collab.influencerAvatar;
            } else if ('influencerId' in collab) { // CollaborationRequest
                type = 'Direct';
                providerName = collab.influencerName;
                providerAvatar = collab.influencerAvatar;
            } else if ('liveTvId' in collab) { // AdSlotRequest
                type = 'Live TV';
                providerName = (collab as AdSlotRequest).liveTvName;
                providerAvatar = (collab as AdSlotRequest).liveTvAvatar;
            } else if ('agencyId' in collab) { // Banner Ad
                type = 'Banner Ad';
                providerName = (collab as BannerAdBookingRequest).agencyName;
                providerAvatar = (collab as BannerAdBookingRequest).agencyAvatar;
            }

            return {
                id: collab.id,
                type,
                title: 'title' in collab ? collab.title : 'campaignTitle' in collab ? collab.campaignTitle : 'campaignName' in collab ? collab.campaignName : '',
                customerName: collab.brandName,
                customerAvatar: collab.brandAvatar,
                providerName,
                providerAvatar,
                date: safeToDate(collab.timestamp),
                status: collab.status,
                paymentStatus: collab.paymentStatus === 'paid' ? 'Paid' : 'Unpaid',
                payoutStatus: collab.paymentStatus === 'payout_requested' ? 'Requested' : collab.paymentStatus === 'payout_complete' ? 'Completed' : 'N/A',
                originalData: collab,
            };
        };

        return allCollabs.map(mapToItem);
    }, [allCollabs]);
    
    const showFeedback = (type: 'success' | 'error', message: string) => {
        alert(`${type.toUpperCase()}: ${message}`);
    };

    const handleUpdateCollab = async (id: string, type: string, data: Partial<AnyCollaboration>) => {
        const collectionMap: Record<string, string> = {
            'Direct': 'collaboration_requests',
            'Campaign': 'campaign_applications',
            'Live TV': 'ad_slot_requests',
            'Banner Ad': 'banner_booking_requests'
        };
        const collectionName = collectionMap[type];
        if (!collectionName) {
            showFeedback('error', 'Invalid collaboration type for update.');
            return;
        }

        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, data as any);
            showFeedback('success', 'Collaboration updated.');
            refreshAllAdminData(); // Refresh data
        } catch (error) {
            console.error("Failed to update collaboration:", error);
            showFeedback('error', 'Failed to update collaboration.');
        }
    };
    
    const TabButton: React.FC<{ tab: AdminTab, icon: React.ReactNode, children: React.ReactNode }> = ({ tab, icon, children }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                }`}
            >
                {icon}
                <span className="ml-3">{children}</span>
            </button>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardPanel users={users} collaborations={combinedCollaborations} transactions={allTransactions} payouts={allPayouts} dailyPayouts={allDailyPayouts} />;
            case 'user_management':
                return <UserManagementPanel users={users} onUpdate={onUpdate} allTransactions={allTransactions} allPayouts={allPayouts} />;
            case 'collaborations':
                return <CollaborationsPanel collaborations={combinedCollaborations} onUpdate={handleUpdateCollab} />;
            case 'kyc':
                return <div className="bg-white dark:bg-gray-800 m-6 rounded-lg shadow-inner"><KycPanel onUpdate={onUpdate} /></div>;
            case 'payouts':
                return <PayoutsPanel
                    payouts={allPayouts}
                    refunds={allRefunds}
                    dailyPayouts={allDailyPayouts}
                    onUpdate={refreshAllAdminData}
                />;
            case 'payment_history':
                return <AdminPaymentHistoryPage transactions={allTransactions} payouts={allPayouts} allUsers={allUsers} />;
            case 'community':
                return <CommunityManagementPanel />;
            case 'live_help':
                 return <LiveHelpPanel adminUser={user} />;
            case 'marketing':
                 return <MarketingPanel platformSettings={platformSettings} onUpdate={onUpdate} />;
            case 'disputes':
                 return <DisputesPanel onUpdate={refreshAllAdminData} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 p-6 pb-2 flex-shrink-0">Admin Panel</h1>
            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <TabButton tab="dashboard" icon={<AnalyticsIcon className="w-5 h-5"/>}>Dashboard</TabButton>
                        <TabButton tab="user_management" icon={<UserGroupIcon className="w-5 h-5"/>}>User Management</TabButton>
                        <TabButton tab="collaborations" icon={<CollabIcon className="w-5 h-5"/>}>Collaborations</TabButton>
                        <TabButton tab="kyc" icon={<KycIcon className="w-5 h-5"/>}>KYC Requests</TabButton>
                        <TabButton tab="payouts" icon={<PaymentIcon className="w-5 h-5"/>}>Payouts & Refunds</TabButton>
                        <TabButton tab="disputes" icon={<ExclamationTriangleIcon className="w-5 h-5"/>}>Disputes</TabButton>
                        <TabButton tab="payment_history" icon={<AnalyticsIcon className="w-5 h-5"/>}>All Transactions</TabButton>
                        <TabButton tab="community" icon={<CommunityIcon className="w-5 h-5"/>}>Community Feed</TabButton>
                        <TabButton tab="marketing" icon={<RocketIcon className="w-5 h-5"/>}>Marketing</TabButton>
                        <TabButton tab="live_help" icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5"/>}>Live Help</TabButton>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto relative">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
