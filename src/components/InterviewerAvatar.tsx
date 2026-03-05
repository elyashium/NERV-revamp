import { useEffect, useRef, useState } from 'react';
import {
    didAgentService,
    ConnectionState,
    VideoState,
} from '../services/didAgentService';

// ─────────────────────────────────────────────────────────────────────────────
// D-ID Real-Time Avatar
// Streams an interactive avatar via WebRTC using D-ID talks/streams API.
// ─────────────────────────────────────────────────────────────────────────────

interface InterviewerAvatarProps {
    isSpeaking: boolean;
    accentColor?: 'blue' | 'green' | 'purple';
    /** Text for the agent to speak (lip-synced avatar). */
    speakText?: string;
    /** Called when the D-ID agent finishes initialising + connecting. */
    onAgentReady?: () => void;
}

const RING_COLORS: Record<string, string> = {
    blue: 'border-blue-400/40 shadow-blue-500/30',
    green: 'border-green-400/40 shadow-green-500/30',
    purple: 'border-purple-400/40 shadow-purple-500/30',
};

const STATUS_COLORS: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
};

export function InterviewerAvatar({
    isSpeaking,
    accentColor = 'blue',
    speakText,
    onAgentReady,
}: InterviewerAvatarProps) {
    const streamVideoRef = useRef<HTMLVideoElement>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [videoState, setVideoState] = useState<VideoState>('idle');
    const [error, setError] = useState<string>('');
    const initRef = useRef(false);
    const lastSpeakTextRef = useRef<string>('');

    // ── Initialise the D-ID WebRTC stream on mount ───────────────────────────
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const init = async () => {
            await didAgentService.initialize({
                onSrcObjectReady: (srcObject) => {
                    if (streamVideoRef.current) {
                        streamVideoRef.current.srcObject = srcObject;
                    }
                },
                onConnectionStateChange: (state) => {
                    setConnectionState(state);
                    if (state === 'connected') {
                        onAgentReady?.();
                    }
                },
                onVideoStateChange: (state) => {
                    setVideoState(state);
                },
                onError: (err) => {
                    setError(err);
                },
            });

            // Connect to start the WebRTC session
            await didAgentService.connect();
        };

        init();

        return () => {
            didAgentService.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Speak when speakText changes ────────────────────────────────────────
    useEffect(() => {
        if (
            speakText &&
            speakText !== lastSpeakTextRef.current &&
            connectionState === 'connected'
        ) {
            lastSpeakTextRef.current = speakText;
            didAgentService.speak(speakText);
        }
    }, [speakText, connectionState]);

    // ── Render ──────────────────────────────────────────────────────────────
    const isConnected = connectionState === 'connected';
    const isStreaming = videoState === 'streaming';

    return (
        <div className="relative w-full h-full">
            {/* Single WebRTC stream video (handles both idle portrait and speaking animation) */}
            <video
                ref={streamVideoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted={!isConnected}
            />

            {/* Connection status overlay */}
            {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    {connectionState === 'connecting' && (
                        <>
                            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                            <p className={`text-sm font-medium ${STATUS_COLORS[accentColor]}`}>
                                Connecting to avatar...
                            </p>
                        </>
                    )}
                    {connectionState === 'idle' && (
                        <>
                            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                            <p className="text-sm font-medium text-gray-400">
                                Initialising avatar...
                            </p>
                        </>
                    )}
                    {connectionState === 'error' && (
                        <div className="text-center px-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
                                <span className="text-red-400 text-lg">!</span>
                            </div>
                            <p className="text-sm text-red-400 font-medium mb-1">
                                Avatar connection failed
                            </p>
                            <p className="text-xs text-gray-500 max-w-[200px] break-words">
                                {error || 'Please check your connection and try again'}
                            </p>
                            <button
                                onClick={() => {
                                    setError('');
                                    setConnectionState('connecting');
                                    didAgentService.reconnect();
                                }}
                                className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs text-white transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {connectionState === 'disconnected' && (
                        <div className="text-center">
                            <p className="text-sm text-gray-400 mb-2">Avatar disconnected</p>
                            <button
                                onClick={() => {
                                    setConnectionState('connecting');
                                    didAgentService.reconnect();
                                }}
                                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs text-white transition-colors"
                            >
                                Reconnect
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Connected indicator (small dot) */}
            {isConnected && (
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 z-10">
                    <div
                        className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-green-400 animate-pulse' : 'bg-green-400'
                            }`}
                    />
                    <span className="text-[9px] text-gray-300 font-medium uppercase tracking-wider">
                        {isStreaming ? 'Speaking' : 'Live'}
                    </span>
                </div>
            )}

            {/* Animated speaking rings */}
            {isSpeaking && isConnected && (
                <>
                    <div
                        className={`absolute inset-[-8px] border-2 rounded-xl pointer-events-none ${RING_COLORS[accentColor]} animate-[ping_1.8s_ease-out_infinite]`}
                    />
                    <div
                        className={`absolute inset-[-16px] border rounded-xl pointer-events-none ${RING_COLORS[accentColor]} animate-[ping_2.3s_ease-out_infinite]`}
                    />
                </>
            )}
        </div>
    );
}

export default InterviewerAvatar;
