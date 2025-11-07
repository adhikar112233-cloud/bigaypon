import React, { useState, useRef } from 'react';
import { User, Attachment, SupportTicketPriority } from '../types';
import { apiService } from '../services/apiService';
import { ImageIcon, DocumentIcon, AudioIcon, VideoIcon } from './Icons';

interface CreateTicketModalProps {
    user: User;
    onClose: () => void;
    onTicketCreated: () => void;
}

const getFileType = (file: File): Attachment['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
};

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ user, onClose, onTicketCreated }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<SupportTicketPriority>('Medium');
    const [attachments, setAttachments] = useState<File[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
        if(e.target) e.target.value = '';
    };
    
    const removeAttachment = (fileToRemove: File) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!subject.trim() || !message.trim()) {
            setError("Subject and message fields are required.");
            return;
        }

        setIsLoading(true);
        try {
            const ticketDocRefId = "temp_id_" + Date.now(); // Temporary ID for uploads
            const uploadPromises = attachments.map(async file => {
                const url = await apiService.uploadTicketAttachment(ticketDocRefId, file);
                return { url, type: getFileType(file), name: file.name };
            });

            const uploadedAttachments = await Promise.all(uploadPromises);

            await apiService.createSupportTicket({
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar || '',
                subject,
                priority,
                // Fix: Add missing 'status' property to satisfy the type.
                status: 'open',
            }, {
                senderId: user.id,
                senderName: user.name,
                senderAvatar: user.avatar || '',
                senderRole: user.role,
                text: message,
                attachments: uploadedAttachments,
            });
            onTicketCreated();
            onClose();

        } catch (err) {
            console.error(err);
            setError("Failed to create ticket. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Create Support Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                        </div>
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                            <select id="priority" value={priority} onChange={e => setPriority(e.target.value as SupportTicketPriority)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Describe your issue</label>
                        <textarea id="message" value={message} onChange={e => setMessage(e.target.value)} rows={5} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attachments (optional)</label>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900 px-4 py-2 rounded-lg">
                           Add Files...
                        </button>
                    </div>
                     {attachments.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                            {attachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                    <span className="truncate text-gray-700 dark:text-gray-300">{file.name}</span>
                                    <button type="button" onClick={() => removeAttachment(file)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500">&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="flex justify-end pt-4 space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTicketModal;