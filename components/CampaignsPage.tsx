import React, { useState, useEffect } from 'react';
import { User, Campaign, CampaignApplication, CampaignApplicationStatus, ConversationParticipant, PlatformSettings, AnyCollaboration } from '../types';
import { apiService } from '../services/apiService';
import CreateCampaignModal from './CreateCampaignModal';
import PhonePeModal from './PhonePeModal';
import DisputeModal from './DisputeModal';
import { RocketIcon, SparklesIcon } from './Icons';
import BoostCampaignModal from './BoostCampaignModal';

interface CampaignsPageProps {
    user: User;
    platformSettings: PlatformSettings;
    onStartChat: (participant: ConversationParticipant) => void;
    onInitiateRefund: (collab: AnyCollaboration) => void;
}

const ApplicationStatusBadge: React.FC<{ status: CampaignApplicationStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const statusMap: Record<CampaignApplicationStatus, { text: string; classes: string }> = {
        pending_brand_review: { text: "Pending Review", classes: "text-yellow-800 bg-yellow-100" },
        rejected: { text: "Rejected", classes: "text-red-800 bg-red-100" },
        brand_counter_offer: { text: "Offer Sent", classes: "text-blue-800 bg-blue-100" },
        influencer_counter_offer: { text: "Offer Received", classes: "text-purple-800 bg-purple-100" },
        agreement_reached: { text: "Payment Pending", classes: "text-green-800 bg-green-100" },
        in_progress: { text: "In Progress", classes: "text-cyan-800 bg-cyan-100" },
        work_submitted: { text: "Work Submitted", classes: "text-indigo-800 bg-indigo-100" },
        completed: { text: "Completed", classes: "text-gray-800 bg-gray-100" },
        disputed: { text: "Dispute in Review", classes: "text-orange-800 bg-orange-100" },
        brand_decision_pending: { text: "Decision Pending", classes: "text-gray-800 bg-gray-100" },
    };
    const { text, classes } = statusMap[status] || { text: status.replace(/_/g, ' '), classes: "text-gray-800 bg-gray-100" };
    return <span className={`${baseClasses} ${classes}`}>{text}</span>;
};


