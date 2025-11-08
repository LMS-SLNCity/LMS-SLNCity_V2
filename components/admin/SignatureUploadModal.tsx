import React, { useRef, useState } from 'react';
import { User } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface SignatureUploadModalProps {
    approver: User;
    onClose: () => void;
}

export const SignatureUploadModal: React.FC<SignatureUploadModalProps> = ({ approver, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [uploadMode, setUploadMode] = useState<'draw' | 'upload'>('draw');
    const [previewUrl, setPreviewUrl] = useState<string | null>(approver.signatureImageUrl || null);
    const [isLoading, setIsLoading] = useState(false);
    const { user: actor } = useAuth();
    const { reloadData } = useAppContext();

    // Log when modal opens
    React.useEffect(() => {
        console.log('SignatureUploadModal opened for approver:', approver);
    }, []);

    // Initialize canvas
    React.useEffect(() => {
        if (uploadMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            }
        }
    }, [uploadMode]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (uploadMode !== 'draw') return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || uploadMode !== 'draw') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            let imageData: string | null = null;

            if (uploadMode === 'draw') {
                const canvas = canvasRef.current;
                if (!canvas) {
                    alert('Please draw a signature');
                    setIsLoading(false);
                    return;
                }
                imageData = canvas.toDataURL('image/png');
            } else {
                imageData = previewUrl;
            }

            if (!imageData) {
                alert('Please provide a signature');
                setIsLoading(false);
                return;
            }

            console.log('Uploading signature for user:', approver.id);

            const response = await fetch(`http://localhost:5001/api/signatures/upload/${approver.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageData }),
            });

            console.log('Upload response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Upload failed:', errorData);
                throw new Error(errorData.error || 'Failed to upload signature');
            }

            const result = await response.json();
            console.log('Upload successful:', result);

            // Reload users to get updated signature_image_url
            await reloadData();

            alert('Signature uploaded successfully');
            onClose();
        } catch (error) {
            console.error('Error uploading signature:', error);
            alert(`Failed to upload signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Upload Signature for {approver.username}</h3>
                    <p className="text-sm text-gray-500 mt-1">Digital signature required for report approval</p>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="flex space-x-4 mb-6">
                        <button
                            onClick={() => setUploadMode('draw')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                uploadMode === 'draw'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Draw Signature
                        </button>
                        <button
                            onClick={() => setUploadMode('upload')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                uploadMode === 'upload'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Upload Image
                        </button>
                    </div>

                    {uploadMode === 'draw' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Draw your signature below:</label>
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={200}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white w-full"
                            />
                            <button
                                onClick={clearCanvas}
                                className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Clear
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Upload signature image:</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    )}

                    {previewUrl && (
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Preview:</label>
                            <img src={previewUrl} alt="Signature preview" className="border border-gray-300 rounded-lg max-h-40" />
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !previewUrl}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Uploading...' : 'Save Signature'}
                    </button>
                </div>
            </div>
        </div>
    );
};

