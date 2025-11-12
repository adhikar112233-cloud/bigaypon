
import React, { useState } from 'react';
import { User, Campaign, PlatformSettings, BoostDuration } from '../types';
import { apiService } from '../services/apiService';
import PhonePeModal from './PhonePeModal';
import { Timestamp } from 'firebase/firestore';

interface BoostCampaignModalProps {
    user: User;
    campaign: Campaign;
    platformSettings: PlatformSettings;
    onClose: () => void;
    onBoostActivated: () => void;
}

const BoostCampaignModal: React.FC<BoostCampaignModalProps> = ({ user, campaign, platformSettings, onClose, onBoostActivated }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payingForPlan, setPayingForPlan] = useState<{ plan: BoostDuration; price: number } | null>(null);
    const [success, setSuccess] = useState(false);

    const handlePaymentSuccess = () => {
        if (!payingForPlan) return;

        setIsLoading(true);
        apiService.activateBoost(user.id, payingForPlan.plan, campaign.id, 'campaign')
            .then(() => {
                setSuccess(true);
                setTimeout(() => {
                    onBoostActivated();
                }, 2000);
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to activate boost. Please contact support.');
            })
            .finally(() => {
                setIsLoading(false);
                setPayingForPlan(null);
            });
    };
    
    const discountSetting = platformSettings.discountSettings.brandCampaignBoost;

    const getDiscountedPrice = (originalPrice: number) => {
        if (discountSetting.isEnabled && discountSetting.percentage > 0) {
            return originalPrice * (1 - discountSetting.percentage / 100);
        }
        return originalPrice;
    };

    const boostPlans = [
        { id: '1w' as BoostDuration, name: '1 Week', originalPrice: platformSettings.boostPrices['1w'] },
        { id: '2w' as BoostDuration, name: '2 Weeks', originalPrice: platformSettings.boostPrices['2w'] },
        { id: '1m' as BoostDuration, name: '1 Month', originalPrice: platformSettings.boostPrices['1m'] },
    ].map(plan => ({
        ...plan,
        price: getDiscountedPrice(plan.originalPrice)
    }));


    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-4xl relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">&times;</button>
                    
                    {success ? (
                        <div className="text-center py-8">
                            <h2 className="text-2xl font-bold text-green-500">Campaign Boosted!</h2>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">Your campaign will now be featured at the top of the discovery page.</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Boost Your Campaign</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Increase visibility for "{campaign.title}" and attract top influencers faster.</p>
                            </div>
                            
                            {error && <div className="p-4 text-center text-red-700 bg-red-100 rounded-lg mb-4">{error}</div>}
                            
                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isLoading ? 'opacity-50' : ''}`}>
                                {boostPlans.map((plan) => (
                                    <div key={plan.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col text-center">
                                        <h3 className="text-xl font-bold dark:text-gray-200">{plan.name}</h3>
                                        <div className="my-4">
                                            {discountSetting.isEnabled && plan.price !== plan.originalPrice && (
                                                <div>
                                                    <del className="text-xl font-bold text-gray-400">₹{plan.originalPrice.toLocaleString('en-IN')}</del>
                                                    <p className="text-sm font-semibold text-green-600">{discountSetting.percentage}% OFF</p>
                                                </div>
                                            )}
                                            <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">₹{plan.price.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="flex-grow"></div>
                                        <button
                                            onClick={() => setPayingForPlan({ plan: plan.id, price: plan.price })}
                                            disabled={isLoading}
                                            className="w-full mt-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-sm hover:shadow-lg disabled:opacity-50"
                                        >
                                            Choose Plan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {payingForPlan && (
                <PhonePeModal
                    baseAmount={payingForPlan.price}
                    platformSettings={platformSettings}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setPayingForPlan(null)}
                    transactionDetails={{
                        userId: user.id,
                        description: `Campaign Boost (${payingForPlan.plan}): ${campaign.title}`,
                        relatedId: campaign.id,
                    }}
                />
            )}
        </>
    );
};

export default BoostCampaignModal;
