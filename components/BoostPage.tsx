import React, { useState, useEffect } from 'react';
import { User, PlatformSettings, Boost, BoostDuration } from '../types';
import { apiService } from '../services/apiService';
import PhonePeModal from './PhonePeModal';
import { Timestamp } from 'firebase/firestore';
import { RocketIcon, SparklesIcon } from './Icons';

interface BoostPageProps {
    user: User;
    platformSettings: PlatformSettings;
    onBoostActivated: () => void;
}

const BoostPage: React.FC<BoostPageProps> = ({ user, platformSettings, onBoostActivated }) => {
    const [boosts, setBoosts] = useState<Boost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingForPlan, setPayingForPlan] = useState<{ plan: BoostDuration; price: number } | null>(null);

    useEffect(() => {
        setIsLoading(true);
        apiService.getBoostsForUser(user.id)
            .then(setBoosts)
            .catch(() => setError("Failed to load your boost status."))
            .finally(() => setIsLoading(false));
    }, [user.id]);

    const handlePaymentSuccess = () => {
        if (!payingForPlan) return;

        apiService.activateBoost(user.id, payingForPlan.plan, user.id, 'profile')
            .then(() => {
                onBoostActivated();
                // Refetch boosts to show the new status
                apiService.getBoostsForUser(user.id).then(setBoosts);
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to activate boost. Please contact support.');
            })
            .finally(() => {
                setPayingForPlan(null);
            });
    };

    const activeProfileBoost = boosts.find(b => b.targetType === 'profile' && (b.expiresAt as Timestamp).toDate() > new Date());

    const boostPlans = [
        { id: '1w' as BoostDuration, name: '1 Week', price: platformSettings.boostPrices['1w'] },
        { id: '2w' as BoostDuration, name: '2 Weeks', price: platformSettings.boostPrices['2w'] },
        { id: '1m' as BoostDuration, name: '1 Month', price: platformSettings.boostPrices['1m'] },
        { id: '1y' as BoostDuration, name: '1 Year', price: platformSettings.boostPrices['1y'] },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Boost Your Profile</h1>
                <p className="text-gray-500 mt-1">Get featured at the top of discovery pages and attract more brands.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-purple-500">
                <h2 className="text-2xl font-bold text-gray-800">Your Boost Status</h2>
                {isLoading ? <p className="mt-4 text-gray-500">Loading status...</p> : 
                activeProfileBoost ? (
                    <div className="mt-4 text-center py-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-lg font-semibold text-green-700">Your profile is currently boosted!</p>
                        <p className="text-gray-600">Expires on: {(activeProfileBoost.expiresAt as Timestamp).toDate().toLocaleDateString()}</p>
                    </div>
                ) : (
                    <div className="mt-4 text-center py-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-lg font-semibold text-gray-700">Your profile is not currently boosted.</p>
                        <p className="text-gray-600">Choose a plan below to increase your visibility.</p>
                    </div>
                )}
            </div>
            
            {error && <div className="p-4 text-center text-red-700 bg-red-100 rounded-lg">{error}</div>}
            
            {platformSettings.isProfileBoostingEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {boostPlans.map((plan) => (
                        <div key={plan.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col text-center transform hover:-translate-y-2 transition-transform duration-300">
                            <h3 className="text-xl font-bold">{plan.name}</h3>
                            <p className="text-3xl font-extrabold text-gray-800 my-4">₹{plan.price}</p>
                            <div className="flex-grow"></div>
                            <button
                                onClick={() => setPayingForPlan(plan)}
                                disabled={isLoading || !!activeProfileBoost || user.role === 'banneragency'}
                                title={user.role === 'banneragency' ? 'Profile boosting is not currently available for agencies.' : undefined}
                                className="w-full mt-4 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {activeProfileBoost ? 'Active' : 'Get Boost'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-10 bg-white rounded-lg shadow"><p className="text-gray-500">Profile boosting is currently disabled by the administrator.</p></div>
            )}

            {payingForPlan && (
                <PhonePeModal
                    baseAmount={payingForPlan.price}
                    platformSettings={platformSettings}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => setPayingForPlan(null)}
                    transactionDetails={{
                        userId: user.id,
                        description: `Profile Boost: ${payingForPlan.plan}`,
                        relatedId: user.id,
                    }}
                />
            )}
        </div>
    );
};

export default BoostPage;