const CampaignsPage: React.FC<CampaignsPageProps> = ({ user, platformSettings, onStartChat, onInitiateRefund }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [applications, setApplications] = useState<Record<string, CampaignApplication[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [payingApplication, setPayingApplication] = useState<CampaignApplication | null>(null);
    const [disputingApplication, setDisputingApplication] = useState<CampaignApplication | null>(null);
    const [boostingCampaign, setBoostingCampaign] = useState<Campaign | null>(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [selectedAppForOffer, setSelectedAppForOffer] = useState<CampaignApplication | null>(null);

    const OfferModal: React.FC<{ app: CampaignApplication; onClose: () => void; onConfirm: (amount: string) => void; }> = ({ app, onClose, onConfirm }) => {
        const [amount, setAmount] = useState('');
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Send Counter Offer</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Influencer offered {app.currentOffer?.amount}. Your counter-offer:</p>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 8000" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600 dark:text-gray-200">Cancel</button>
                        <button onClick={() => onConfirm(amount)} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white">Send Offer</button>
                    </div>
                </div>
            </div>
        );
    };

    const ApplicantCard: React.FC<{
        app: CampaignApplication;
        platformSettings: PlatformSettings;
        onUpdate: (appId: string, data: Partial<CampaignApplication>) => void;
        onStartChat: (participant: ConversationParticipant) => void;
        onInitiatePayment: (app: CampaignApplication) => void;
        onStartDispute: (app: CampaignApplication) => void;
        onInitiateRefund: (app: CampaignApplication) => void;
    }> = ({ app, platformSettings, onUpdate, onStartChat, onInitiatePayment, onStartDispute, onInitiateRefund }) => {
        
        const handleAction = (action: 'accept' | 'reject' | 'counter' | 'pay' | 'complete' | 'dispute' | 'brand_complete_disputed' | 'brand_request_refund') => {
            switch (action) {
                case 'accept':
                    onUpdate(app.id, { status: 'agreement_reached', finalAmount: app.currentOffer?.amount });
                    break;
                case 'reject':
                    const reason = prompt("Reason for rejection (optional):");
                    onUpdate(app.id, { status: 'rejected', rejectionReason: reason || "Not specified" });
                    break;
                case 'counter':
                    setSelectedAppForOffer(app);
                    setIsOfferModalOpen(true);
                    break;
                case 'pay':
                     onInitiatePayment(app);
                    break;
                case 'complete':
                    onUpdate(app.id, { status: 'completed' });
                    break;
                case 'dispute':
                    onStartDispute(app);
                    break;
                case 'brand_complete_disputed':
                    apiService.brandCompletesDisputedWork(app.id, 'campaign');
                    onUpdate(app.id, { status: 'completed' });
                    break;
                case 'brand_request_refund':
                    onInitiateRefund(app);
                    break;
            }
        };
    
        const renderActions = () => {
            const buttons = [];
            if (app.status === 'influencer_counter_offer' || app.status === 'pending_brand_review') {
                buttons.push(<button key="msg" onClick={() => onStartChat({id: app.influencerId, name: app.influencerName, avatar: app.influencerAvatar, role: 'influencer'})} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">Message</button>);
                buttons.push(<button key="rej" onClick={() => handleAction('reject')} className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md">Reject</button>);
                buttons.push(<button key="count" onClick={() => handleAction('counter')} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md">Counter Offer</button>);
                buttons.push(<button key="acc" onClick={() => handleAction('accept')} className="px-3 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md">Accept Offer</button>);
            }
            if (app.status === 'agreement_reached') {
                 buttons.push(<button key="pay" onClick={() => handleAction('pay')} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">Pay Now: {app.finalAmount}</button>);
            }
            if (app.status === 'work_submitted') {
                 buttons.push(<button key="disp" onClick={() => handleAction('dispute')} className="px-3 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md">Work Incomplete</button>);
                 buttons.push(<button key="comp" onClick={() => handleAction('complete')} className="px-3 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md">Work Complete</button>);
            }
             if (app.status === 'brand_decision_pending') {
                buttons.push(<button key="refund" onClick={() => handleAction('brand_request_refund')} className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md">Get Refund</button>);
                buttons.push(<button key="brand_complete" onClick={() => handleAction('brand_complete_disputed')} className="px-3 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md">Work is Complete</button>);
            }
            return <div className="mt-3 flex flex-wrap gap-2">{buttons}</div>;
        };
        
        return (
            <li className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start space-x-4">
                    <img src={app.influencerAvatar} alt={app.influencerName} className="w-10 h-10 rounded-full object-cover"/>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-gray-800">{app.influencerName}</p>
                            <ApplicationStatusBadge status={app.status} />
                        </div>
                        {app.currentOffer && <p className="text-sm font-semibold text-indigo-600">Offer: {app.currentOffer.amount}</p>}
                        <p className="text-sm text-gray-600 mt-1 italic">"{app.message}"</p>
                        {renderActions()}
                    </div>
                </div>
            </li>
        )
    };

    const fetchCampaignsAndApplications = async () => {
        setIsLoading(true);
        try {
            const brandCampaigns = await apiService.getCampaignsForBrand(user.id);
            setCampaigns(brandCampaigns);

            const appPromises = brandCampaigns.map(c => apiService.getApplicationsForCampaign(c.id));
            const allApps = await Promise.all(appPromises);
            
            const appsByCampaign: Record<string, CampaignApplication[]> = {};
            brandCampaigns.forEach((campaign, index) => {
                appsByCampaign[campaign.id] = allApps[index];
            });
            setApplications(appsByCampaign);
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaignsAndApplications();
    }, [user.id]);
    
    const handleUpdateApplication = async (appId: string, data: Partial<CampaignApplication>) => {
        // Optimistic UI update
        const updatedApps = { ...applications };
        for (const campaignId in updatedApps) {
            const appIndex = updatedApps[campaignId].findIndex(app => app.id === appId);
            if (appIndex > -1) {
                updatedApps[campaignId][appIndex] = { ...updatedApps[campaignId][appIndex], ...data };
                setApplications(updatedApps);
                break;
            }
        }
        // API call
        await apiService.updateCampaignApplication(appId, data);
        // Optional: refetch for consistency, but optimistic is faster
        // fetchCampaignsAndApplications(); 
    };

    const handlePaymentSuccess = () => {
        if (payingApplication) {
            handleUpdateApplication(payingApplication.id, { status: 'in_progress', paymentStatus: 'paid' });
        }
        setPayingApplication(null);
    };

    if (isLoading) return <div className="text-center p-8">Loading campaigns...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Campaigns</h1>
                    <p className="text-gray-500 mt-1">Create and manage your bulk collaboration campaigns.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                >
                    Create New Campaign
                </button>
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <p className="text-gray-500">You haven't created any campaigns yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-white shadow-lg rounded-2xl overflow-hidden">
                            <div className="p-4 sm:p-6 cursor-pointer hover:bg-gray-50" onClick={() => setSelectedCampaignId(selectedCampaignId === campaign.id ? null : campaign.id)}>
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">{campaign.title}</h2>
                                    <div className="flex flex-shrink-0 items-center">
                                        {campaign.isBoosted && <span className="hidden sm:inline-block text-xs font-bold text-yellow-800 bg-yellow-200 px-2 py-1 rounded-full mr-2">Boosted</span>}
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${campaign.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{campaign.status}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{campaign.category} &bull; {applications[campaign.id]?.length || 0} / {campaign.influencerCount} Applicants</p>
                            </div>
                            {selectedCampaignId === campaign.id && (
                                <>
                                    <div className="bg-gray-50 p-4 sm:p-6 border-t border-gray-200">
                                        <h3 className="font-semibold text-gray-700 mb-4">Applicants</h3>
                                        {applications[campaign.id]?.length > 0 ? (
                                            <ul className="space-y-3">
                                                {applications[campaign.id].map(app => (
                                                <ApplicantCard key={app.id} app={app} onUpdate={handleUpdateApplication} onStartChat={onStartChat} platformSettings={platformSettings} onInitiatePayment={setPayingApplication} onStartDispute={setDisputingApplication} onInitiateRefund={onInitiateRefund} />
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No applications received yet.</p>
                                        )}
                                    </div>
                                    {platformSettings.isCampaignBoostingEnabled && !campaign.isBoosted && campaign.status === 'open' && (
                                        <div className="bg-gray-100 p-4 border-t flex justify-end">
                                            <button onClick={() => setBoostingCampaign(campaign)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                                                <RocketIcon className="w-5 h-5"/> Boost Campaign
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {isModalOpen && (
                <CreateCampaignModal 
                    user={user} 
                    onClose={() => setIsModalOpen(false)} 
                    onCampaignCreated={() => {
                        fetchCampaignsAndApplications();
                        setIsModalOpen(false);
                    }}
                />
            )}

            {payingApplication && (
                <PhonePeModal
                    baseAmount={parseFloat(payingApplication.finalAmount?.replace(/[^0-9.-]+/g, "") || "0")}
                    platformSettings={platformSettings}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setPayingApplication(null)}
                    transactionDetails={{
                        userId: user.id,
                        description: `Payment for campaign: ${payingApplication.campaignTitle}`,
                        relatedId: payingApplication.id,
                    }}
                />
            )}

            {disputingApplication && (
                <DisputeModal
                    user={user}
                    collaboration={disputingApplication}
                    onClose={() => setDisputingApplication(null)}
                    onDisputeSubmitted={() => {
                        setDisputingApplication(null);
                        fetchCampaignsAndApplications();
                    }}
                />
            )}

            {boostingCampaign && (
                <BoostCampaignModal
                    user={user}
                    campaign={boostingCampaign}
                    platformSettings={platformSettings}
                    onClose={() => setBoostingCampaign(null)}
                    onBoostActivated={() => {
                        setBoostingCampaign(null);
                        fetchCampaignsAndApplications();
                    }}
                />
            )}

            {isOfferModalOpen && selectedAppForOffer && (
                <OfferModal
                    app={selectedAppForOffer}
                    onClose={() => {
                        setIsOfferModalOpen(false);
                        setSelectedAppForOffer(null);
                    }}
                    onConfirm={(amount) => {
                        handleUpdateApplication(selectedAppForOffer.id, {
                            status: 'brand_counter_offer',
                            currentOffer: { amount: `₹${amount}`, offeredBy: 'brand' }
                        });
                        setIsOfferModalOpen(false);
                        setSelectedAppForOffer(null);
                    }}
                />
            )}
        </div>
    );
};

export default CampaignsPage;