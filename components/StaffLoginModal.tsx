import React, { useState } from 'react';
import { authService } from '../services/authService';
import { AdminIcon } from './Icons';
import { PlatformSettings } from '../types';

interface StaffLoginModalProps {
    onClose: () => void;
    platformSettings: PlatformSettings;
}

const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ onClose, platformSettings }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (mode === 'signup' && password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            if (mode === 'login') {
                await authService.login(email, password);
            } else {
                await authService.register(email, password, 'staff', name, '', '');
            }
            // On successful login/signup, the onAuthStateChanged listener in App.tsx
            // will automatically handle the UI transition, so we can just close the modal.
            onClose();
        } catch (err: any) {
            if (mode === 'login' && (err.message.includes('not-found') || err.message.includes('wrong-password'))) {
                setError('Invalid staff credentials. Please try again.');
            } else if (mode === 'signup' && err.message.includes('email-already-in-use')) {
                setError('This email is already registered.');
            }
             else {
                setError('An unexpected error occurred. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(prev => (prev === 'login' ? 'signup' : 'login'));
        setError(null);
        // Reset fields when toggling
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-gray-700">
                        <AdminIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">{mode === 'login' ? 'Staff Login' : 'Create Staff Account'}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">For internal use only.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {mode === 'signup' && (
                        <div>
                            <label htmlFor="staff-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                            <input 
                                type="text" 
                                id="staff-name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
                                required 
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="staff-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff Email</label>
                        <input 
                            type="email" 
                            id="staff-email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="staff.member@bigyapon.com"
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
                            required 
                        />
                    </div>
                     <div>
                        <label htmlFor="staff-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input 
                            type="password" 
                            id="staff-password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
                            required 
                        />
                    </div>
                    {mode === 'signup' && (
                         <div>
                            <label htmlFor="staff-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                            <input 
                                type="password" 
                                id="staff-confirm-password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
                                required 
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                       {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
                    </button>
                </form>
                 <div className="text-center text-sm mt-4">
                    {(platformSettings.isStaffRegistrationEnabled || mode === 'signup') && (
                        <button onClick={toggleMode} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                            {mode === 'login' ? 'Create a staff account' : 'Already have an account? Login'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffLoginModal;