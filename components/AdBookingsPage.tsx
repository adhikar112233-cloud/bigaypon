import React, { useState, useEffect, useMemo } from 'react';
import { User, BannerAdBookingRequest, AdBookingStatus, ConversationParticipant, PlatformSettings, BannerAd } from '../types';
import { apiService } from '../services/apiService';
import PostBannerAdModal from './PostBannerAdModal';
import { Timestamp } from 'firebase/firestore';

interface AdBookingsPageProps {
    user: User; // The Banner Agency user
    platformSettings: PlatformSettings;
    onStartChat: (participant: ConversationParticipant) => void;
    onInitiatePayout: (collab: BannerAdBookingRequest) => void;
}

const RequestStatusBadge: React.FC<{ status: AdBookingStatus }> = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full capitalize";
    // FIX: Add missing 'refund_pending_admin_review' status to satisfy the type.
    const statusMap: Record<AdBookingStatus, { text: string; classes: string }> = {
        pending_approval: { text: "Pending Approval", classes: "text-yellow-800 bg-yellow-100" },
        rejected: { text: "Rejected", classes: "text-red-800 bg-red-100" },
        agency_offer: { text: "Offer Sent", classes: "text-blue-800 bg-blue-100" },
        brand_offer: { text: "Offer Received", classes: "text-purple-800 bg-purple-100" },
        agreement_reached: { text: "Agreement Reached", classes: "text-green-800 bg-green-100" },
        in_progress: { text: "In Progress", classes: "text-cyan-800 bg-cyan-100" },
        work_submitted: { text: "Work Submitted", classes: "text-indigo-800 bg-indigo-100" },
        completed: { text: "Completed", classes: "text-gray-800 bg-gray-100" },
        disputed: { text: "Dispute in Review", classes: "text-orange-800 bg-orange-100" },
        brand_decision_pending: { text: "Decision Pending", classes: "text-gray-800 bg-gray-100" },
        refund_pending_admin_review: { text: "Refund Under Review", classes: "text-blue-800 bg-blue-100" },
    };
    const { text, classes } = statusMap[status] || { text: status.replace(/_/g, ' '), classes: "text-gray-800 bg-gray-100" };
    return <span className={`${baseClasses} ${classes}`}>{text}</span>;
};

const OfferModal: React.FC<{ type: 'accept' | 'recounter'; currentOffer?: string; onClose: () => void; onConfirm: (amount: string) => void; }> = ({ type, currentOffer, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-gray-100">{type === 'accept' ? 'Accept with Offer' : 'Send Counter Offer'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {type === 'recounter' && currentOffer ? `Brand's offer is ${currentOffer}. ` : ''}
                  Propose your fee for this ad booking.
                </p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 25000" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600 dark:text-gray-200">Cancel</button>
                    <button onClick={() => onConfirm(amount)} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white">Send Offer</button>
                </div>
            </div>
        </div>
    );
};

type FilterType = 'present' | 'past' | 'all';
type MainTab = 'posts' | 'bookings';

const FilterButton: React.FC<{
    label: string;
    filterType: FilterType;
    activeFilter: FilterType;
    setFilter: (filter: FilterType) => void;
}> = ({ label, filterType, activeFilter, setFilter }) => {
    const isActive = activeFilter === filterType;
    return (
        <button
            onClick={() => setFilter(filterType)}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );
};


