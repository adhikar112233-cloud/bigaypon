import React, { useState, useEffect, useRef } from 'react';
import { User, AdSlotRequest, BannerAdBookingRequest, PlatformSettings } from '../types';
import { apiService } from '../services/apiService';

interface DailyPayoutRequestModalProps {
    user: User;
    onClose: () => void;
    platformSettings: PlatformSettings;
}

type ActiveCollab = AdSlotRequest | BannerAdBookingRequest;

const DailyPayoutRequestModal: React.FC<DailyPayoutRequestModalProps> = ({ user, onClose, platformSettings }) => {
    const [activeCollabs, setActiveCollabs] = useState<ActiveCollab[]>([]);
    const [selectedCollabId, setSelectedCollabId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1: select, 2: record, 3: success

    const [isRecording, setIsRecording] = useState(false);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const fetchActiveCollabs = async () => {
            if (user.role !== 'livetv' && user.role !== 'banneragency') return;
            setIsLoading(true);
            try {
                const data = await apiService.getActiveAdCollabsForAgency(user.id, user.role);
                setActiveCollabs(data);
                if (data.length > 0) {
                    setSelectedCollabId(data[0].id);
                }
            } catch (err) {
                setError("Failed to fetch active collaborations.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchActiveCollabs();
    }, [user.id, user.role]);

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            
            mediaRecorderRef.current = new MediaRecorder(stream);
            recordedChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setVideoBlob(blob);
                stopCamera();
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err: any) {
            console.error("Error accessing media devices:", err);
            let errorMessage = "Could not access camera/microphone. Please ensure your browser supports it and you have granted permission.";
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = "No camera and/or microphone found. Please connect your devices and try again.";
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = "Camera and/or microphone access was denied. Please allow access in your browser settings.";
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = "Your camera or microphone is currently in use by another application or there was a hardware error.";
            }
            setError(errorMessage);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSubmit = async (videoBlobToUpload: Blob | null = videoBlob) => {
        if (!selectedCollabId) return;
        if (platformSettings.payoutSettings.requireLiveVideoForDailyPayout && !videoBlobToUpload) {
            setError("A verification video is required for this request.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            let videoUrl: string | undefined = undefined;
            if (videoBlobToUpload) {
                videoUrl = await apiService.uploadDailyPayoutVideo(user.id, videoBlobToUpload);
            }
            
            const collab = activeCollabs.find(c => c.id === selectedCollabId);
            if (!collab) throw new Error("Selected collaboration not found.");

            const requestData: any = {
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                collaborationId: selectedCollabId,
                collaborationType: user.role === 'livetv' ? 'ad_slot' : 'banner_booking',
            };

            if (videoUrl) {
                requestData.videoUrl = videoUrl;
            }

            await apiService.submitDailyPayoutRequest(requestData);
            setStep(3); // Success
            setTimeout(onClose, 3000);
        } catch (err) {
            console.error(err);
            setError("Failed to submit request.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const script = `Hi BIGYAPON, I am ${user.name}, I am requesting a payout. Please send me payment in my account as per my profile.`;

    const renderContent = () => {
        if (isLoading && step === 1) return <p className="dark:text-gray-300">Loading...</p>;
        if (error) return <p className="text-red-500">{error}</p>;
        if (activeCollabs.length === 0 && !isLoading) return <p className="dark:text-gray-300">You have no active collaborations eligible for a daily payout.</p>;

        if (step === 3) {
            return (
                <div className="text-center">
                    <h3 className="text-xl font-bold text-green-500">Request Submitted!</h3>
                    <p className="dark:text-gray-300">Your request is now under review by the admin team.</p>
                </div>
            );
        }
        
        if (step === 2) {
            return (
                <div className="space-y-4">
                    <p className="text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-300 p-3 rounded-lg text-center">Please say the following script clearly in your video:</p>
                    <p className="font-mono text-center text-indigo-600 dark:text-indigo-400">"{script}"</p>
                    <div className="bg-black rounded-lg overflow-hidden aspect-video">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>
                    {videoBlob && !isRecording && (
                        <div className="flex justify-center gap-4">
                            <button onClick={startRecording} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600 dark:text-gray-200">Retake</button>
                            <button onClick={() => handleSubmit(videoBlob)} disabled={isLoading} className="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg disabled:opacity-50">
                                {isLoading ? 'Submitting...' : 'Submit Video'}
                            </button>
                        </div>
                    )}
                    {!videoBlob && (
                         <button onClick={isRecording ? stopRecording : startRecording} className={`w-full py-2 text-white font-semibold rounded-lg ${isRecording ? 'bg-red-500' : 'bg-blue-500'}`}>
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div>
                    <label htmlFor="collab-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Active Collaboration</label>
                    <select id="collab-select" value={selectedCollabId} onChange={e => setSelectedCollabId(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        {activeCollabs.map(c => <option key={c.id} value={c.id}>{c.campaignName}</option>)}
                    </select>
                </div>
                {platformSettings.payoutSettings.requireLiveVideoForDailyPayout ? (
                    <button onClick={() => setStep(2)} className="w-full py-2 text-white font-semibold bg-indigo-600 rounded-lg">
                        Next: Record Verification Video
                    </button>
                ) : (
                    <button onClick={() => handleSubmit(null)} disabled={isLoading} className="w-full py-2 text-white font-semibold bg-indigo-600 rounded-lg disabled:opacity-50">
                        {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Daily Payout Request</h2>
                {renderContent()}
            </div>
        </div>
    );
};

export default DailyPayoutRequestModal;