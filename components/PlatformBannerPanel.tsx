import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { generateImageFromPrompt, enhanceImagePrompt } from '../services/geminiService';
import { PlatformBanner } from '../types';
import { SparklesIcon, TrashIcon, ImageIcon } from './Icons';

// Reusing ToggleSwitch from AdminPanel
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`${enabled ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
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

// Helper function to convert base64 string to a File object for uploading.
const base64ToFile = (base64: string, filename: string): File => {
    const dataUrl = `data:image/png;base64,${base64}`;
    const arr = dataUrl.split(',');
    // The first part of the array is the mime type, the second is the data
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL for file conversion');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    isSaving: boolean;
    bannerDetails: { title: string; targetUrl: string };
}> = ({ onConfirm, onCancel, isSaving, bannerDetails }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Confirm Banner Creation</h3>
            <div className="my-4 text-gray-600 dark:text-gray-300 space-y-2">
                <p>Please confirm you want to create the following banner:</p>
                <ul className="text-sm list-disc list-inside bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                    <li><strong>Title:</strong> {bannerDetails.title}</li>
                    <li className="truncate"><strong>URL:</strong> {bannerDetails.targetUrl}</li>
                </ul>
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Confirm & Save'}
                </button>
            </div>
        </div>
    </div>
);


const PlatformBannerPanel: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const [banners, setBanners] = useState<PlatformBanner[]>([]);
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);

    // Form state
    const [title, setTitle] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null); // base64 string
    const [manualImageFile, setManualImageFile] = useState<File | null>(null);
    const [manualImagePreview, setManualImagePreview] = useState<string | null>(null);
    const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const fetchBanners = useCallback(async () => {
        setIsLoadingBanners(true);
        try {
            const data = await apiService.getPlatformBanners();
            setBanners(data);
        } catch (err) {
            setError('Failed to load banners.');
        } finally {
            setIsLoadingBanners(false);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    const handleGenerateImage = async () => {
        if (!aiPrompt.trim()) {
            setError('Please enter a prompt for the AI.');
            return;
        }
        setError(null);
        setWarning(null);
        setIsGenerating(true);
        setGeneratedImage(null);
        setManualImageFile(null);
        setManualImagePreview(null);

        const result = await generateImageFromPrompt(aiPrompt);

        // FIX: Correctly handle discriminated union by checking `success` property first.
        if (result.success) {
            // Handle success case where `data` exists
            setGeneratedImage(result.data);
            setIsGenerating(false);
        } else {
            // Handle failure case where `reason` and `message` exist
            if (result.reason === 'NO_IMAGE') {
                setWarning("Couldn't generate an image. Trying to improve your prompt...");
                try {
                    const enhancedPrompt = await enhanceImagePrompt(aiPrompt);
                    setAiPrompt(enhancedPrompt);
                    setWarning("We've enhanced your prompt for you! Try generating again.");
                } catch (e) {
                    setError("Failed to enhance the prompt. Please try rephrasing it manually.");
                    setWarning(null);
                } finally {
                    setIsGenerating(false);
                }
            } else {
                setWarning(result.message);
                setIsGenerating(false);
            }
        }
    };

    const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setManualImageFile(file);
            if (manualImagePreview) {
                URL.revokeObjectURL(manualImagePreview);
            }
            setManualImagePreview(URL.createObjectURL(file));
            setGeneratedImage(null);
            setAiPrompt('');
            setError(null);
            setWarning(null);
        }
    };

    const handleSaveBanner = async () => {
        if (!title.trim() || !targetUrl.trim() || (!generatedImage && !manualImageFile)) {
            setError('Title, Target URL, and an image are required.');
            return;
        }
        setError(null);
        setShowConfirmModal(true);
    };

    const executeSaveBanner = async () => {
        setShowConfirmModal(false);
        setIsSaving(true);
        try {
            let imageToUpload: File;
            if (generatedImage) {
                imageToUpload = base64ToFile(generatedImage, `banner_${Date.now()}.png`);
            } else if (manualImageFile) {
                imageToUpload = manualImageFile;
            } else {
                throw new Error("No image selected for upload.");
            }

            const imageUrl = await apiService.uploadPlatformBannerImage(imageToUpload);

            await apiService.createPlatformBanner({
                title,
                targetUrl,
                imageUrl,
                isActive: true,
            });
            
            setTitle('');
            setTargetUrl('');
            setAiPrompt('');
            setGeneratedImage(null);
            setManualImageFile(null);
            if (manualImagePreview) URL.revokeObjectURL(manualImagePreview);
            setManualImagePreview(null);
            onUpdate();
            fetchBanners();
        } catch (err) {
            console.error(err);
            setError('Failed to save banner. The image may be too large or there was a server error.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (banner: PlatformBanner) => {
        try {
            await apiService.updatePlatformBanner(banner.id, { isActive: !banner.isActive });
            onUpdate();
            fetchBanners();
        } catch (err) {
            alert('Failed to update banner status.');
        }
    };

    const handleDelete = async (bannerId: string) => {
        if (window.confirm('Are you sure you want to delete this banner?')) {
            try {
                await apiService.deletePlatformBanner(bannerId);
                onUpdate();
                fetchBanners();
            } catch (err) {
                alert('Failed to delete banner.');
            }
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Platform Banners</h2>

            {/* Create Banner Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold mb-4 dark:text-gray-200">Create New Banner</h3>
                {error && <p className="text-red-700 text-sm mb-4 p-3 bg-red-50 rounded-md border border-red-200">{error}</p>}
                {warning && <p className="text-yellow-800 text-sm mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">{warning}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <input type="text" placeholder="Banner Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                        <input type="url" placeholder="Target URL (e.g., https://...)" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                        
                        <div className="flex border-b border-gray-200 dark:border-gray-600">
                            <button onClick={() => setCreationMode('ai')} className={`flex-1 py-2 text-sm font-medium ${creationMode === 'ai' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>Generate with AI</button>
                            <button onClick={() => setCreationMode('manual')} className={`flex-1 py-2 text-sm font-medium ${creationMode === 'manual' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>Upload Manually</button>
                        </div>

                        {creationMode === 'ai' ? (
                            <div>
                                <textarea placeholder="AI Prompt for banner image..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                <button onClick={handleGenerateImage} disabled={isGenerating} className="w-full mt-2 flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    <SparklesIcon className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Working...' : 'Generate Image'}
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed rounded-md text-center">
                                <label htmlFor="manual-image-upload" className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500">
                                    <ImageIcon className="w-5 h-5 mr-2" />
                                    Choose an image...
                                </label>
                                <input id="manual-image-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleManualFileChange} />
                                <p className="text-xs text-gray-500 mt-2">PNG or JPG, landscape recommended.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md p-4 min-h-[200px]">
                        {generatedImage ? (
                            <img src={`data:image/png;base64,${generatedImage}`} alt="AI Generated Banner" className="max-w-full max-h-48 rounded-md" />
                        ) : manualImagePreview ? (
                            <img src={manualImagePreview} alt="Manual Upload Preview" className="max-w-full max-h-48 rounded-md" />
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">Image preview will appear here.</p>
                        )}
                    </div>
                </div>
                 <div className="mt-4 flex justify-end">
                    <button onClick={handleSaveBanner} disabled={isSaving || (!generatedImage && !manualImageFile)} className="px-6 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        Save Banner
                    </button>
                </div>
            </div>

            {/* Existing Banners List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex-1 overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 dark:text-gray-200">Manage Existing Banners</h3>
                {isLoadingBanners ? <p>Loading...</p> : banners.length === 0 ? <p className="text-gray-500">No banners created yet.</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target URL</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {banners.map(banner => (
                                    <tr key={banner.id}>
                                        <td className="px-4 py-2"><img src={banner.imageUrl} alt={banner.title} className="h-10 w-20 object-cover rounded" /></td>
                                        <td className="px-4 py-2 text-sm font-medium dark:text-gray-200">{banner.title}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate"><a href={banner.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{banner.targetUrl}</a></td>
                                        <td className="px-4 py-2"><ToggleSwitch enabled={banner.isActive} onChange={() => handleToggleActive(banner)} /></td>
                                        <td className="px-4 py-2">
                                            <button onClick={() => handleDelete(banner.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <ConfirmationModal
                    onConfirm={executeSaveBanner}
                    onCancel={() => setShowConfirmModal(false)}
                    isSaving={isSaving}
                    bannerDetails={{ title, targetUrl }}
                />
            )}
        </div>
    );
};

export default PlatformBannerPanel;