const AdBookingsPage: React.FC<AdBookingsPageProps> = ({ user, platformSettings, onStartChat, onInitiatePayout }) => {
    const [mainTab, setMainTab] = useState<MainTab>('posts');
    const [requests, setRequests] = useState<BannerAdBookingRequest[]>([]);
    const [myAds, setMyAds] = useState<BannerAd[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<'post' | 'offer' | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<BannerAdBookingRequest | null>(null);
    const [filter, setFilter] = useState<FilterType>('present');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (mainTab === 'posts') {
                const ads = await apiService.getBannerAdsForAgency(user.id);
                ads.sort((a, b) => ((b.timestamp as Timestamp)?.toMillis() || 0) - ((a.timestamp as Timestamp)?.toMillis() || 0));
                setMyAds(ads);
            } else {
                const data = await apiService.getBannerAdBookingRequestsForAgency(user.id);
                setRequests(data);
            }
        } catch (err) {
            console.error(err);
            setError(`Failed to fetch ${mainTab === 'posts' ? 'your posts' : 'booking requests'}.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [user.id, mainTab]);

    const filteredRequests = useMemo(() => {
        const presentStatuses: AdBookingStatus[] = ['pending_approval', 'agency_offer', 'brand_offer', 'agreement_reached', 'in_progress', 'work_submitted', 'disputed'];
        const pastStatuses: AdBookingStatus[] = ['completed', 'rejected'];

        if (filter === 'present') {
            return requests.filter(r => presentStatuses.includes(r.status));
        }
        if (filter === 'past') {
            return requests.filter(r => pastStatuses.includes(r.status));
        }
        return requests;
    }, [requests, filter]);

    const handleUpdate = async (reqId: string, data: Partial<BannerAdBookingRequest>) => {
        setRequests(prev => prev.map(req => req.id === reqId ? { ...req, ...data } : req));
        await apiService.updateBannerAdBookingRequest(reqId, data, user.id);
        setModal(null);
        setSelectedRequest(null);
    };
    
    const handleAction = (req: BannerAdBookingRequest, action: 'message' | 'accept_with_offer' | 'reject' | 'accept_offer' | 'recounter_offer' | 'start_work' | 'complete_work' | 'get_payment' | 'cancel') => {
        setSelectedRequest(req);
        switch(action) {
            case 'message':
                onStartChat({ id: req.brandId, name: req.brandName, avatar: req.brandAvatar, role: 'brand' });
                break;
            case 'accept_with_offer':
            case 'recounter_offer':
                setModal('offer');
                break;
            case 'reject':
            case 'cancel':
                const reason = prompt("Reason for rejection/cancellation (optional):");
                handleUpdate(req.id, { status: 'rejected', rejectionReason: reason || "Not specified" });
                break;
            case 'accept_offer':
                handleUpdate(req.id, { status: 'agreement_reached', finalAmount: req.currentOffer?.amount });
                break;
            case 'start_work':
                handleUpdate(req.id, { workStatus: 'started' });
                break;
            case 'complete_work':
                handleUpdate(req.id, { status: 'work_submitted' });
                break;
            case 'get_payment':
                onInitiatePayout(req);
                break;
        }
    };
    
    const renderRequestActions = (req: BannerAdBookingRequest) => {
        const actions: {label: string, action: Parameters<typeof handleAction>[1], style: string, disabled?: boolean, title?: string}[] = [];
        const isEndDatePassed = new Date(req.endDate) < new Date();

        switch (req.status) {
            case 'pending_approval':
                actions.push({ label: 'Message', action: 'message', style: 'bg-gray-200 text-gray-800' });
                actions.push({ label: 'Reject', action: 'reject', style: 'bg-red-500 text-white' });
                actions.push({ label: 'Accept with Offer', action: 'accept_with_offer', style: 'bg-green-500 text-white' });
                break;
            case 'brand_offer':
                actions.push({ label: 'Message', action: 'message', style: 'bg-gray-200 text-gray-800' });
                actions.push({ label: 'Cancel Collab', action: 'cancel', style: 'bg-red-500 text-white' });
                actions.push({ label: 'Counter Offer', action: 'recounter_offer', style: 'bg-blue-500 text-white' });
                actions.push({ label: 'Accept Offer', action: 'accept_offer', style: 'bg-green-500 text-white' });
                break;
            case 'in_progress':
                if (req.paymentStatus === 'paid' && !req.workStatus) {
                    actions.push({ label: 'Start Work', action: 'start_work', style: 'bg-indigo-600 text-white' });
                }
                if (req.workStatus === 'started') {
                    actions.push({ 
                        label: 'Complete Work', 
                        action: 'complete_work', 
                        style: 'bg-teal-500 text-white', 
                        disabled: !isEndDatePassed,
                        title: isEndDatePassed ? 'Mark the ad campaign as complete' : `This button will be active on ${req.endDate}`
                    });
                }
                break;
            case 'completed':
                 if (req.paymentStatus === 'paid') {
                    actions.push({ label: 'Get Payment', action: 'get_payment', style: 'bg-green-500 text-white' });
                 }
                 break;
        }

        if (actions.length === 0) return null;

        return (
            <div className="mt-4 flex flex-wrap gap-3">
                {actions.map(a => (
                    <button key={a.label} onClick={() => handleAction(req, a.action)} disabled={a.disabled} title={a.title} className={`px-4 py-2 text-sm font-semibold rounded-lg hover:opacity-80 ${a.style} ${a.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {a.label}
                    </button>
                ))}
            </div>
        );
    };

    if (isLoading && mainTab === 'bookings' && requests.length === 0) return <div className="text-center p-8 dark:text-gray-300">Loading...</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">My Banner Ads</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your ad posts and booking requests.</p>
                </div>
                 <button
                    onClick={() => setModal('post')}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0"
                >
                    Post New Banner Ad
                </button>
            </div>
            
            <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                <button 
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'posts' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    onClick={() => setMainTab('posts')}
                >
                    My Ad Posts
                </button>
                <button 
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'bookings' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    onClick={() => setMainTab('bookings')}
                >
                    Booking Requests
                </button>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {mainTab === 'bookings' && (
                    <nav className="w-56 flex-shrink-0 hidden lg:block">
                        <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter by Status</h3>
                        <div className="mt-2 space-y-1">
                            <FilterButton label="Present Bookings" filterType="present" activeFilter={filter} setFilter={setFilter} />
                            <FilterButton label="Past Bookings" filterType="past" activeFilter={filter} setFilter={setFilter} />
                            <FilterButton label="All Bookings" filterType="all" activeFilter={filter} setFilter={setFilter} />
                        </div>
                    </nav>
                )}

                <main className="flex-1 overflow-y-auto">
                    {mainTab === 'posts' && (
                        <>
                        {isLoading ? <p className="text-center py-10 dark:text-gray-300">Loading your posts...</p> : 
                        myAds.length === 0 ? (
                            <div className="text-center py-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
                                <p className="text-gray-500 dark:text-gray-400">You haven't posted any banner ads yet.</p>
                            </div>
                        ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myAds.map(ad => (
                                    <div key={ad.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                                        <img src={ad.photoUrl} alt={ad.bannerType} className="w-full h-32 object-cover" />
                                        <div className="p-4">
                                            <h3 className="font-semibold dark:text-gray-100">{ad.location}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{ad.address}</p>
                                            <div className="mt-2 flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">{ad.bannerType}</span>
                                                <span className="font-medium dark:text-gray-200">{ad.size}</span>
                                            </div>
                                            <p className="mt-2 font-bold text-indigo-600 dark:text-indigo-400">₹{ad.feePerDay}/day</p>
                                            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
                                                Posted on: {ad.timestamp ? new Date((ad.timestamp as Timestamp).toDate()).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </>
                    )}
                    {mainTab === 'bookings' && (
                        <>
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-10 h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
                                <p className="text-gray-500 dark:text-gray-400">No {filter !== 'all' ? filter : ''} booking requests found.</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredRequests.map(req => (
                                        <li key={req.id} className="p-6">
                                             <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                                                <img src={req.brandAvatar} alt={req.brandName} className="w-12 h-12 rounded-full object-cover flex-shrink-0 mb-4 sm:mb-0" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{req.campaignName}</h3>
                                                        <RequestStatusBadge status={req.status} />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">From: {req.brandName}</p>
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm dark:text-gray-300">
                                                        <div><span className="font-semibold text-gray-500 dark:text-gray-400">Location:</span> {req.bannerAdLocation}</div>
                                                        <div><span className="font-semibold text-gray-500 dark:text-gray-400">Dates:</span> {req.startDate} to {req.endDate}</div>
                                                        {req.status === 'brand_offer' && <div className="col-span-full text-indigo-600 dark:text-indigo-400"><span className="font-semibold">Brand's Offer:</span> {req.currentOffer?.amount}</div>}
                                                    </div>
                                                    {renderRequestActions(req)}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        </>
                    )}
                </main>
            </div>
            
            {modal === 'post' && (
                <PostBannerAdModal 
                    user={user}
                    onClose={() => setModal(null)}
                    onAdPosted={fetchData}
                />
            )}
             {modal === 'offer' && selectedRequest && (
                <OfferModal type={selectedRequest.status === 'pending_approval' ? 'accept' : 'recounter'} currentOffer={selectedRequest.currentOffer?.amount} onClose={() => setModal(null)} onConfirm={(amount) => handleUpdate(selectedRequest.id, { status: 'agency_offer', currentOffer: { amount: `₹${amount}`, offeredBy: 'agency' }})} />
            )}
        </div>
    );
};

export default AdBookingsPage;