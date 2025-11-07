import React, { useState, useMemo, useCallback } from 'react';
import { PayoutRequest, RefundRequest, DailyPayoutRequest, UserRole } from '../types';
import { apiService } from '../services/apiService';
import { Timestamp } from 'firebase/firestore';

interface PayoutQueueItem {
    id: string;
    requestType: 'Payout' | 'Refund' | 'Daily Payout';
    status: 'pending' | 'approved' | 'rejected' | 'on_hold' | 'processing';
    amount: number;
    userName: string;
    userAvatar: string;
    userRole: UserRole;
    brandName?: string;
    collabTitle: string;
    collabId: string;
    collabType: 'direct' | 'campaign' | 'ad_slot' | 'banner_booking';
    timestamp: any;
    bankDetails?: string;
    upiId?: string;
    panNumber?: string;
    description?: string;
    originalRequest: PayoutRequest | RefundRequest | DailyPayoutRequest;
}

const StatusBadge: React.FC<{ status: PayoutQueueItem['status'] }> = ({ status }) => {
    const base = "px-2 py-0.5 text-xs font-medium rounded-full capitalize";
    const colors: Record<PayoutQueueItem['status'], string> = {
        pending: "bg-yellow-100 text-yellow-800",
        approved: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800",
        on_hold: "bg-blue-100 text-blue-800",
        processing: "bg-purple-100 text-purple-800",
    };
    return <span className={`${base} ${colors[status]}`}>{status.replace('_', ' ')}</span>;
};

