import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
    capturedImage: string | null;
    onCapture: (dataUrl: string) => void;
    onRetake: () => void;
    selfieInstruction: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ capturedImage, onCapture, onRetake, selfieInstruction }) => {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const startCamera = async () => {
        onRetake(); // Clear any previous image
        setError(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API is not available in this browser.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOn(true);
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            let errorMessage = "Could not access camera. Please ensure you have given permission and your browser supports it.";
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = "No camera found. Please connect a camera and try again.";
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = "Camera access was denied. Please allow camera access in your browser settings.";
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = "Your camera is currently in use by another application or there was a hardware error.";
            }
            setError(errorMessage);
            stopCamera();
        }
    };

    const takeSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
            }
            stopCamera();
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Live Selfie</label>
            <div className="mt-1 p-4 border-2 border-dashed border-gray-300 rounded-md text-center space-y-2">
                <canvas ref={canvasRef} className="hidden"></canvas>
                <p className="text-xs text-gray-500">{selfieInstruction}</p>
                
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {capturedImage ? (
                    <div className="flex flex-col items-center space-y-2">
                        <img src={capturedImage} alt="User selfie" className="w-40 h-40 rounded-lg object-cover" />
                        <button type="button" onClick={startCamera} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Retake Selfie</button>
                    </div>
                ) : isCameraOn ? (
                    <div className="flex flex-col items-center space-y-2">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                        <button type="button" onClick={takeSelfie} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-teal-500 hover:bg-teal-600">
                            Take Selfie
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={startCamera} className="w-full py-2 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                        Start Camera
                    </button>
                )}
            </div>
        </div>
    );
};

export default CameraCapture;