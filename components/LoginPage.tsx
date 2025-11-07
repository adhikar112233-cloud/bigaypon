import React, { useState, useEffect, useRef } from 'react';
import { LogoIcon } from './Icons';
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
    const [resetMethod, setResetMethod] = useState<'email' | 'otp'>('email');
    
    // Email state
    const [email, setEmail] = useState('');
    
    // OTP state
    const [otpStep, setOtpStep] = useState<'enter_number' | 'enter_otp' | 'set_password'>('enter_number');
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // General state
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'>('idle');
    const [error, setError] = useState('');

    const countryCodes = [
        { name: 'IN', code: '+91' }, { name: 'US', code: '+1' }, { name: 'GB', code: '+44' },
        { name: 'AU', code: '+61' }, { name: 'DE', code: '+49' },
    ];

    const resetState = () => {
        setStatus('idle');
        setError('');
        setOtpStep('enter_number');
        setPhoneNumber('');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setConfirmationResult(null);
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
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

    const handleSendOtp = async () => {
        setError('');
        const fullPhoneNumber = countryCode + phoneNumber;
        if (!phoneNumber.trim() || !/^\d{7,15}$/.test(phoneNumber)) {
            setError("Please enter a valid mobile number.");
            return;
        }
        setStatus('sending');
        try {
            const appVerifier = (window as any).recaptchaVerifier;
            const confirmation = await authService.sendLoginOtp(fullPhoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setOtpStep('enter_otp');
            setStatus('sent');
        } catch (err) {
            setError("Failed to send OTP. Please check the number or try again.");
            setStatus('error');
             (window as any).recaptchaVerifier.render().then((widgetId: any) => {
                (window as any).grecaptcha.reset(widgetId);
             });
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        if (!confirmationResult || !otp.trim()) {
            setError("Please enter the OTP.");
            return;
        }
        setStatus('verifying');
        try {
            // This signs the user in temporarily
            await authService.verifyLoginOtp(confirmationResult, otp);
            setOtpStep('set_password');
            setStatus('verified');
        } catch (err) {
            setError("Invalid OTP. Please try again.");
            setStatus('error');
        }
    };
    
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        setStatus('sending');
        try {
            await authService.updateUserPassword(newPassword);
            setStatus('sent'); // Reuse 'sent' status for success message
        } catch (err: any) {
            setError(err.message || "Failed to reset password.");
            setStatus('error');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Forgot Password</h2>

                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button onClick={() => { setResetMethod('email'); resetState(); }} className={`w-full py-2 text-sm font-medium transition-colors ${resetMethod === 'email' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Reset via Email</button>
                    {platformSettings.isForgotPasswordOtpEnabled && (
                        <button onClick={() => { setResetMethod('otp'); resetState(); }} className={`w-full py-2 text-sm font-medium transition-colors ${resetMethod === 'otp' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Reset via Mobile</button>
                    )}
                </div>

                {resetMethod === 'email' && (
                     status === 'sent' ? (
                         <div className="text-center py-4">
                            <h3 className="text-lg font-bold text-teal-500">Reset Link Sent</h3>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">Please check your email inbox at <span className="font-semibold">{email}</span> for instructions.</p>
                            <button onClick={onClose} className="mt-6 w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">Close</button>
                        </div>
                    ) : (
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Enter your registered email address.</p>
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <input type="email" id="reset-email" placeholder="your@email.com" className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" required value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            {status === 'error' && <p className="text-red-500 text-sm">{error}</p>}
                            <button type="submit" disabled={status === 'sending'} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{status === 'sending' ? 'Sending...' : 'Send Reset Link'}</button>
                        </form>
                    )
                )}

                {resetMethod === 'otp' && (
                    status === 'sent' && otpStep === 'set_password' ? (
                         <div className="text-center py-4">
                            <h3 className="text-lg font-bold text-teal-500">Password Reset Successfully</h3>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">You can now log in with your new password.</p>
                            <button onClick={onClose} className="mt-6 w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">Close</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {otpStep === 'enter_number' && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Enter your registered mobile number to receive an OTP.</p>
                                    <div className="flex items-center space-x-2">
                                        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"><option value="+91">IN +91</option></select>
                                        <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="9876543210" required className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    </div>
                                    {status === 'error' && <p className="text-red-500 text-sm">{error}</p>}
                                    <button onClick={handleSendOtp} disabled={status === 'sending'} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{status === 'sending' ? 'Sending OTP...' : 'Send OTP'}</button>
                                </>
                            )}
                             {otpStep === 'enter_otp' && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Enter the 6-digit OTP sent to {countryCode}{phoneNumber}.</p>
                                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} placeholder="Enter OTP" className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    {status === 'error' && <p className="text-red-500 text-sm">{error}</p>}
                                    <button onClick={handleVerifyOtp} disabled={status === 'verifying'} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{status === 'verifying' ? 'Verifying...' : 'Verify OTP'}</button>
                                </>
                            )}
                            {otpStep === 'set_password' && (
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">OTP verified. Please set a new password.</p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    </div>
                                    {status === 'error' && <p className="text-red-500 text-sm">{error}</p>}
                                    <button type="submit" disabled={status === 'sending'} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{status === 'sending' ? 'Resetting...' : 'Reset Password'}</button>
                                </form>
                            )}
                        </div>
                    )
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
        (window as any).recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          }
        }, auth);
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

  const TabButton: React.FC<{ method: LoginMethod; children: React.ReactNode }> = ({ method, children }) => (
    <button
      type="button"
      onClick={() => setLoginMethod(method)}
      className={`w-full py-2 text-sm font-medium transition-colors ${
        loginMethod === method
          ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
        <div id="recaptcha-container"></div>
        <div className="min-h-screen py-4 bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center px-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center w-full mb-8">
                    <LogoIcon showTagline={true} className="h-16 w-auto" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {authMode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {authMode === 'login' ? 'Login to continue to BIGYAPON' : 'Join our community of brands and influencers'}
                        </p>
                    </div>
                    
                    <div className="mb-6">
                        <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                           Select Your Role
                        </label>
                        <select
                            id="role-select"
                            value={role}
                            onChange={handleRoleChange}
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <form onSubmit={handleAuthSubmit}>
                        {authMode === 'login' && (
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                                <TabButton method="password">Password</TabButton>
                                {platformSettings.isOtpLoginEnabled && <TabButton method="otp">OTP</TabButton>}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                             {authMode === 'signup' && (
                                <>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                </div>
                                {role === 'livetv' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Channel Name</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                    </div>
                                )}
                                {role === 'banneragency' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Agency Name</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
                                    <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Create Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8-20 characters" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                </div>
                                </>
                            )}
                            
                            {authMode === 'login' && loginMethod === 'password' && (
                                <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email / Mobile Number</label>
                                    <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com or +14155552671" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                </div>
                                </>
                            )}
                            
                             {authMode === 'login' && loginMethod === 'otp' && platformSettings.isOtpLoginEnabled && (
                                <>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            disabled={isOtpSent}
                                            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:disabled:bg-gray-600"
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
                                            className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:disabled:bg-gray-600" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={handleSendOtp}
                                            disabled={isLoading || isOtpSent}
                                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 whitespace-nowrap disabled:opacity-50 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900"
                                        >
                                            {isOtpSent ? 'Sent' : 'Send OTP'}
                                        </button>
                                    </div>
                                </div>

                                {isOtpSent && (
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">OTP Code</label>
                                        <input 
                                            type="text" 
                                            id="otp" 
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={6} 
                                            placeholder="Enter 6-digit OTP" 
                                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
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
                    
                    <div className="mt-6 space-y-4 text-center text-sm">
                        {authMode === 'login' && (
                            <div className="text-gray-600 dark:text-gray-400">
                                <button type="button" onClick={() => setShowForgotPassword(true)} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                    Forgot password?
                                </button>
                                <span className="text-gray-300 dark:text-gray-600 mx-2">|</span>
                                <button type="button" onClick={() => setShowStaffLogin(true)} className="font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                                    BIGYAPON Staff Login
                                </button>
                            </div>
                        )}
                        <div className="text-gray-600 dark:text-gray-400 mt-8">
                            {authMode === 'login' ? (
                                <>
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('signup');
                                            setError(null);
                                        }}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
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
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                        Log In
                                    </button>
                                </>
                            )}
                        </div>
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
