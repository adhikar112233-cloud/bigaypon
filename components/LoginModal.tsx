

import React, { useState, useEffect, useRef } from 'react';
import { LogoIcon, GoogleIcon } from './Icons';
import { UserRole, PlatformSettings } from '../types';
import { authService } from '../services/authService';
import StaffLoginModal from './StaffLoginModal';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../services/firebase';


interface LoginPageProps {
  platformSettings: PlatformSettings;
}

type AuthMode = 'login' | 'signup';
type LoginMethod = 'password' | 'otp';

const ForgotPasswordModal: React.FC<{ onClose: () => void; platformSettings: PlatformSettings }> = ({ onClose, platformSettings }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        setError('');
        try {
            await authService.sendPasswordResetEmail(email);
            setStatus('sent');
        } catch (err: any) {
            setError('Failed to send reset email. Please check the address and try again.');
            setStatus('error');
            console.error(err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold text-center text-gray-800 mb-4">Forgot Password</h2>

                {status === 'sent' ? (
                     <div className="text-center py-4">
                        <h3 className="text-lg font-bold text-teal-500">Reset Link Sent</h3>
                        <p className="text-gray-600 mt-2">Please check your email inbox [spm/all mail option] at <span className="font-semibold">{email}</span> for instructions.</p>
                        <button onClick={onClose} className="mt-6 w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600">Enter your registered email address and we'll send you a link to reset your password.</p>
                        <div>
                            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input 
                                type="email" 
                                id="reset-email"
                                placeholder="your@email.com" 
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" required 
                                value={email} onChange={e => setEmail(e.target.value)} 
                            />
                        </div>
                        
                        {(status === 'error') && <p className="text-red-500 text-sm">{error}</p>}
                        
                        <button 
                            type="submit" 
                            disabled={status === 'sending'}
                            className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {status === 'sending' ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};


const LoginPage: React.FC<LoginPageProps> = ({ platformSettings }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('brand');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // State management
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // This sets up the invisible reCAPTCHA verifier.
    if (!(window as any).recaptchaVerifier) {
// Fix: Corrected RecaptchaVerifier constructor to match Firebase v9 modular syntax.
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          }
        });
    }
  }, []);
  
  const roles: { id: UserRole; label: string }[] = [
    { id: 'brand', label: "Brand" },
    { id: 'influencer', label: "Influencer" },
    { id: 'livetv', label: "Live TV Channel" },
    { id: 'banneragency', label: "Banner Ads Agency" },
  ];

  const countryCodes = [
    { name: 'IN', code: '+91' },
    { name: 'US', code: '+1' },
    { name: 'GB', code: '+44' },
    { name: 'AU', code: '+61' },
    { name: 'DE', code: '+49' },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    setRole(newRole);
    // Clear company name if the role doesn't require it, to avoid sending stale data
    if (newRole !== 'livetv' && newRole !== 'banneragency') {
        setCompanyName('');
    }
  };

  const handleSendOtp = async () => {
      setError(null);
      const fullPhoneNumber = countryCode + phoneNumber;
      
      if (!phoneNumber.trim() || !/^\d{7,15}$/.test(phoneNumber)) {
          setError("Please enter a valid mobile number.");
          return;
      }
      
      setIsLoading(true);
      try {
          const appVerifier = (window as any).recaptchaVerifier;
          const confirmation = await authService.sendLoginOtp(fullPhoneNumber, appVerifier);
          setConfirmationResult(confirmation);
          setIsOtpSent(true);
          setError(null);
      } catch (err: any) {
          console.error(err);
          setError("Failed to send OTP. Please check the number or try again.");
          // Reset reCAPTCHA
          (window as any).recaptchaVerifier.render().then((widgetId: any) => {
             (window as any).grecaptcha.reset(widgetId);
          });
      } finally {
          setIsLoading(false);
      }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        if (authMode === 'login') {
            if (loginMethod === 'password') {
                const identifier = email;
                const isPhoneNumber = /^\+?[0-9\s-()]{7,}$/.test(identifier);
                const isEmail = /\S+@\S+\.\S+/.test(identifier);

                if (isPhoneNumber && !isEmail) {
                    setError("For mobile number login, please use the 'OTP' tab.");
                    setIsLoading(false);
                    return;
                }

                if (!isEmail) {
                    setError("Please enter a valid email address for password login.");
                    setIsLoading(false);
                    return;
                }

                await authService.login(email, password);
            } else { // OTP login
                if (!confirmationResult) {
                    setError("Please send an OTP first.");
                    setIsLoading(false);
                    return;
                }
                await authService.verifyLoginOtp(confirmationResult, otp);
            }
        } else { // Signup
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setIsLoading(false);
                return;
            }
            if (password.length < 8 || password.length > 20) {
                setError("Password must be between 8 and 20 characters.");
                setIsLoading(false);
                return;
            }

            await authService.register(email, password, role, name, companyName, mobileNumber);
            alert("Registration successful! Please log in.");
            setAuthMode('login');
        }
      } catch (err: any) {
          if (err.message.includes('blocked')) {
            setError(err.message);
          } else {
            setError('Authentication failed. Please check your credentials.');
          }
      } finally {
          setIsLoading(false);
      }
  };
  
    const handleGoogleSignIn = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await authService.signInWithGoogle(role);
            // onAuthChange will handle the rest
        } catch (err: any) {
            // Don't show an error if user just closes the popup
            if (err.code !== 'auth/popup-closed-by-user') {
                 if (err.message.includes('blocked')) {
                    setError('This account has been blocked by an administrator.');
                 } else {
                    setError(err.message);
                 }
            }
        } finally {
            setIsLoading(false);
        }
    };

  const TabButton: React.FC<{ method: LoginMethod; children: React.ReactNode }> = ({ method, children }) => (
    <button
      type="button"
      onClick={() => setLoginMethod(method)}
      className={`w-full py-2 text-sm font-medium transition-colors ${
        loginMethod === method
          ? 'text-indigo-600 border-b-2 border-indigo-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
        <div id="recaptcha-container"></div>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <LogoIcon showTagline={true} />
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {authMode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
                        </h2>
                        <p className="text-gray-500 mt-1">
                            {authMode === 'login' ? 'Login to continue to Collabzz' : 'Join our community of brands and influencers'}
                        </p>
                    </div>
                    
                    <div className="mb-6">
                        <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">
                           {authMode === 'signup' ? 'I am a...' : 'Select Role (for Google Sign-In / Sign-Up)'}
                        </label>
                        <select
                            id="role-select"
                            value={role}
                            onChange={handleRoleChange}
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <form onSubmit={handleAuthSubmit}>
                        {authMode === 'login' && (
                            <div className="flex border-b border-gray-200 mb-6">
                                <TabButton method="password">Password</TabButton>
                                {platformSettings.isOtpLoginEnabled && <TabButton method="otp">OTP</TabButton>}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                             {authMode === 'signup' && (
                                <>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                {role === 'livetv' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Channel Name</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"/>
                                    </div>
                                )}
                                {role === 'banneragency' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Agency Name</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"/>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                                    <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Create Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8-20 characters" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                </>
                            )}
                            
                            {authMode === 'login' && loginMethod === 'password' && (
                                <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email / Mobile Number</label>
                                    <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com or +14155552671" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                </>
                            )}
                            
                             {authMode === 'login' && loginMethod === 'otp' && platformSettings.isOtpLoginEnabled && (
                                <>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Mobile Number</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            disabled={isOtpSent}
                                            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-200"
                                        >
                                            {countryCodes.map(c => <option key={c.code} value={c.code}>{c.name} {c.code}</option>)}
                                        </select>
                                        <input 
                                            type="tel" 
                                            id="phone" 
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            placeholder="9876543210"
                                            disabled={isOtpSent}
                                            required 
                                            className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-200" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={handleSendOtp}
                                            disabled={isLoading || isOtpSent}
                                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 whitespace-nowrap disabled:opacity-50"
                                        >
                                            {isOtpSent ? 'Sent' : 'Send OTP'}
                                        </button>
                                    </div>
                                </div>

                                {isOtpSent && (
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">OTP Code</label>
                                        <input 
                                            type="text" 
                                            id="otp" 
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={6} 
                                            placeholder="Enter 6-digit OTP" 
                                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm" 
                                            required
                                        />
                                    </div>
                                )}
                                </>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                        
                        <button type="submit" disabled={isLoading} className="mt-8 w-full py-3 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-teal-400 to-indigo-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? 'Processing...' : (authMode === 'login' ? `Login` : 'Sign Up')}
                        </button>
                    </form>

                    <div className="mt-6 relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            Continue with Google
                        </button>
                    </div>
                    
                    {authMode === 'login' && (
                        <div className="text-center text-sm mt-6">
                            <div className="text-gray-600">
                                <button type="button" onClick={() => setShowForgotPassword(true)} className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Forgot password?
                                </button>
                                <span className="text-gray-300 mx-2">|</span>
                                <button type="button" onClick={() => setShowStaffLogin(true)} className="font-medium text-gray-600 hover:text-gray-800">
                                    Collabzz Staff Login
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center text-sm text-gray-600 mt-8">
                        {authMode === 'login' ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('signup');
                                        setError(null);
                                    }}
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Sign Up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('login');
                                        setError(null);
                                    }}
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Log In
                                </button>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
        {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} platformSettings={platformSettings} />}
        {showStaffLogin && <StaffLoginModal onClose={() => setShowStaffLogin(false)} platformSettings={platformSettings} />}
    </>
  );
};

export default LoginPage;