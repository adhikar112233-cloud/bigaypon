import React, { useState, useMemo } from 'react';
import { User, Transaction, PayoutRequest, UserRole } from '../types';
import { Timestamp } from 'firebase/firestore';

interface AdminPaymentHistoryPageProps {
    transactions: Transaction[];
    payouts: PayoutRequest[];
    allUsers: User[];
}

interface CombinedHistoryItem {
    date: Date | undefined;
    description: string;
    type: 'Payment Made' | 'Payout';
    amount: number;
    status: string;
    transactionId: string;
    userName: string;
    userAvatar: string;
    userRole: UserRole;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    let colorClasses = "bg-gray-100 text-gray-800";
    if (s === 'completed' || s === 'approved') {
        colorClasses = "bg-green-100 text-green-800";
    } else if (s === 'pending') {
        colorClasses = "bg-yellow-100 text-yellow-800";
    } else if (s === 'rejected' || s === 'failed') {
        colorClasses = "bg-red-100 text-red-800";
    }
    return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses} capitalize`}>{status.replace('_', ' ')}</span>;
};

const AdminPaymentHistoryPage: React.FC<AdminPaymentHistoryPageProps> = ({ transactions, payouts, allUsers }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'payments' | 'payouts'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const combinedHistory = useMemo<CombinedHistoryItem[]>(() => {
        const userMap: Map<string, User> = new Map(allUsers.map(u => [u.id, u]));
        
        const safeToDate = (ts: any): Date | undefined => {
            if (ts && typeof ts.toDate === 'function') {
                try {
                    return (ts as Timestamp).toDate();
                } catch (e) {
                    return undefined;
                }
            }
            return undefined;
        };

        const mappedTransactions: CombinedHistoryItem[] = transactions.map(t => {
            const user = userMap.get(t.userId);
            return {
                date: safeToDate(t.timestamp),
                description: t.description,
                type: 'Payment Made',
                amount: t.amount,
                status: t.status,
                transactionId: t.transactionId,
                userName: user?.name || 'Unknown User',
                userAvatar: user?.avatar || '',
                userRole: user?.role || 'brand', // Default to brand for safety
            };
        });

        const mappedPayouts: CombinedHistoryItem[] = payouts.map(p => {
            const user = userMap.get(p.userId);
            return {
                date: safeToDate(p.timestamp),
                description: p.collaborationTitle,
                type: 'Payout',
                amount: p.amount,
                status: p.status,
                transactionId: p.id,
                userName: p.userName,
                userAvatar: p.userAvatar,
                userRole: user?.role || 'influencer', // Default to influencer for safety
            };
        });

        return [...mappedTransactions, ...mappedPayouts].sort((a, b) => {
            const timeA = a.date instanceof Date ? a.date.getTime() : 0;
            const timeB = b.date instanceof Date ? b.date.getTime() : 0;
            return timeB - timeA;
        });
    }, [transactions, payouts, allUsers]);
    
    const filteredHistory = useMemo(() => {
        let history = combinedHistory;

        if (activeTab === 'payments') {
            history = history.filter(item => item.type === 'Payment Made');
        }
        if (activeTab === 'payouts') {
            history = history.filter(item => item.type === 'Payout');
        }

        if (!searchTerm.trim()) {
            return history;
        }

        const lowerSearch = searchTerm.toLowerCase();
        return history.filter(item =>
            item.userName.toLowerCase().includes(lowerSearch) ||
            item.description.toLowerCase().includes(lowerSearch) ||
            item.transactionId.toLowerCase().includes(lowerSearch)
        );
    }, [combinedHistory, activeTab, searchTerm]);

    const TabButton: React.FC<{ tab: typeof activeTab, children: React.ReactNode }> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Platform Payment History</h1>
                <p className="text-gray-500 mt-1">Review all payments and payouts across the platform.</p>
            </div>
            <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center flex-wrap gap-4">
                    <nav className="flex space-x-2">
                        <TabButton tab="all">All</TabButton>
                        <TabButton tab="payments">Payments Made</TabButton>
                        <TabButton tab="payouts">Payouts</TabButton>
                    </nav>
                    <div className="w-full sm:w-auto sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Search by user, description, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>
                {filteredHistory.length === 0 ? (
                    <p className="p-6 text-center text-gray-500">No transactions found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredHistory.map((item, index) => (
                                    <tr key={`${item.transactionId}-${index}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date?.toLocaleString() || 'Invalid Date'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-8 w-8 rounded-full" src={item.userAvatar} alt={item.userName} />
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">{item.userName}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{item.userRole}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">{item.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`font-semibold ${item.type === 'Payment Made' ? 'text-red-600' : 'text-green-600'}`}>{item.type}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                            {item.type === 'Payment Made' ? '-' : '+'} ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono max-w-[100px] truncate">{item.transactionId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPaymentHistoryPage;