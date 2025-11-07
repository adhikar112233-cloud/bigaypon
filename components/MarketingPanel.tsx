import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { PlatformBanner, PlatformSettings } from '../types';
import { ImageIcon, TrashIcon } from './Icons';

// Re-using ToggleSwitch from SettingsPanel logic
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`${enabled ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

interface MarketingPanelProps {
    platformSettings: PlatformSettings;
    onUpdate: () => void;
}

const MarketingPanel: React.FC<MarketingPanelProps> = ({ platformSettings, onUpdate }) => {
    // Banner State
    const [banners, setBanners] = useState<PlatformBanner[]>([]);
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);
    const [newBannerTitle, setNewBannerTitle] = useState('');
    const [newBannerTargetUrl, setNewBannerTargetUrl] = useState('');
    const [newBannerImageFile, setNewBannerImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Notification State
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationBody, setNotificationBody] = useState('');
    const [notificationTargetUrl, setNotificationTargetUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [subscribedUserCount, setSubscribedUserCount] = useState(0);

    // Feedback State
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const fetchBanners = useCallback(async () => {
        setIsLoadingBanners(true);
        try {
            const data = await apiService.getPlatformBanners();
            setBanners(data);
        } catch (error) {
            showFeedback('error', 'Failed to load banners.');
        } finally {
            setIsLoadingBanners(false);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
        apiService.getSubscribedUserCount().then(setSubscribedUserCount);
    }, [fetchBanners]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setNewBannerImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleCreateBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBannerTitle || !newBannerTargetUrl || !newBannerImageFile) {
            showFeedback('error', 'All fields are required for a new banner.');
            return;
        }
        setIsUploading(true);
        try {
            const imageUrl = await apiService.uploadPlatformBannerImage(newBannerImageFile);
            await apiService.createPlatformBanner({
                title: newBannerTitle,
                imageUrl,
                targetUrl: newBannerTargetUrl,
                isActive: false,
            });
            showFeedback('success', 'Banner created successfully.');
            // Reset form
            setNewBannerTitle('');
            setNewBannerTargetUrl('');
            setNewBannerImageFile(null);
            setImagePreview(null);
            fetchBanners();
            onUpdate(); // To update dashboard banner if it's active
        } catch (error) {
            showFeedback('error', 'Failed to create banner.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleToggleBanner = async (banner: PlatformBanner) => {
        try {
            await apiService.updatePlatformBanner(banner.id, { isActive: !banner.isActive });
            showFeedback('success', `Banner ${!banner.isActive ? 'activated' : 'deactivated'}.`);
            fetchBanners();
            onUpdate();
        } catch (error) {
            showFeedback('error', 'Failed to update banner status.');
        }
    };

    const handleDeleteBanner = async (bannerId: string) => {
        if (window.confirm("Are you sure you want to delete this banner?")) {
            try {
                await apiService.deletePlatformBanner(bannerId);
                showFeedback('success', 'Banner deleted.');
                fetchBanners();
            } catch (error) {
                showFeedback('error', 'Failed to delete banner.');
            }
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!notificationTitle || !notificationBody) {
            showFeedback('error', 'Title and Body are required for notifications.');
            return;
        }
        if(!window.confirm(`Send this notification to ${subscribedUserCount} users?`)) return;

        setIsSending(true);
        try {
            await apiService.sendPushNotification(notificationTitle, notificationBody, notificationTargetUrl);
            showFeedback('success', 'Notification queued for sending.');
            setNotificationTitle('');
            setNotificationBody('');
            setNotificationTargetUrl('');
        } catch (error) {
            showFeedback('error', 'Failed to send notification.');
        } finally {
            setIsSending(false);
        }
    };


    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 bg-gray-50">
            {feedback && (
                <div className={`p-3 rounded-lg text-white text-sm ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {feedback.message}
                </div>
            )}
            {/* Banners Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Platform Banners</h2>
                
                {/* Create Form */}
                <form onSubmit={handleCreateBanner} className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Create New Banner</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Banner Title" value={newBannerTitle} onChange={e => setNewBannerTitle(e.target.value)} className="w-full p-2 border rounded-md" />
                        <input type="url" placeholder="Target URL (e.g., https://...)" value={newBannerTargetUrl} onChange={e => setNewBannerTargetUrl(e.target.value)} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Banner Image</label>
                        <div className="mt-1 flex items-center gap-4">
                            <div className="w-32 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                                {imagePreview ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-md" /> : <ImageIcon className="w-8 h-8 text-gray-400" />}
                            </div>
                            <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        </div>
                    </div>
                    <button type="submit" disabled={isUploading} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {isUploading ? 'Uploading...' : 'Create Banner'}
                    </button>
                </form>

                {/* Banner List */}
                <div className="mt-6 space-y-3">
                    {isLoadingBanners ? <p>Loading banners...</p> : banners.map(banner => (
                        <div key={banner.id} className="p-3 border rounded-lg flex items-center justify-between gap-4">
                            <img src={banner.imageUrl} alt={banner.title} className="w-24 h-12 object-cover rounded-md" />
                            <div className="flex-1">
                                <p className="font-semibold">{banner.title}</p>
                                <a href={banner.targetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 truncate">{banner.targetUrl}</a>
                            </div>
                            <div className="flex items-center gap-4">
                                <ToggleSwitch enabled={banner.isActive} onChange={() => handleToggleBanner(banner)} />
                                <button onClick={() => handleDeleteBanner(banner.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Push Notifications</h2>
                <form onSubmit={handleSendNotification} className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <input type="text" placeholder="Notification Title" value={notificationTitle} onChange={e => setNotificationTitle(e.target.value)} className="w-full p-2 border rounded-md" required />
                    <textarea placeholder="Notification Body" value={notificationBody} onChange={e => setNotificationBody(e.target.value)} rows={3} className="w-full p-2 border rounded-md" required />
                    <input type="url" placeholder="Target URL (Optional)" value={notificationTargetUrl} onChange={e => setNotificationTargetUrl(e.target.value)} className="w-full p-2 border rounded-md" />
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">Reaches ~{subscribedUserCount} users.</p>
                        <button type="submit" disabled={isSending} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {isSending ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MarketingPanel;