const ActionDropdown: React.FC<{ item: PayoutQueueItem, onAction: (item: PayoutQueueItem, status: PayoutQueueItem['status'], reason?: string, amount?: number) => void }> = ({ item, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const handleActionClick = (status: PayoutQueueItem['status']) => {
        setIsOpen(false);
        if (status === 'rejected') {
            const reason = prompt("Please provide a reason for rejection:");
            // Proceed even if reason is empty or cancelled (null)
            onAction(item, status, reason || "");
        } else if (item.requestType === 'Daily Payout' && status === 'approved') {
            const amount = prompt("Enter the approved amount for this daily payout:");
            if (amount && !isNaN(Number(amount))) {
                onAction(item, status, undefined, Number(amount));
            } else if (amount) {
                alert("Please enter a valid number for the amount.");
            }
        }
        else {
            onAction(item, status);
        }
    };

    const actions: PayoutQueueItem['status'][] = ['approved', 'on_hold', 'processing', 'rejected'];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300">Actions</button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-10">
                    {actions.map(action => (
                        <button key={action} onClick={() => handleActionClick(action)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 capitalize">
                            {action.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface PayoutsPanelProps {
    payouts: PayoutRequest[];
    refunds: RefundRequest[];
    dailyPayouts: DailyPayoutRequest[];
    onUpdate: () => void;
}

const PayoutsPanel: React.FC<PayoutsPanelProps> = ({ payouts, refunds, dailyPayouts, onUpdate }) => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'processing'>('pending');
    const [editingItem, setEditingItem] = useState<PayoutQueueItem | null>(null);

    const combinedRequests = useMemo<PayoutQueueItem[]>(() => {
        const p: PayoutQueueItem[] = payouts.map(r => ({
            id: r.id, requestType: 'Payout', status: r.status, amount: r.amount, userName: r.userName,
            userAvatar: r.userAvatar, userRole: 'influencer', collabTitle: r.collaborationTitle,
            collabId: r.collaborationId, collabType: r.collaborationType, timestamp: r.timestamp,
            bankDetails: r.bankDetails, upiId: r.upiId,
            originalRequest: r,
        }));
        const r: PayoutQueueItem[] = refunds.map(r => ({
            id: r.id, requestType: 'Refund', status: r.status, amount: r.amount, userName: r.brandName,
            userAvatar: r.brandAvatar, userRole: 'brand', brandName: r.brandName, collabTitle: r.collabTitle,
            collabId: r.collabId, collabType: r.collabType, timestamp: r.timestamp,
            bankDetails: r.bankDetails, panNumber: r.panNumber, description: r.description,
            originalRequest: r,
        }));
        const d: PayoutQueueItem[] = dailyPayouts.map(r => ({
            id: r.id, requestType: 'Daily Payout', status: r.status, amount: r.approvedAmount || 0, userName: r.userName,
            userAvatar: '', userRole: r.userRole, collabTitle: `Daily Payout for ${r.collaborationId}`,
            collabId: r.collaborationId, collabType: r.collaborationType, timestamp: r.timestamp, originalRequest: r,
        }));

        return [...p, ...r, ...d].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
    }, [payouts, refunds, dailyPayouts]);
    
    const filteredRequests = useMemo(() => {
        if (filter === 'all') return combinedRequests;
        if (filter === 'processing') return combinedRequests.filter(r => r.status === 'processing' || r.status === 'on_hold');
        return combinedRequests.filter(r => r.status === 'pending');
    }, [combinedRequests, filter]);

    const handleStatusUpdate = async (item: PayoutQueueItem, status: PayoutQueueItem['status'], reason?: string, amount?: number) => {
        try {
            switch (item.requestType) {
                case 'Payout':
                    await apiService.updatePayoutStatus(item.id, status, item.collabId, item.collabType, reason);
                    break;
                case 'Refund':
                    const refundUpdateData: Partial<RefundRequest> = { status };
                    if (reason !== undefined) {
                        refundUpdateData.rejectionReason = reason;
                    }
                    await apiService.updateRefundRequest(item.id, refundUpdateData);
                    break;
                case 'Daily Payout':
                    if (status === 'approved' || status === 'rejected') {
                        await apiService.updateDailyPayoutRequestStatus(item.id, item.collabId, item.collabType as 'ad_slot' | 'banner_booking', status, amount, reason);
                    } else { // 'on_hold' or 'processing'
                        await apiService.updateDailyPayoutRequest(item.id, { status });
                    }
                    break;
            }
            onUpdate();
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status.");
        }
    };
    
    const handleSaveDetails = async (item: PayoutQueueItem, data: Partial<PayoutRequest | RefundRequest>) => {
        try {
            if (item.requestType === 'Payout') {
                await apiService.updatePayoutRequest(item.id, data);
            } else if (item.requestType === 'Refund') {
                await apiService.updateRefundRequest(item.id, data as Partial<RefundRequest>);
            }
            setEditingItem(null);
            onUpdate();
        } catch (error) {
            console.error("Failed to update details:", error);
            alert("Failed to save details.");
        }
    };
    
    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Payouts & Refunds</h2>
            <div className="flex space-x-2 mb-4">
                <button onClick={() => setFilter('pending')} className={`px-3 py-1 text-sm rounded-md ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Pending</button>
                <button onClick={() => setFilter('processing')} className={`px-3 py-1 text-sm rounded-md ${filter === 'processing' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Processing/Hold</button>
                <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm rounded-md ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>All</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-inner">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Details</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredRequests.map(item => (
                            <tr key={item.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img className="h-8 w-8 rounded-full" src={item.userAvatar} alt={item.userName} />
                                        <div className="ml-2">
                                            <div className="text-sm font-medium">{item.userName}</div>
                                            <div className="text-xs text-gray-500 capitalize">{item.userRole}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-semibold">{item.collabTitle}</div>
                                    <div className="text-xs text-gray-600">{item.requestType}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                                     ₹{item.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded w-48 overflow-auto">
                                        {item.requestType === 'Payout' && (item.bankDetails || item.upiId || 'N/A')}
                                        {item.requestType === 'Refund' && (item.bankDetails || 'N/A')}
                                        {item.requestType === 'Daily Payout' && 'N/A'}
                                    </pre>
                                    {(item.requestType === 'Payout' || item.requestType === 'Refund') && (
                                        <button onClick={() => setEditingItem(item)} className="text-xs text-indigo-600 hover:underline mt-1">
                                            Edit Details
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {item.timestamp?.toDate?.().toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <StatusBadge status={item.status} />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <ActionDropdown item={item} onAction={handleStatusUpdate} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredRequests.length === 0 && <p className="p-6 text-center text-gray-500">No requests in this category.</p>}
            </div>
            {editingItem && (
                <EditDetailsModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveDetails}
                />
            )}
        </div>
    );
};

interface EditDetailsModalProps {
    item: PayoutQueueItem;
    onClose: () => void;
    onSave: (item: PayoutQueueItem, data: Partial<PayoutRequest | RefundRequest>) => void;
}

const EditDetailsModal: React.FC<EditDetailsModalProps> = ({ item, onClose, onSave }) => {
    const [details, setDetails] = useState({
        bankDetails: item.bankDetails || '',
        upiId: item.upiId || '',
        panNumber: item.panNumber || '',
        description: item.description || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(item, details);
        setIsSaving(false);
    };

    const isPayout = item.requestType === 'Payout';
    const isRefund = item.requestType === 'Refund';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Edit Payment Details for {item.userName}</h3>
                <div className="space-y-4">
                    {isPayout && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Bank Details</label>
                                <textarea name="bankDetails" value={details.bankDetails} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                                <input name="upiId" value={details.upiId} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                        </>
                    )}
                    {isRefund && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Bank Details</label>
                                <textarea name="bankDetails" value={details.bankDetails} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                                <input name="panNumber" value={details.panNumber} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Description/Reason</label>
                                <textarea name="description" value={details.description} onChange={handleChange} rows={2} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default PayoutsPanel;