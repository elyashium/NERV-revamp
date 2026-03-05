import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Mic, MicOff, Camera, CameraOff, Volume2, VolumeX,
  Loader2, ArrowLeft, Clock, Brain, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Services
import { sarvamTTS as azureTTS } from '../services/sarvamTTSService';
import { sarvamSTT as whisperService } from '../services/sarvamSTTService';
import { humeAI } from '../services/humeAIService';
import { apiService } from '../services/apiService';
import { openAI, QuestionContext } from '../services/openAIService';
import { resumeService } from '../services/resumeService';
import { getResumeData } from '../services/firebaseResumeService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface UserExpression {
  isConfident: boolean;
  isNervous: boolean;
  isStruggling: boolean;
  dominantEmotion: string;
  confidenceScore: number;
  emotionBreakdown?: Array<{ name: string; score: number; }>;
}

interface ResumeData {
  skills: string[];
  projects: string[];
  achievements: string[];
  experience: string[];
  education: string[];
}

const TechnicalRound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Get round duration from location state
  const roundDuration = location.state?.roundDuration || 3;

  // Debug logging
  console.log('TechnicalRound component rendered');
  console.log('Location state:', location.state);
  console.log('Round duration:', roundDuration);

  // Early return for debugging
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-primary text-white p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we load your interview session.</p>
        </div>
      </div>
    );
  }

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interview data
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [userExpression, setUserExpression] = useState<UserExpression | null>(null);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [questionExpressions, setQuestionExpressions] = useState<Map<string, UserExpression>>(new Map());
  const [isCapturingExpression, setIsCapturingExpression] = useState<boolean>(false);
  const [currentEmotions, setCurrentEmotions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [humeApiKey, setHumeApiKey] = useState<string>(
    import.meta.env.VITE_HUME_API_KEY || ''
  );
  const [conversationId, setConversationId] = useState<string>('');

  // Test API service function
  const testAPIService = async () => {
    try {
      console.log('[TechnicalRound] Testing API service...');
      console.log('[TechnicalRound] API Service object:', apiService);
      console.log('[TechnicalRound] API Service getTechnicalQuestion method:', apiService.getTechnicalQuestion);

      const response = await apiService.getTechnicalQuestion({
        emotion: 'confident',
        last_answer: undefined,
        round: 'technical'
      });
      console.log('[TechnicalRound] API test successful:', response);
      alert('API test successful! Check console for details.');
    } catch (error: any) {
      console.error('[TechnicalRound] API test failed:', error);
      console.error('[TechnicalRound] Error details:', error.message);
      console.error('[TechnicalRound] Error stack:', error.stack);
      alert('API test failed! Check console for details.');
    }
  };

  // Time management
  const [timeRemaining, setTimeRemaining] = useState(roundDuration * 60);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Generate conversation ID when component mounts
  useEffect(() => {
    const newConversationId = `tech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newConversationId);
    console.log('[TechnicalRound] Generated conversation ID:', newConversationId);
  }, []);

  // Removed AUTO-TEST injection that was polluting real emotion data

  // Load resume data from location state or Firebase
  useEffect(() => {
    const loadResumeData = async () => {
      if (location.state?.resumeData) {
        setResumeData(location.state.resumeData);
        console.log('TechnicalRound - Loaded resume data from location state:', location.state.resumeData);
        console.log('TechnicalRound - Resume data structure:', {
          skills: location.state.resumeData?.skills?.length || 0,
          projects: location.state.resumeData?.projects?.length || 0,
          achievements: location.state.resumeData?.achievements?.length || 0,
          experience: location.state.resumeData?.experience?.length || 0,
          education: location.state.resumeData?.education?.length || 0
        });
      } else if (currentUser) {
        // Fallback to Firebase if not in location state
        try {
          const resumeData = await getResumeData(currentUser.uid);
          if (resumeData) {
            setResumeData(resumeData);
            console.log('TechnicalRound - Loaded resume data from Firebase:', resumeData);
            console.log('TechnicalRound - Resume data structure:', {
              skills: resumeData?.skills?.length || 0,
              projects: resumeData?.projects?.length || 0,
              achievements: resumeData?.achievements?.length || 0,
              experience: resumeData?.experience?.length || 0,
              education: resumeData?.education?.length || 0
            });
          }
        } catch (error) {
          console.error('Error loading resume data from Firebase:', error);
        }
      }
    };

    loadResumeData();
  }, [location.state, currentUser]);

  // Handle interview completion
  useEffect(() => {
    if (isInterviewComplete) {
      console.log('[TechnicalRound] Interview completed, collecting data...');
      console.log('[TechnicalRound] Messages:', messages);
      console.log('[TechnicalRound] Question expressions:', questionExpressions);
      setShowSummary(true);
    }
  }, [isInterviewComplete, messages, questionExpressions]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer effect
  useEffect(() => {
    if (!isInterviewStarted || isInterviewComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsInterviewComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInterviewStarted, isInterviewComplete]);

  // Fetch user details and resume data
  const fetchUserDetails = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Parse resume if available
        if (userData.resumeText) {
          const parsedResume = await resumeService.parseResume(userData.resumeText);
          console.log('Resume data loaded:', parsedResume);
          setResumeData(parsedResume);
        } else {
          console.log('No resume text found in user data');
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  // Start interview
  const startInterview = () => {
    setIsInterviewStarted(true);
    setTimeRemaining(roundDuration * 60);
    startCurrentRound();
  };

  // Detect and fix truncated/incomplete questions
  const sanitizeQuestion = async (q: string, round: 'technical' | 'core' | 'hr' = 'technical'): Promise<string> => {
    const trimmed = (q || '').trim();
    // A complete question ends with '?' or ends with a full stop or is long enough
    const isIncomplete =
      trimmed.length < 30 ||
      (!trimmed.endsWith('?') && !trimmed.endsWith('.') && !trimmed.endsWith(':')) ||
      /^Given an? \w+(\s+\w+){0,6}$/i.test(trimmed); // starts a sentence but doesn't finish it

    if (isIncomplete) {
      console.warn('[TechnicalRound] Detected truncated question, replacing via Gemini:', trimmed);
      try {
        const ctx: QuestionContext = { round, previousQuestions, userExpression, resumeData };
        return await openAI.generateQuestion(ctx);
      } catch {
        return 'Can you explain the difference between arrays and linked lists?';
      }
    }
    return trimmed;
  };

  // Start current round
  const startCurrentRound = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Generate first question without emotion (since no user response yet)
      const emotionScore = 'neutral (confidence: 0.5)';

      console.log('[TechnicalRound] Generating first technical question (no emotion yet)');

      let question: string;

      // ── PRIMARY: Backend API ───────────────────────────────────────────
      try {
        console.log('[TechnicalRound] Attempting to call backend API for technical round...');
        const response = await apiService.getTechnicalQuestion({
          emotion: emotionScore,
          last_answer: '',
          round: 'technical'
        }, conversationId);
        question = await sanitizeQuestion(response.question);
        console.log('[TechnicalRound] Backend API success:', question);
      } catch (apiError) {
        console.warn('[TechnicalRound] Backend API failed, trying local OpenAI service:', apiError);
        // ── SECONDARY: Gemini (Local) ──────────────────────────────────────────
        try {
          const questionContext: QuestionContext = {
            round: 'technical',
            previousQuestions: [],
            userExpression: userExpression,
            resumeData: resumeData
          };
          question = await openAI.generateQuestion(questionContext);
          console.log('[TechnicalRound] Gemini fallback success:', question);
        } catch (geminiError) {
          console.error('[TechnicalRound] Both API and Gemini failed:', geminiError);
          // ── LAST RESORT ─────────────────────────────────────────────────────
          question = 'Given an array of integers, find two numbers that add up to a target sum. Return their indices. (Example: nums=[2,7,11,15], target=9 → [0,1])';
          console.log('[TechnicalRound] Using hardcoded fallback question.');
        }
      }

      setCurrentQuestion(question);

      // Generate unique question ID
      const questionId = `technical_${Date.now()}`;
      setCurrentQuestionId(questionId);

      // Add question to messages
      const questionMessage: Message = {
        id: questionId,
        text: question,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, questionMessage]);
      setPreviousQuestions(prev => [...prev, question]);

      // Capture emotion when AI asks the question
      console.log('[TechnicalRound] AI asked question, capturing user\'s initial reaction...');
      setIsCapturingExpression(true);

      // Capture expression after a short delay to let the question sink in
      setTimeout(() => {
        console.log('[TechnicalRound] Triggering captureFrame after timeout for questionId:', questionId);
        captureFrame(questionId);
      }, 2000);

      // Speak the question
      try {
        await azureTTS.speak(question, 'technical');
      } catch (ttsError) {
        console.warn('TTS failed, continuing without audio:', ttsError);
      }

    } catch (error) {
      console.error('Error starting round:', error);
      setError('Failed to start round - please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user response
  const handleUserResponse = async (transcription: string) => {
    let safeText = (typeof transcription === 'string') ? transcription.trim() : '';
    if (!safeText || safeText.toLowerCase() === 'undefined' || safeText.toLowerCase() === 'null') {
      safeText = '[no answer]';
    }

    // Debug outgoing answer
    console.log('[TechnicalRound] handleUserResponse:', { transcription, safeText });

    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: safeText,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Capture emotion when user responds
      console.log('[TechnicalRound] User responded, capturing emotion...');
      setIsCapturingExpression(true);
      setTimeout(() => {
        console.log('[TechnicalRound] Triggering captureFrame for user response with questionId:', currentQuestionId);
        captureFrame(currentQuestionId); // Capture against the last AI question ID
      }, 1000);

      // Generate follow-up question using backend API with fallback
      const emotionScore = userExpression ?
        `${userExpression.dominantEmotion} (confidence: ${userExpression.confidenceScore})` :
        'neutral (confidence: 0.5)';

      let nextQuestion: string;

      // ── PRIMARY: Backend API ──────────────────────────────────────────
      try {
        console.log('[TechnicalRound] Calling backend API for technical follow-up...');
        const response = await apiService.getTechnicalQuestion({
          emotion: emotionScore,
          last_answer: safeText,
          round: 'technical'
        }, conversationId);
        nextQuestion = await sanitizeQuestion(response.question);
        console.log('[TechnicalRound] Backend follow-up success:', nextQuestion);
      } catch (apiError) {
        console.warn('[TechnicalRound] Backend API failed for follow-up, trying local OpenAI service:', apiError);
        // ── SECONDARY: Gemini (Local) ──────────────────────────────────────────
        try {
          const questionContext: QuestionContext = {
            round: 'technical',
            previousQuestions: previousQuestions,
            userExpression: userExpression,
            resumeData: resumeData,
            lastAnswer: safeText
          };
          nextQuestion = await openAI.generateFollowUpQuestion(questionContext, safeText);
          console.log('[TechnicalRound] Gemini fallback follow-up generated:', nextQuestion);
        } catch (geminiError) {
          console.error('[TechnicalRound] Both API and Gemini failed for follow-up:', geminiError);
          // ── LAST RESORT ───────────────────────────────────────────────────
          nextQuestion = "Good effort! Now let's try a different approach — can you explain how a hash map works and when you'd use one?";
        }
      }

      setCurrentQuestion(nextQuestion);

      // Add AI response to messages with a new question id and track it for next capture
      const nextQuestionId = `technical_${Date.now()}`;
      const aiMessage: Message = {
        id: nextQuestionId,
        text: nextQuestion,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setPreviousQuestions(prev => [...prev, nextQuestion]);
      setCurrentQuestionId(nextQuestionId);

      // Speak the response
      await azureTTS.speak(nextQuestion, 'technical');

    } catch (error) {
      console.error('Error handling user response:', error);
      setError('Failed to process response');
    }
  };

  // Handle chat input submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const inputText = chatInput.trim();
    setChatInput(''); // Clear input immediately
    await handleUserResponse(inputText);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        try {
          const transcription = await whisperService.transcribeAudio(audioBlob);
          await handleUserResponse(transcription);
        } catch (error) {
          console.error('Transcription error:', error);
          setError('Failed to transcribe audio');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
        console.log('Camera started successfully');

        // Start emotion analysis after camera is ready
        setTimeout(() => {
          setIsCapturingExpression(true);
          console.log('Starting emotion analysis');
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access and try again.');
        } else if (error.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError('Failed to start camera. Please try again.');
        }
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
      setUserExpression(null);
    }
  };

  // Capture frame for emotion analysis (only when question is asked)
  const captureFrame = async (questionId?: string) => {
    const targetQuestionId = questionId || currentQuestionId;
    console.log('[TechnicalRound] captureFrame called with questionId:', questionId, 'resolved as:', targetQuestionId);
    console.log('[TechnicalRound] Conditions check:', {
      hasVideo: !!videoRef.current,
      hasCanvas: !!canvasRef.current,
      isCameraOn,
      isCapturingExpression,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight
    });

    // Ensure required refs are available and capturing is active
    if (!videoRef.current || !canvasRef.current || !isCameraOn || !isCapturingExpression) {
      console.log('[TechnicalRound] Video or canvas not available, returning...');
      return;
    }

    // Check internet connection first
    if (!navigator.onLine) {
      console.warn('[TechnicalRound] No internet connection, skipping emotion analysis');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.log('[TechnicalRound] Canvas context not available');
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('[TechnicalRound] Video dimensions are 0; skipping capture');
      return;
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      console.log('[TechnicalRound] Drew video to canvas');
    }


    // Convert to blob like in your previous project
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    });

    if (!blob) return;
    console.log('[TechnicalRound] Image captured, size:', blob.size, "bytes");

    try {
      setIsAnalyzing(true);
      console.log("Starting facial analysis...");

      // Create a File object from the blob (like your previous project)
      const file = new File([blob], "frame.jpg", { type: "image/jpeg" });

      // Start inference job (same as your previous project)
      console.log("Starting inference job...");
      const formData = new FormData();
      formData.append('file', file);
      formData.append('json', JSON.stringify({
        models: { face: {} }
      }));

      console.log('Using Hume API Key:', humeApiKey ? 'Key present' : 'No key');

      const jobResponse = await fetch('https://api.hume.ai/v0/batch/jobs', {
        method: 'POST',
        headers: { 'X-Hume-Api-Key': humeApiKey },
        body: formData,
      });

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();
        console.error("Job creation error:", errorText);
        throw new Error(`API error: ${jobResponse.status}`);
      }

      const jobData = await jobResponse.json();
      const jobId = jobData.job_id;
      console.log("Job created with ID:", jobId);

      // Poll for job completion (same as your previous project)
      let jobStatus = 'RUNNING';
      let attempts = 0;
      const maxAttempts = 30;

      console.log("Polling for job completion...");
      while (jobStatus === 'RUNNING' && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await fetch(`https://api.hume.ai/v0/batch/jobs/${jobId}`, {
          method: 'GET',
          headers: { 'X-Hume-Api-Key': humeApiKey },
        });

        if (!statusResponse.ok) {
          console.error("Status check failed:", await statusResponse.text());
          break;
        }

        const statusData = await statusResponse.json();
        jobStatus = statusData.state?.status || statusData.status;
        console.log(`Job status (attempt ${attempts}): ${jobStatus}`);

        if (jobStatus === 'COMPLETED') {
          console.log("Job completed, waiting before fetching predictions...");
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try up to 3 times to get predictions (same as your previous project)
          let predictionsFound = false;
          for (let predAttempt = 1; predAttempt <= 3; predAttempt++) {
            console.log(`Fetching predictions (attempt ${predAttempt})...`);

            const predictionsResponse = await fetch(`https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`, {
              method: 'GET',
              headers: {
                'X-Hume-Api-Key': humeApiKey,
                'accept': 'application/json; charset=utf-8'
              },
            });

            if (!predictionsResponse.ok) {
              console.error(`Predictions fetch failed (attempt ${predAttempt}):`, await predictionsResponse.text());
              if (predAttempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
              break;
            }

            const predictions = await predictionsResponse.json();
            console.log(`Predictions response (attempt ${predAttempt}):`, predictions);

            if (predictions && Array.isArray(predictions) && predictions.length > 0) {
              console.log("Processing predictions structure...");

              // Check if we have predictions array in the results (same as your previous project)
              if (predictions[0].results?.predictions &&
                Array.isArray(predictions[0].results.predictions) &&
                predictions[0].results.predictions.length > 0) {

                const filePrediction = predictions[0].results.predictions[0];
                console.log("File prediction:", filePrediction);

                // Check if we have face model results with grouped_predictions (same as your previous project)
                if (filePrediction.models?.face?.grouped_predictions &&
                  filePrediction.models.face.grouped_predictions.length > 0 &&
                  filePrediction.models.face.grouped_predictions[0].predictions &&
                  filePrediction.models.face.grouped_predictions[0].predictions.length > 0) {

                  // Extract the emotions array from the first prediction
                  const emotions = filePrediction.models.face.grouped_predictions[0].predictions[0].emotions;

                  if (emotions && emotions.length > 0) {
                    console.log("Emotions found:", emotions.length, "emotions");

                    // Convert to our format
                    const dominantEmotion = emotions.reduce((max: any, emotion: any) =>
                      emotion.score > max.score ? emotion : max
                    );

                    const expression = {
                      isConfident: dominantEmotion.name === 'Confidence' || dominantEmotion.score > 0.6,
                      isNervous: dominantEmotion.name === 'Doubt' || dominantEmotion.name === 'Frustration' || dominantEmotion.score < 0.4,
                      isStruggling: dominantEmotion.name === 'Confusion' || dominantEmotion.name === 'Frustration' || dominantEmotion.score < 0.3,
                      dominantEmotion: dominantEmotion.name,
                      confidenceScore: Math.round(dominantEmotion.score * 100) / 100,
                      emotionBreakdown: emotions
                    };

                    console.log('[TechnicalRound] Updating emotion data:', {
                      dominantEmotion: expression.dominantEmotion,
                      confidenceScore: expression.confidenceScore,
                      emotionsCount: emotions.length
                    });

                    setUserExpression(expression);
                    setCurrentEmotions(emotions);
                    localStorage.setItem('currentEmotions', JSON.stringify(emotions));

                    console.log('✅ Real Hume AI data received:', expression.dominantEmotion, expression.confidenceScore);

                    // Store expression for this specific question if questionId provided
                    if (targetQuestionId) {
                      console.log('[TechnicalRound] Setting question expression for questionId:', targetQuestionId, expression);
                      setQuestionExpressions(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetQuestionId, expression);
                        console.log('[TechnicalRound] Updated questionExpressions map size:', newMap.size);
                        return newMap;
                      });
                    } else {
                      console.log('[TechnicalRound] No questionId provided, not storing expression');
                    }

                    predictionsFound = true;
                  } else {
                    console.log("No emotions array in the prediction");
                  }

                  break;
                } else {
                  console.log("No grouped_predictions in face model results");
                }
              }
            }

            if (predAttempt < 3 && !predictionsFound) {
              console.log("Waiting before retrying predictions...");
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          if (!predictionsFound) {
            console.log("Failed to get valid predictions after multiple attempts");
            // Use fallback
            const fallbackExpression = {
              isConfident: false,
              isNervous: true,
              isStruggling: false,
              dominantEmotion: 'Neutral',
              confidenceScore: 0.5,
              emotionBreakdown: []
            };
            setUserExpression(fallbackExpression);
            console.log('⚠️ Using fallback emotion data (no real face detected)');
          }

          break;
        } else if (jobStatus === 'FAILED') {
          console.error("Job failed");
          break;
        }
      }

      if (attempts >= maxAttempts) {
        console.log("Max polling attempts reached");
      }

    } catch (error: any) {
      console.error('[TechnicalRound] Error analyzing emotions:', error);
      // Use fallback on error
      const fallbackExpression = {
        isConfident: false,
        isNervous: true,
        isStruggling: false,
        dominantEmotion: 'Neutral',
        confidenceScore: 0.5,
        emotionBreakdown: []
      };
      setUserExpression(fallbackExpression);
      console.log('⚠️ Using fallback emotion data due to error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start/stop emotion analysis (only when capturing)
  useEffect(() => {
    console.log('[TechnicalRound] Emotion capture effect triggered:', { isCameraOn, isCapturingExpression });

    if (isCapturingExpression) {
      console.log('[TechnicalRound] Starting emotion capture...');
      // Capture emotion immediately when capturing starts
      const timeout = setTimeout(() => {
        console.log('[TechnicalRound] Capturing emotion now...');
        captureFrame();
        setIsCapturingExpression(false); // Stop capturing after one capture
        console.log('[TechnicalRound] Emotion capture completed, stopping...');
      }, 2000); // Wait 2 seconds for user to see/hear the question
      captureIntervalRef.current = timeout;
    } else {
      if (captureIntervalRef.current) {
        console.log('[TechnicalRound] Clearing emotion capture timeout...');
        clearTimeout(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    }

    return () => {
      if (captureIntervalRef.current) {
        clearTimeout(captureIntervalRef.current);
      }
    };
  }, [isCameraOn, isCapturingExpression]);

  // Load user details on mount
  useEffect(() => {
    fetchUserDetails();
  }, [currentUser]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInterviewStarted) {
    return (
      <div className="min-h-screen bg-primary text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <h1 className="text-3xl font-bold">Technical Round - DSA Interview</h1>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Technical Round Setup</h2>

            <div className="space-y-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Round Details</h3>
                <p className="text-gray-300">
                  This round focuses on Data Structures and Algorithms (DSA) questions.
                  The interviewer will ask technical questions and adapt based on your confidence level.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Duration: {roundDuration} minutes
                </p>
              </div>

              <button
                onClick={startInterview}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                Start Technical Round
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isInterviewComplete) {
    return (
      <div className="min-h-screen bg-primary text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Technical Round Complete!</h1>
            <p className="text-xl text-gray-300 mb-8">
              Great job! You've completed the technical round.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/core-round', {
                  state: {
                    roundDuration,
                    resumeData,
                    messages,
                    questionExpressions,
                    // Store technical round data
                    technicalMessages: messages,
                    technicalQuestionExpressions: Array.from(questionExpressions.entries())
                  }
                })}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mr-4"
              >
                Continue to Core Round
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/60 backdrop-blur-md border-b border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Technical Round</h1>
              <p className="text-xs text-gray-400">Data Structures & Algorithms</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-mono text-sm font-medium">{formatTime(timeRemaining)}</span>
            </div>
            <button
              onClick={() => setIsInterviewComplete(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors"
            >
              <X className="h-4 w-4" />
              <span>End Round</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 p-4">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel: Camera + Emotions */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            {/* Camera Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden flex-shrink-0">
              {/* Camera viewport */}
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Off Overlay */}
                {!isCameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <CameraOff className="h-10 w-10 text-gray-500 mb-3" />
                    <p className="text-gray-400 text-sm mb-3">Camera is off</p>
                    <button
                      onClick={startCamera}
                      className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Enable Camera</span>
                    </button>
                  </div>
                )}

                {/* Live badge */}
                {isCameraOn && (
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-300 font-medium">LIVE</span>
                  </div>
                )}

                {/* Camera toggle button */}
                {isCameraOn && (
                  <button
                    onClick={stopCamera}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-sm hover:bg-red-500/30 border border-white/10 rounded-full transition-colors"
                    title="Turn off camera"
                  >
                    <CameraOff className="h-3.5 w-3.5 text-gray-300" />
                  </button>
                )}
              </div>

              {/* Emotion Analysis */}
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Emotion Analysis</h4>
                {isCameraOn && userExpression ? (
                  <div className="space-y-2">
                    {userExpression.emotionBreakdown && userExpression.emotionBreakdown.slice(0, 4).map((emotion: { name: string; score: number }, index: number) => (
                      <div key={index}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{emotion.name}</span>
                          <span className="text-white">{(emotion.score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${emotion.score * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                      <span className={userExpression.isConfident ? 'text-green-400' : 'text-amber-400'}>
                        {userExpression.isConfident ? '✓ Confident' : '⚡ Building confidence'}
                      </span>
                      <span className="text-gray-500">{Math.round(userExpression.confidenceScore * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">
                    {isCameraOn ? (isAnalyzing ? 'Analyzing...' : 'Waiting for data...') : 'Enable camera to analyze emotions'}
                  </p>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex-shrink-0 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start space-x-2">
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 flex-shrink-0">✕</button>
              </div>
            )}
          </div>

          {/* Right Panel: Chat */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col min-h-0 overflow-hidden">
              {/* Chat header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Interview Chat</h3>
                </div>
                {isLoading && (
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>

              {/* Scrollable Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white/10 text-gray-100 border border-white/10 rounded-bl-md'
                        }`}
                      >
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                        </div>
                        <div className="text-xs opacity-40 mt-1.5">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-white/10 space-y-3">
                {/* Voice / status row */}
                <div className="flex items-center space-x-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 rounded-xl text-sm transition-all"
                    >
                      <Mic className="h-4 w-4" />
                      <span>Voice Answer</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-xl text-sm text-red-300 transition-all animate-pulse"
                    >
                      <MicOff className="h-4 w-4" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                  {isCameraOn && (
                    <div className="flex items-center space-x-1.5 text-xs text-blue-400">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      <span>Emotion tracking active</span>
                    </div>
                  )}
                </div>

                {/* Text input row */}
                <form onSubmit={handleChatSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors font-medium"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interview Complete Summary */}
      {isInterviewComplete && showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Technical Round Complete!</h2>
              <p className="text-gray-400">Round Duration: {roundDuration} minutes</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">Round Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Questions Asked:</span>
                    <span className="text-white ml-2">{messages.filter(m => m.sender === 'ai').length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Your Responses:</span>
                    <span className="text-white ml-2">{messages.filter(m => m.sender === 'user').length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Emotion Captures:</span>
                    <span className="text-white ml-2">{questionExpressions.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confident Moments:</span>
                    <span className="text-white ml-2">{Array.from(questionExpressions.values()).filter(expr => expr.isConfident).length}</span>
                  </div>
                </div>
              </div>

              {questionExpressions.size > 0 && (
                <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-300 mb-2">Emotion Analysis</h3>
                  <div className="space-y-2">
                    {Array.from(questionExpressions.entries()).map(([questionId, expression], index) => (
                      <div key={questionId} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">Question {index + 1}:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${expression.isConfident ? 'bg-green-600/30 text-green-300' :
                            expression.isNervous ? 'bg-red-600/30 text-red-300' :
                              'bg-yellow-600/30 text-yellow-300'
                            }`}>
                            {expression.dominantEmotion} ({Math.round(expression.confidenceScore * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  console.log('[TechnicalRound] MANUAL EMOTION TEST - Triggering captureFrame');
                  captureFrame('test_question');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Test Emotion Capture
              </button>
              <button
                onClick={() => {
                  console.log('[TechnicalRound] SIMPLE EMOTION TEST - Creating fake emotion data');
                  const fakeExpression = {
                    isConfident: Math.random() > 0.5,
                    isNervous: Math.random() < 0.3,
                    isStruggling: Math.random() < 0.2,
                    dominantEmotion: ['Confidence', 'Joy', 'Neutral', 'Doubt'][Math.floor(Math.random() * 4)],
                    confidenceScore: Math.random(),
                    emotionBreakdown: [
                      { name: 'Confidence', score: Math.random() },
                      { name: 'Joy', score: Math.random() },
                      { name: 'Neutral', score: Math.random() },
                      { name: 'Doubt', score: Math.random() }
                    ]
                  };
                  setUserExpression(fakeExpression);
                  setQuestionExpressions(prev => {
                    const newMap = new Map(prev);
                    newMap.set('test_question', fakeExpression);
                    console.log('[TechnicalRound] Added fake emotion data, map size:', newMap.size);
                    return newMap;
                  });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Fake Emotion Data
              </button>
              <button
                onClick={() => {
                  navigate('/core-round', {
                    state: {
                      messages,
                      questionExpressions: Array.from(questionExpressions.entries()),
                      resumeData,
                      roundDuration,
                      conversationId,
                      // Pass technical round data explicitly
                      technicalMessages: messages,
                      technicalQuestionExpressions: Array.from(questionExpressions.entries()),
                    }
                  });
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue to Core Round →
              </button>
              <button
                onClick={() => {
                  console.log('[TechnicalRound] Navigating to summary with data:', {
                    messagesCount: messages.length,
                    questionExpressionsSize: questionExpressions.size,
                    questionExpressionsData: Array.from(questionExpressions.entries())
                  });

                  navigate('/nerv-summary', {
                    state: {
                      summary: 'Technical Round completed successfully',
                      messages,
                      questionExpressions: Array.from(questionExpressions.entries()), // Convert Map to Array
                      resumeData,
                      roundDuration,
                      conversationId,
                      roundType: 'technical'
                    }
                  });
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalRound;



