import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PlatformSettings } from '../types';

const PhonePeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="100" fill="#5F259F"/>
        <path d="M129.28,75.44H114.16a8.4,8.4,0,0,0-8.4,8.4V98.12a2.32,2.32,0,0,1-2.32,2.32H84.6a2.32,2.32,0,0,1-2.32-2.32V75.44H66.08a2.32,2.32,0,0,0-2.32,2.32v57.12a2.32,2.32,0,0,0,2.32,2.32H82.28a2.32,2.32,0,0,0,2.32-2.32V112.52h18.84a2.32,2.32,0,0,0,2.32-2.32V98.52a8.4,8.4,0,0,1,8.4-8.4h15.12a2.32,2.32,0,0,0,2.32-2.32V77.76A2.32,2.32,0,0,0,129.28,75.44Z" fill="#fff"/>
    </svg>
);


interface PhonePeModalProps {
  baseAmount: number;
  platformSettings: PlatformSettings;
  onSuccess: () => void;
  onClose: () => void;
  transactionDetails: {
    userId: string;
    description: string;
    relatedId: string;
    collabId?: string;
  };
}

const PhonePeModal: React.FC<PhonePeModalProps> = ({ baseAmount, platformSettings, onSuccess, onClose, transactionDetails }) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const processingCharge = platformSettings.isPaymentProcessingChargeEnabled
    ? baseAmount * (platformSettings.paymentProcessingChargeRate / 100)
    : 0;
  
  const gstOnFees = platformSettings.isGstEnabled
    ? processingCharge * (platformSettings.gstRate / 100)
    : 0;

  const totalPayable = baseAmount + processingCharge + gstOnFees;


  const handlePay = () => {
    setStatus('processing');
    // Simulate API call
    setTimeout(() => {
      // On success, create a transaction record
      apiService.createTransaction({
        userId: transactionDetails.userId,
        type: 'payment',
        description: transactionDetails.description,
        relatedId: transactionDetails.relatedId,
        collabId: transactionDetails.collabId,
        amount: totalPayable,
        status: 'completed',
        transactionId: `PE_${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
      }).then(() => {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500); // Show success message for 1.5s
      }).catch(err => {
        console.error("Failed to create transaction record", err);
        // Handle error if needed, maybe show a failure message
        setStatus('idle'); // Revert to idle state
      });
    }, 2500); // Simulate 2.5s processing time
  };

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center py-10">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-500 mx-auto"></div>
            <h3 className="text-xl font-semibold mt-4 dark:text-gray-100">Processing Payment...</h3>
            <p className="text-gray-500 dark:text-gray-400">Please do not close this window.</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-10">
             <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-bold text-green-600 mt-4">Payment Successful!</h3>
            <p className="text-gray-500 dark:text-gray-400">Updating status...</p>
          </div>
        );
      case 'idle':
      default:
        return (
          <>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Complete Payment</h2>
                
                <div className="mt-4 text-left text-sm space-y-2 border-t border-b py-4 dark:border-gray-600">
                  <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Final Offer Amount:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {processingCharge > 0 && (
                      <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Payment Processing Fee:</span>
                          <span className="font-medium text-gray-800 dark:text-gray-100">+ ₹{processingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  )}
                  {gstOnFees > 0 && (
                      <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">GST on Fees:</span>
                          <span className="font-medium text-gray-800 dark:text-gray-100">+ ₹{gstOnFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  )}
                </div>

                <p className="text-4xl font-extrabold text-gray-900 dark:text-white mt-4">₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total amount payable</p>
            </div>
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Select a payment option</h4>
                <div className="space-y-2">
                    <label className="flex items-center p-3 bg-white dark:bg-gray-600 border-2 border-indigo-500 dark:border-indigo-400 rounded-lg">
                        <input type="radio" name="payment-method" className="h-4 w-4 text-indigo-600" defaultChecked/>
                        <span className="ml-3 font-semibold dark:text-gray-200">UPI</span>
                    </label>
                     <label className="flex items-center p-3 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg opacity-50">
                        <input type="radio" name="payment-method" className="h-4 w-4 text-indigo-600" disabled/>
                        <span className="ml-3 font-semibold dark:text-gray-200">Credit / Debit Card</span>
                    </label>
                </div>
            </div>
            <div className="mt-8">
                <button
                    onClick={handlePay}
                    className="w-full py-4 text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md hover:shadow-lg"
                >
                    Pay Now
                </button>
            </div>
          </>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm relative flex flex-col max-h-[90vh]">
        <div className="h-20 bg-[#5F259F] rounded-t-2xl flex items-center justify-center flex-shrink-0">
            <PhonePeIcon className="w-auto h-10" />
        </div>
        <div className="p-6 overflow-y-auto">
            {status === 'idle' && (
                <button onClick={onClose} className="absolute top-4 right-4 text-purple-200 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PhonePeModal;
