import React, { useState, useEffect, useRef } from 'react';
import { User, LiveHelpSession, LiveHelpMessage } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { apiService } from '../services/apiService';

interface LiveHelpPanelProps {
    adminUser: User;
}

const ConversationView: React.FC<{ session: LiveHelpSession; adminUser: User; }> = ({ session, adminUser }) => {
    const [messages, setMessages] = useState<LiveHelpMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const prefilledMessages = [
        "Welcome to BIGYAPON Support! How can I help you today?",
        "Thank you for contacting us. How may I assist you?",
        "Thanks for using our live chat service. Have a great day!",
        "This conversation will now be closed. Please feel free to start a new chat if you need further assistance."
    ];

    useEffect(() => {
        const messagesRef = collection(db, `live_help_sessions/${session.id}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveHelpMessage)));
        });
        return unsubscribe;
    }, [session.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        await apiService.sendLiveHelpMessage(session.id, adminUser.id, adminUser.name, newMessage);
        setNewMessage('');
    };

    const handleSendPrefilled = async (message: string) => {
        if (!message.trim() || session.status === 'closed') return;
        await apiService.sendLiveHelpMessage(session.id, adminUser.id, adminUser.name, message);
    };

    const handleCloseSessionClick = () => {
        setShowCloseConfirm(true);
    };

    const confirmCloseSession = async () => {
        await apiService.closeLiveHelpSession(session.id);
        setShowCloseConfirm(false);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src={session.userAvatar} alt={session.userName} className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-semibold">{session.userName}</p>
                        <p className="text-xs text-gray-500">Status: {session.status}</p>
                    </div>
                </div>
                <button 
                    onClick={handleCloseSessionClick} 
                    disabled={session.status === 'closed'}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                    Close Chat
                </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === adminUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md px-4 py-3 rounded-2xl ${msg.senderId === adminUser.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
                {session.status !== 'closed' && (
                    <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Quick Replies:</p>
                        <div className="flex flex-wrap gap-2">
                            {prefilledMessages.map((msg, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSendPrefilled(msg)}
                                    className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                                    title="Send this message"
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={session.status === 'closed' ? 'This session is closed' : "Type your reply..."}
                        disabled={session.status === 'closed'}
                        className="w-full p-3 pl-4 pr-12 text-sm text-gray-700 bg-gray-100 rounded-full border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:bg-gray-200"
                    />
                    <button type="submit" disabled={session.status === 'closed'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 rounded-full hover:bg-indigo-100 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>

            {showCloseConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Confirm Close Chat</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to end this live help session? The user will not be able to send further messages.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowCloseConfirm(false)} 
                                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmCloseSession} 
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Close Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LiveHelpPanel: React.FC<LiveHelpPanelProps> = ({ adminUser }) => {
    const [sessions, setSessions] = useState<LiveHelpSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<LiveHelpSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sessionsRef = collection(db, 'live_help_sessions');
        const q = query(
            sessionsRef,
            where('assignedStaffId', '==', adminUser.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allSessionsFromQuery: LiveHelpSession[] = [];
            snapshot.forEach(doc => {
                allSessionsFromQuery.push({ id: doc.id, ...doc.data() } as LiveHelpSession);
            });

            // The list on the left shows open sessions
            const openSessions = allSessionsFromQuery
                .filter(s => s.status === 'open')
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            setSessions(openSessions);
            
            // If a session is selected, find its updated version and refresh the state.
            if (selectedSession) {
                const updatedSelectedSession = allSessionsFromQuery.find(s => s.id === selectedSession.id);
                if (updatedSelectedSession) {
                    setSelectedSession(updatedSelectedSession);
                } else {
                    // If the session is no longer found in the query result (e.g., deleted), clear the view.
                    setSelectedSession(null);
                }
            }
            
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [adminUser.id, selectedSession]);

    return (
        <div className="flex h-full">
            <div className="w-1/3 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-bold">Active Chats ({sessions.length})</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? <p className="p-4 text-sm text-gray-500">Loading...</p> : 
                    sessions.length === 0 ? <p className="p-4 text-sm text-gray-500">No active chats.</p> :
                    <ul>
                        {sessions.map(session => (
                            <li key={session.id}>
                                <button
                                    onClick={() => setSelectedSession(session)}
                                    className={`w-full text-left p-3 flex items-center gap-3 border-l-4 ${selectedSession?.id === session.id ? 'bg-white border-indigo-500' : 'border-transparent hover:bg-gray-100'}`}
                                >
                                    <img src={session.userAvatar} alt={session.userName} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate">{session.userName}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(session.updatedAt?.toDate()).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                    }
                </div>
            </div>
            <div className="w-2/3">
                {selectedSession ? (
                    <ConversationView session={selectedSession} adminUser={adminUser} />
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-100">
                        <p className="text-gray-500">Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveHelpPanel;
