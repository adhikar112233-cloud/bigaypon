import React, { useState, useEffect, useRef } from 'react';
import { User, LiveHelpMessage } from '../types';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { apiService } from '../services/apiService';

interface LiveHelpChatProps {
  user: User;
  sessionInfo: {
    sessionId: string;
    staff: User | null;
  };
  onClose: () => void;
}

const LiveHelpChat: React.FC<LiveHelpChatProps> = ({ user, sessionInfo, onClose }) => {
    const [messages, setMessages] = useState<LiveHelpMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { sessionId, staff } = sessionInfo;

    useEffect(() => {
        const messagesRef = collection(db, `live_help_sessions/${sessionId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages: LiveHelpMessage[] = [];
            snapshot.forEach((doc) => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as LiveHelpMessage);
            });
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await apiService.sendLiveHelpMessage(sessionId, user.id, user.name, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 sm:right-10 w-[90vw] max-w-sm h-[70vh] max-h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300">
            <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl dark:bg-gray-700 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                    <img src={staff?.avatar} alt={staff?.name || 'Support'} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{staff?.name || 'Support Agent'}</h3>
                        <p className="text-xs text-green-500 dark:text-green-400">Online</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>

            <main className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.senderId === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100'}`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t border-gray-200 dark:border-gray-600">
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full p-3 pl-4 pr-12 text-sm text-gray-700 bg-gray-100 rounded-full border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-gray-700 dark:text-gray-200 dark:focus:bg-gray-600"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 rounded-full hover:bg-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default LiveHelpChat;