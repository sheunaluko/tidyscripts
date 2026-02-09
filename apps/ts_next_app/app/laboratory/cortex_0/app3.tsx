'use client';

// IMPORTANT: Import observer tracker FIRST before React
import { observerTracker } from "./utils/observerTracker";

import type { NextPage } from 'next'
import {useEffect, useState, useRef, useCallback, useMemo } from 'react' ;
import React from 'react' ;
import styles from '../../../styles/Default.module.css'
import  "./app.css"
import * as tsw from "tidyscripts_web"  ;
import { fps_monitor } from "../src";
import { eventListenerTracker } from "./utils/eventListenerTracker";
//import { ChakraProvider } from '@chakra-ui/react' ;
import { alpha } from '@mui/system';
import { theme } from "../../theme";
import ReactMarkdown from 'react-markdown';
import * as cortex_agent from "./cortex_agent_web" 
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled, useTheme } from '@mui/material/styles';
import {ObjectInspector } from 'react-inspector';
import {
    Box,
    Button,
    Input,
    Switch,
    FormGroup,
    FormControlLabel,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Slider,
    Paper,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText
} from "@mui/material"

import {useTivi} from "../components/tivi/lib/index"
import { useTiviSettings } from '../components/tivi/lib/useTiviSettings';

import { ExecutionSnapshot } from './types/execution';
import * as fb from "../../../src/firebase" ;
import { useInsights } from '../rai/context/InsightsContext';
import { useCortexStore } from './store/useCortexStore';

export async function get_question(qid : string) {
    qid = qid || "t1_q1" ; 
    return (await fb.fu.get_user_doc({ path: [qid] , app_id : "usync" }))
} 


import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import MenuIcon from '@mui/icons-material/Menu';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import WidgetItem from "./WidgetItem" ;

import * as sandbox from "./src/sandbox"


import Code_Widget from "./CodeWidget"
import HTML_Widget from "./HTMLWidget"

// Import extracted widgets
import ThoughtsWidget from "./widgets/ThoughtsWidget"
import LogWidget from "./widgets/LogWidget"
import WorkspaceWidget from "./widgets/WorkspaceWidget"
import ChatWidget from "./widgets/ChatWidget"
import CodeWidget from "./widgets/CodeWidget"
import HTMLWidget from "./widgets/HTMLWidget"
import ChatInputWidget from "./widgets/ChatInputWidget"
import CodeExecutionWidget from "./widgets/CodeExecutionWidget"
import FunctionCallsWidget from "./widgets/FunctionCallsWidget"
import VariableInspectorWidget from "./widgets/VariableInspectorWidget"
import SandboxLogsWidget from "./widgets/SandboxLogsWidget"
import HistoryWidget from "./widgets/HistoryWidget"

// Import AudioVisualization component
// import AudioVisualization from "./components/AudioVisualization"

// Import custom hooks
import { useWidgetConfig } from "./hooks/useWidgetConfig"
import { useCortexAgent } from "./hooks/useCortexAgent"

// Import TopBar, SettingsPanel, VoiceStatusIndicator, and DraggableWidgetGrid
import { TopBar } from "./components/TopBar"
import { SettingsPanel } from "./components/SettingsPanel"
import { VoiceStatusIndicator } from "./components/VoiceStatusIndicator"
import { DraggableWidgetGrid } from "./components/DraggableWidgetGrid" 

/*

   Main Feature Release of Cortex


 */

declare var window : any ; 

const logger = tsw.common.logger
const log   = logger.get_logger({id:"cortex"}) ;
const ap    = tsw.util.audio_processing;
const dsp   = tsw.common.util.dsp ;
const debug = tsw.common.util.debug ;
const fp    = tsw.common.fp ;
const dom   = tsw.util.dom ; 
const wa    = tsw.apis.web_audio;
const oai   = tsw.apis.openai;
const sounds = tsw.util.sounds

/*
   Global log suppression
 */
for (var x of  ["html","toast"]) {
    logger.suppress(x, "clean up") ;
}



/* For the chat box */ 
const alpha_val = 0.4
const light_primary = alpha(theme.palette.primary.main, alpha_val) 
const light_secondary = alpha(theme.palette.secondary.main, alpha_val) 

// Cortex agent instance will be managed via React state in-component

/* grid item */ 
const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),

    overflowY : 'hidden' ,
    overflowX : 'auto' ,     
    height : "300px" ,
    ...theme.applyStyles('dark', {
	backgroundColor: '#1A2027',
    })
})) 


/* C O M P O N E N T _ D E F I N I T I O N  */ 
const  Component: NextPage = (props : any) => {

    const theme = useTheme() ;

    // Mode state: 'voice' or 'chat'
    const [mode, setMode] = useState<'voice' | 'chat'>('voice');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Voice status indicator state
    type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');

    // Chat mode state
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [transcribe, setTranscribe] = useState(true)
    const transcribeRef = React.useRef(transcribe) //toggle for enabling transcription
    const audioCleanupRef = useRef<(() => void) | null>(null); //cleanup function for audio listeners
    const lastTranscriptionTimeRef = useRef<number>(0);
    const [started, set_started] = useState(false);
    const [interim_result, set_interim_result] = useState("" as string);
    const [audio_history, set_audio_history] = useState([]);

    // Tivi settings — shared across all apps via tivi settings module
    const { settings: tiviSettings, updateSettings: updateTiviSettings } = useTiviSettings();

    // InsightsClient from InsightsProvider (replaces manual init)
    const { client: insightsClientFromContext, isReady: insightsReady } = useInsights();
    const insightsClient = useRef<any>(null);

    // Sync insightsClient ref from context
    useEffect(() => {
	if (insightsClientFromContext) {
	    insightsClient.current = insightsClientFromContext;
	}
    }, [insightsClientFromContext]);

    // Store selectors — state that moved from useState to Zustand
    const {
	chatHistory: chat_history,
	lastAiMessage: last_ai_message,
	workspace,
	thoughtHistory: thought_history,
	logHistory: log_history,
	htmlDisplay: html_display,
	codeParams: code_params,
	contextUsage,
	isAuthenticated,
	aiModel: ai_model,
	speechCooldownMs,
	soundFeedback: sound_feedback_from_store,
	// Execution state
	currentCode,
	executionId,
	executionStatus,
	executionError,
	executionDuration,
	executionResult,
	functionCalls,
	variableAssignments,
	sandboxLogs,
	executionHistory,
	selectedIndex,
	isPinned,
	// Actions
	addUserMessage: store_addUserMessage,
	addAiMessage: store_addAiMessage,
	updateWorkspace: store_updateWorkspace,
	updateSettings: store_updateSettings,
	handleThought,
	handleLog: storeHandleLog,
	handleCodeUpdate,
	handleHtmlUpdate,
	handleContextStatus,
	handleCodeExecutionStart,
	handleCodeExecutionComplete,
	handleSandboxLog,
	handleSandboxEvent,
	handleHistoryItemClick: store_handleHistoryItemClick,
	setIsPinned: store_setIsPinned,
	loadSettings,
	loadConversation,
	saveConversation,
	saveSettings,
	// Agent ref for replay
	setAgent: store_setAgent,
	_llmActive,
    } = useCortexStore();

    const last_ai_message_ref = React.useRef(last_ai_message);

    // Late-bind InsightsClient to Zustand store
    useEffect(() => {
	if (insightsClientFromContext) {
	    useCortexStore.setInsights(insightsClientFromContext);
	}
    }, [insightsClientFromContext]);

    // Init flow: load settings and conversation from AppDataStore
    useEffect(() => {
	if (insightsReady) {
	    loadSettings().then(() => loadConversation());
	}
    }, [insightsReady]);

    // FPS Monitor for performance tracking
    const fpsMonitor = useRef<any>(null);
    const sessionStartTime = useRef<number>(Date.now());

    // Initialize FPS Monitor after InsightsClient is ready
    useEffect(() => {
        if (insightsReady && typeof window !== 'undefined') {
            fpsMonitor.current = new fps_monitor.FPSMonitor({
                measurement_duration_ms: 1000,
                rolling_window_size: 60,
                include_diagnostics: true
            });
            log('FPS Monitor initialized');
        }
    }, [insightsReady]);

    // Cortex agent hook - automatically re-initializes when model changes or insights is ready
    const { agent: COR, isLoading: agentLoading, error: agentError } = useCortexAgent(
        ai_model,
        insightsReady ? insightsClient.current : undefined,
        { isAuthenticated }
    );

    // Keep a ref to the latest COR to avoid stale closures in transcription_cb
    const CORRef = useRef(COR);
    useEffect(() => {
        CORRef.current = COR;
    }, [COR]);

    // Converted from global variables to React state
    const [globalPause, setGlobalPause] = useState(false);
    // Audio level is now tracked in a ref inside useTivi (not React state)
    // to avoid triggering Firebase's aggressive IndexedDB polling

    const tivi = useTivi({
	verbose: tiviSettings.verbose,
        positiveSpeechThreshold: tiviSettings.positiveSpeechThreshold,
        negativeSpeechThreshold: tiviSettings.negativeSpeechThreshold,
        minSpeechStartMs: tiviSettings.minSpeechStartMs,
        language: tiviSettings.language,
        mode: tiviSettings.mode,
        powerThreshold: tiviSettings.powerThreshold,
        enableInterruption: tiviSettings.enableInterruption,
    });

    // Update voice status based on current state
    useEffect(() => {
        if (tivi.isSpeaking) {
            setVoiceStatus('speaking');
        } else if (isAiTyping) {
            setVoiceStatus('processing');
        } else if (started) {
            setVoiceStatus('listening');
        } else {
            setVoiceStatus('idle');
        }
    }, [tivi.isSpeaking, isAiTyping, started]);

    const [text_input, set_text_input] = useState<string>('');

    const handle_code_change = useCallback((new_params : any) => {
    	// Update store directly — codeParams is in Zustand now
    	handleCodeUpdate({ code_params: new_params });
    }, [handleCodeUpdate]);
    


    const [focusedWidget, setFocusedWidget] = useState<string | null>(null);

    // Execution state — from store (destructured directly above)



    // Function to add a user's message to the chat
    const add_user_message = useCallback((content: string) => {
	// Update store
	store_addUserMessage(content);

	//add the user message to COR
	COR.add_user_text_input(content)

	// Add user input event to insights
	if (insightsClient.current) {
	    insightsClient.current.addUserInput({
		input_mode: mode,
		input_length: content.length,
		context: {
		    content
		}
	    }).catch((err: any) => {
		log(`Error adding user input event: ${err}`);
	    });
	}

	if (sound_feedback_from_store) {
	    sounds.proceed()
	}
    }, [COR, mode, sound_feedback_from_store, store_addUserMessage]);

    
    // Widget configuration hook
    const { widgets, visibleWidgets, toggleWidget, widgetLayout, saveLayout, resetLayout, applyPreset } = useWidgetConfig();
    /* E V E N T _ H A N D L I N G — delegated to store actions */
    const handle_workspace_update = useCallback((evt : any) => {
	log(`Got workspace update event`)
	store_updateWorkspace(evt.workspace);
    }, [store_updateWorkspace]);

    const handle_html_form_data = useCallback((evt: any) => {
	log(`Got HTML form data event`);
	const { data } = evt;

	// Validate object type
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
	    log(`Invalid data type, skipping`);
	    return;
	}

	// Filter dangerous keys
	const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
	const sanitizedData: Record<string, any> = {};

	for (const [key, value] of Object.entries(data)) {
	    if (dangerousKeys.includes(key)) {
		log(`Filtered dangerous key: ${key}`);
		continue;
	    }
	    if (typeof value === 'function') {
		log(`Filtered function value for key: ${key}`);
		continue;
	    }
	    sanitizedData[key] = value;
	}

	// Store in COR workspace and emit update
	if (COR?.workspace) {
	    Object.assign(COR.workspace, sanitizedData);
	    COR.emit('event', { type: 'workspace_update', workspace: COR.workspace });
	    log(`HTML form data stored: ${Object.keys(sanitizedData).length} keys`);
	}
    }, [COR]);

    const handle_html_interaction_complete = useCallback((evt: any) => {
	log(`Got HTML interaction complete event`);
	const message = evt.message || "I'm done interacting with the HTML form";

	// Add as user message to trigger LLM response
	add_user_message(message);
	log(`Added user message: ${message}`);
    }, [add_user_message]);

    // Event handlers delegated to store: handleThought, storeHandleLog,
    // handleCodeUpdate, handleHtmlUpdate, handleContextStatus,
    // handleCodeExecutionStart, handleCodeExecutionComplete,
    // handleSandboxLog, handleSandboxEvent — all from useCortexStore()

    // Derive current execution from history and selected index
    // When execution is running, return null to show live state
    const currentExecution = useMemo(() => {
	// If actively executing, show live state (not historical data)
	if (executionStatus === 'running') {
	    return null;
	}

	if (executionHistory.length === 0) return null;

	// If selectedIndex is -1 (or out of bounds), show latest
	if (selectedIndex === -1 || selectedIndex >= executionHistory.length) {
	    return executionHistory[executionHistory.length - 1];
	}

	// Otherwise show selected execution
	return executionHistory[selectedIndex];
    }, [executionHistory, selectedIndex, executionStatus]);

    const event_dic: {[k:string] : any} = useMemo(() => ({
	'thought' : handleThought,
	'workspace_update' : handle_workspace_update,
	'log' : storeHandleLog,
	'code_update' : handleCodeUpdate,
	'html_update' : handleHtmlUpdate,
	'html_form_data': handle_html_form_data,
	'html_interaction_complete': handle_html_interaction_complete,
	'code_execution_start': handleCodeExecutionStart,
	'code_execution_complete': handleCodeExecutionComplete,
	'sandbox_log': handleSandboxLog,
	'sandbox_event': handleSandboxEvent,
	'context_status': handleContextStatus,
    }), [handleThought, handle_workspace_update, storeHandleLog, handleCodeUpdate, handleHtmlUpdate, handle_html_form_data, handle_html_interaction_complete, handleCodeExecutionStart, handleCodeExecutionComplete, handleSandboxLog, handleSandboxEvent, handleContextStatus]);
    
    const handle_event = useCallback((evt : any) => {
	log(`Got event: ${JSON.stringify(evt)}`)
	let fn = event_dic[evt.type] ;
	if (fn) {
	    fn(evt)
	} else {
	    log(`No handler for event type: ${evt.type}`)
	}
    }, [event_dic]);

    /* E F F E C T S */

    // Cleanup event listener for speech recognition interim results
    useEffect(() => {
	const handleInterim = (e: any) => {
	    const transcript = e.detail;
	    set_interim_result(transcript);
	};

	if (typeof window !== "undefined") {
	    window.addEventListener('tidyscripts_web_speech_recognition_interim', handleInterim);
	}

	return () => {
	    if (typeof window !== "undefined") {
		window.removeEventListener('tidyscripts_web_speech_recognition_interim', handleInterim);
	    }
	};
    }, []); 

    useEffect( ()=> {
        let speak = async function(content : string) {
            await tivi.speak(content, tiviSettings.playbackRate) ;
        }

	if (COR) {
	    //this is redundant but leaving for historical reasons
	    if (mode == 'chat' ) {
		COR.configure_user_output(add_ai_message)
	    } else {
		COR.configure_user_output(add_ai_message )
	    }
	}
    }, [tiviSettings.playbackRate, COR, mode])


    useEffect( ()=> {
    	log(`Detected cor change`)
	if (COR) {
	    // Keep store's agent ref in sync for replay/dispatch
	    store_setAgent(COR);
            COR.on('event', handle_event)
            return () => { COR.off('event', handle_event) }
	}
    }, [COR, handle_event])

    // Execution snapshot capture is now handled inside the store (captureExecutionSnapshot)

    // Auto-save: debounced save after chat/workspace/settings changes
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
	if (!insightsReady) return;
	if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
	saveTimerRef.current = setTimeout(() => {
	    saveConversation();
	    saveSettings();
	}, 2000);
	return () => {
	    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
	};
    }, [chat_history, workspace, ai_model, speechCooldownMs, sound_feedback_from_store, insightsReady]);

    // Auto-scroll for widget displays - only depend on data that affects scroll
    useEffect(() => {
	const ids = ['chat_display', 'log_display', 'thought_display'];

	requestAnimationFrame(() => {
	    ids.forEach((id) => {
		const el = document.getElementById(id);
		if (el) {
		    el.scrollTop = el.scrollHeight;
		}
	    });
	});
    }, [chat_history, thought_history, log_history]); // Only scroll-related deps

    // postMessage listener for HTML widget form submissions
    useEffect(() => {
	const handleMessage = (event: MessageEvent) => {
	    // Validate origin: only accept messages from same origin (our iframe)
	    // Iframes with srcdoc have origin 'null' when sandboxed without allow-same-origin
	    if (event.origin !== window.location.origin && event.origin !== 'null') {
		log(`Rejected postMessage from unauthorized origin: ${event.origin}`);
		return;
	    }

	    if (event.data?.type === 'html_widget_data') {
		handle_event({
		    type: 'html_form_data',
		    data: event.data.payload,
		    timestamp: event.data.timestamp
		});
	    } else if (event.data?.type === 'html_interaction_complete') {
		handle_event({
		    type: 'html_interaction_complete',
		    message: event.data.message,
		    timestamp: event.data.timestamp
		});
	    }
	};

	window.addEventListener('message', handleMessage);

	return () => {
	    window.removeEventListener('message', handleMessage);
	};
    }, [handle_event]);

    useEffect(  ()=> {

	if (window.workspace ) {
	    window.alert(`Caution, overwriting workspace global var`) ;
	}
	
	Object.assign(window, {
	    fb,
	    get_question,
	    tsw,
	    wa ,
	    debug ,
	    get_ai_response ,
	    get_agent: () => COR,  // Simple getter for backward compatibility
	    transcription_cb ,
	    workspace ,
	    last_ai_message,
	    last_ai_message_ref,
	    COR,
	    tivi,
	    sandbox,  // Sandboxed JavaScript execution
	    cortexInsights: insightsClient.current,
	}) ;

	return ()=>{
	    let k = `cortex_workspace_${(new Date()).toString()}` ; 
	    localStorage[k] = JSON.stringify(window.workspace) ; 
	    delete window.workspace 
	}

    } , [COR] ) ; //init script is called in "on_init_audio", update when COR changes    

    useEffect( ()=> {
	transcribeRef.current = transcribe 
    }, [transcribe] )

    useEffect( ()=> {
	last_ai_message_ref.current = last_ai_message
    }, [last_ai_message] )


    useEffect(  ()=> {
	//determine if it is user_message or ai_message
	if (chat_history.length < 1)  {
	    log(`Chat history empty`); return
	}
	let role = fp.last(chat_history).role
	log(`Detected change in chat history from: ${role}`)

	if (role == 'user') {

	    // Guard: if sendMessage() is driving the LLM, skip this reactive trigger
	    if (_llmActive) {
		log(`Skipping reactive LLM trigger — sendMessage is active`)
		return
	    }

	    log(`Given user change, will send to ai`)
	    get_ai_response().then( (result : any) => {
		// add_ai_message(resp)
		//but now response display is handled by tool/function call


	    });

	    return

	}

	if (role == 'system') {
	    log(`System change ignored`)
	} else {
	    log(`Given ai change, will await user response `)
	}

    }, [chat_history, _llmActive])

    /*
       DEFINE THE TRANSCRIPTION CALLBACK
       This is passed to the audio api and will be called once transcription results  
       in the transcription callback we get the transcription text and call add_user_message
       then we call ai_response = await get_ai_response()
     */


    const transcription_cb = useCallback(async (text: string) => {

	log(`tcb: ${text}`)

	// Check speech cooldown - ignore if within cooldown period of last processed transcription
	const now = Date.now();
	const timeSinceLast = now - lastTranscriptionTimeRef.current;
	if (timeSinceLast < speechCooldownMs) {
	    log(`tcb: Ignoring - within cooldown (${timeSinceLast}ms < ${speechCooldownMs}ms)`)
	    return;
	}
	lastTranscriptionTimeRef.current = now;

	/*
           This is where I need to pass the transcript Dynamically either to:
	   - cortex_channel
	   - function_channel

	   If a function is executing then we pass to function_channel
	   If not then we pass to cortex_channel

	 */

	if (COR && COR.is_running_function) {
	    log(`tcb: Cortex running function, will forward`)
	    await COR.handle_function_input(text)

	} else {
	    log(`tcb: No active cortex function`)
	    add_user_message(text) ;
	}

    }, [COR, add_user_message, speechCooldownMs]); 

    //handle user chat message (instead of voice)
    const handleSend = async () => {
	if (text_input.trim()) {
	    //simulate as if the user has said this
	    transcription_cb(text_input.trim())
	}
    };

    //if the user pressers enter instead of send
    const handleKeyPress = (event: React.KeyboardEvent) => {
	if (event.key === 'Enter') {
	    event.preventDefault();
	    handleSend();
	    //set text_input to ""
	    set_text_input("") ; 

	}
    };

    //handle audio playback rate
    const handleRateChange = (event: Event, newValue: number | number[]) => {
	if (Array.isArray(newValue)) return; // Handle single value only
	updateTiviSettings({ playbackRate: newValue });
    }


    // Function to add an AI's message to the chat
    const add_ai_message = useCallback(async (content: string) => {
	// Update store
	store_addAiMessage(content);
	if (sound_feedback_from_store) {
	    sounds.proceed()
	}


	//here we need to actually speak the response too!
	//Skip TTS if in chat mode OR if tivi hasn't been started
	//(user may be typing in the chat widget while in voice mode)
	if (mode != "chat" && started) {
	    log(`generating audio response...`)
	    log(`Using playbackRate to ${tiviSettings.playbackRate}`)
	    //first pause SR
	    tivi.pauseSpeechRecognition() ;  // this will get retriggered based on VAD
	    //then speak
	    await tivi.speak(content, tiviSettings.playbackRate) ;
	    log(`done`)
	} else {
	    log(`Skipping speech — ${mode === 'chat' ? 'chat mode' : 'tivi not started'}`)
	}

	// Measure FPS after AI response (non-blocking)
	if (insightsClient.current && fpsMonitor.current) {
	    // Don't await - let it run in background
	    fpsMonitor.current.measure(1000)
		.then((snapshot: any) => {
		    const stats = fpsMonitor.current.get_current_stats();
		    const diagnostics = fpsMonitor.current.get_diagnostics();

		    return insightsClient.current.addEvent('performance_metrics', {
			// FPS metrics
			fps_current: stats.fps_current,
			fps_avg_1min: stats.fps_avg_1min,
			fps_min_1min: stats.fps_min_1min,
			fps_max_1min: stats.fps_max_1min,

			// Context
			trigger: 'post_ai_response',
			mode: mode,  // 'voice' or 'chat'
			response_length: content.length,
			session_uptime_ms: Date.now() - sessionStartTime.current,

			// Diagnostics
			memory_mb: diagnostics?.memory_mb ?? null,
			memory_limit_mb: diagnostics?.memory_limit_mb ?? null,
			dom_nodes: diagnostics?.dom_nodes ?? 0,
			visible_nodes: diagnostics?.visible_nodes ?? 0,
		    }, {
			tags: ['performance', 'fps', 'ai_response'],
			duration_ms: 1000
		    });
		})
		.catch((err: any) => {
		    log(`FPS measurement failed: ${err}`);
		});
	}

    }, [sound_feedback_from_store, mode, started, tiviSettings.playbackRate, tivi, insightsClient, fpsMonitor, store_addAiMessage]);

    //function for getting AI response from the chat history and the ai_model
    let get_ai_response = async function() {
	
	log(`Calling llm`)
	try  {
	    var llm_result  = await COR.run_llm(4) as string ; 
	} catch (e : any) { 
	    throw new Error(`Error running llm: ${e}`) 
	}

	return llm_result

    } 

    const handleSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
	let v = event.target.checked
	log(`Transcribe=${v}`)
	setTranscribe(v);
    };

    const handleTranscribeToggle = () => {
	const newValue = !transcribe;
	log(`Transcribe=${newValue}`)
	setTranscribe(newValue);
    };

    const handle_start_stop = useCallback(async () => {
	if (!started) {
	    log(`Starting audio`)
	    set_started(true);
	    audioCleanupRef.current = await on_init_audio(transcribeRef, transcription_cb, tivi)
	    setGlobalPause(false)
	} else {
	    //already started; so now we stop it
	    log(`Stopping audio`)
	    setGlobalPause(true)
	    set_started(false)
	    tivi.stopListening()
	    // Cleanup event listeners
	    if (audioCleanupRef.current) {
		audioCleanupRef.current();
		audioCleanupRef.current = null;
	    }
	}
    }, [started, transcribeRef, tivi]);

    const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
        if (
            event.type === 'keydown' &&
            ((event as React.KeyboardEvent).key === 'Tab' ||
                (event as React.KeyboardEvent).key === 'Shift')
        ) {
            return;
        }
        setDrawerOpen(open);
    };

    const handleModeChange = (newMode: 'voice' | 'chat') => {
        log(`Switching mode to: ${newMode}`);
        setMode(newMode);
        setDrawerOpen(false);
    };

    const handleChatSend = () => {
        if (chatInput.trim()) {
            //add_user_message(chatInput.trim());
	    //instead of doing above line will call transcription_cb
	    //this preserves routing to active functions
	    transcription_cb(chatInput.trim()) ; 
            setChatInput('');
        }
    };

    const handleChatKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleChatSend();
        }
    };

    /* Widgets are now imported from separate files */

    // Auto-scroll chat in chat mode
    useEffect(() => {
        if (mode === 'chat' && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chat_history, mode]);

    // Track AI typing state
    useEffect(() => {
        if (chat_history.length > 0) {
            const lastMessage = chat_history[chat_history.length - 1];
            setIsAiTyping(lastMessage.role === 'user');
        }
    }, [chat_history]);

    /*

    // DEBUG: Track event listeners and DOM mutations
    useEffect(() => {
        // Start event listener tracking
        eventListenerTracker.start();
        log('[DEBUG] Event listener tracking started');

        let nodeCount = 0;
        let additionCount = 0;
        let removalCount = 0;
        const startTime = Date.now();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                additionCount += mutation.addedNodes.length;
                removalCount += mutation.removedNodes.length;

                // Log significant additions
                if (mutation.addedNodes.length > 10) {
                    const target = mutation.target as Element;
                    log(`[DOM-DEBUG] Large addition: ${mutation.addedNodes.length} nodes to ${target.tagName}.${target.className}`);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Report every 5 seconds with event listener counts
        const interval = setInterval(() => {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const total = document.getElementsByTagName('*').length;
            const listenerReport = eventListenerTracker.getReport();
            const observerReport = observerTracker.getReport();
            log(`[DOM-DEBUG] t=${elapsed}s | Total nodes: ${total} | +${additionCount} -${removalCount} | Net: ${additionCount - removalCount}`);
            log(`[LISTENER-DEBUG] t=${elapsed}s | Total listeners: ${listenerReport.totalListeners} | By type:`, listenerReport.byType);
            log(`[OBSERVER-DEBUG] t=${elapsed}s | Total observers: ${observerReport.total} | By type:`, observerReport.byType);

            // Warn if observer count is growing
            if (observerReport.total > 20) {
                console.warn(`[LEAK WARNING] ${observerReport.total} observers detected!`);
                observerTracker.printReport();
            }

            additionCount = 0;
            removalCount = 0;
        }, 5000);



        // Expose debug functions globally
        if (typeof window !== 'undefined') {
            // Expose trackers
            (window as any).listenerTracker = eventListenerTracker;
            (window as any).observerTracker = observerTracker;

            (window as any).cortex_dom_snapshot = () => {
                const elements = document.getElementsByTagName('*');
                const counts: { [key: string]: number } = {};
                let totalNodes = elements.length;
                let totalWithShadow = totalNodes;

                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];

                    // Handle className properly (might be SVGAnimatedString)
                    let className = '';
                    if (typeof el.className === 'string') {
                        className = el.className;
                    } else if (el.className && typeof el.className === 'object' && 'baseVal' in el.className) {
                        className = (el.className as any).baseVal;
                    }

                    const key = `${el.tagName}${className ? '.' + className.split(' ')[0] : ''}`;
                    counts[key] = (counts[key] || 0) + 1;

                    // Count shadow DOM nodes
                    if (el.shadowRoot) {
                        const shadowNodes = el.shadowRoot.querySelectorAll('*').length;
                        totalWithShadow += shadowNodes;
                        counts['[SHADOW-DOM]'] = (counts['[SHADOW-DOM]'] || 0) + shadowNodes;
                    }
                }

                const sorted = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 30);

                console.log(`Total DOM nodes: ${totalNodes}`);
                console.log(`Total with Shadow DOM: ${totalWithShadow}`);
                console.log(`Chrome might also count: text nodes, comment nodes, attributes`);
                console.table(sorted.map(([tag, count]) => ({ Element: tag, Count: count })));
                return { totalNodes, totalWithShadow, elements: sorted };
            };

            // Count ALL node types (including text, comments)
            (window as any).cortex_count_all_nodes = () => {
                let count = 0;
                const walk = (node: Node) => {
                    count++;
                    node.childNodes.forEach(child => walk(child));
                    if ((node as any).shadowRoot) {
                        walk((node as any).shadowRoot);
                    }
                };
                walk(document.body);
                console.log(`Total nodes (including text/comments): ${count}`);
                return count;
            };
        }


        return () => {
            observer.disconnect();
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                delete (window as any).cortex_dom_snapshot;
            }
        };
    }, []);

		*/    

    // Memoize renderWidget to prevent grid re-renders
    const memoizedWidgetGrid = useMemo(() => {
        log('[DEBUG] memoizedWidgetGrid recalculating');
        const renderWidget = (widgetId: string) => {
            switch (widgetId) {
                case 'chat':
                    return (
                        <ChatWidget
                            chatHistory={chat_history}
                            onFocus={() => setFocusedWidget('chat')}
                        />
                    );
                case 'chatInput':
                    return (
                        <ChatInputWidget
                            onSubmit={(text) => transcription_cb(text)}
                            onFocus={() => setFocusedWidget('chatInput')}
                        />
                    );
                case 'workspace':
                    return (
                        <WorkspaceWidget
                            workspace={workspace}
                            onFocus={() => setFocusedWidget('workspace')}
                        />
                    );
                case 'thoughts':
                    return (
                        <ThoughtsWidget
                            thoughtHistory={thought_history}
                            onFocus={() => setFocusedWidget('thoughts')}
                        />
                    );
                case 'log':
                    return (
                        <LogWidget
                            logHistory={log_history}
                            onFocus={() => setFocusedWidget('log')}
                        />
                    );
                case 'code':
                    return (
                        <CodeWidget
                            codeParams={code_params}
                            onChange={handle_code_change}
                            onFocus={() => setFocusedWidget('code')}
                        />
                    );
                case 'html':
                    return (
                        <HTMLWidget
                            htmlDisplay={html_display}
                            onFocus={() => setFocusedWidget('html')}
                        />
                    );
                case 'codeExecution':
                    return (
                        <CodeExecutionWidget
                            currentCode={currentExecution?.code || currentCode}
                            executionId={currentExecution?.executionId || executionId}
                            status={currentExecution?.status || executionStatus}
                            error={currentExecution?.error || executionError}
                            duration={currentExecution?.duration || executionDuration}
                            result={currentExecution?.result !== undefined ? currentExecution.result : executionResult}
                            onFocus={() => setFocusedWidget('codeExecution')}
                        />
                    );
                case 'functionCalls':
                    return (
                        <FunctionCallsWidget
                            calls={currentExecution?.functionCalls || functionCalls}
                            onFocus={() => setFocusedWidget('functionCalls')}
                        />
                    );
                case 'variableInspector':
                    return (
                        <VariableInspectorWidget
                            variables={currentExecution?.variableAssignments || variableAssignments}
                            onFocus={() => setFocusedWidget('variableInspector')}
                        />
                    );
                case 'sandboxLogs':
                    return (
                        <SandboxLogsWidget
                            logs={currentExecution?.sandboxLogs || sandboxLogs}
                            onFocus={() => setFocusedWidget('sandboxLogs')}
                        />
                    );
                case 'history':
                    return (
                        <HistoryWidget
                            executions={executionHistory}
                            selectedIndex={selectedIndex}
                            isPinned={isPinned}
                            onSelectExecution={store_handleHistoryItemClick}
                            onTogglePin={() => store_setIsPinned(!isPinned)}
                            onFocus={() => setFocusedWidget('history')}
                        />
                    );
                default:
                    return null;
            }
        };

        return (
            <DraggableWidgetGrid
                visibleWidgets={visibleWidgets}
                initialLayout={widgetLayout}
                onLayoutChange={saveLayout}
                renderWidget={renderWidget}
            />
        );
    }, [
        chat_history,
        thought_history,
        log_history,
        code_params,
        html_display,
        workspace,
        currentExecution,
        currentCode,
        executionId,
        executionStatus,
        executionError,
        executionDuration,
        executionResult,
        functionCalls,
        variableAssignments,
        sandboxLogs,
        executionHistory,
        selectedIndex,
        isPinned,
        visibleWidgets,
        widgetLayout,
        transcription_cb,
        handle_code_change,
        store_handleHistoryItemClick,
        saveLayout
    ]);

    // Note: Chat Mode JSX is inlined directly in the return statement to avoid component recreation issues

    return (
        <>
            {/* Top Bar - Always visible */}
            <TopBar
                mode={mode}
                onModeChange={(newMode) => handleModeChange(newMode)}
                started={started}
                onStartStop={handle_start_stop}
                transcribe={transcribe}
                onTranscribeToggle={handleTranscribeToggle}
                isSpeaking={tivi.isSpeaking}
                onCancelSpeech={() => tivi.cancelSpeech()}
                aiModel={ai_model}
                onModelChange={(model) => store_updateSettings({ aiModel: model })}
                onOpenSettings={() => setSettingsOpen(true)}
                audioLevelRef={tivi.audioLevelRef}
                voiceStatus={voiceStatus}
                interimResult={interim_result}
                contextUsage={contextUsage}
                conversationStarted={executionHistory.length > 0}
            />

            {/* Settings Panel */}
            <SettingsPanel
                widgets={widgets}
                toggleWidget={toggleWidget}
                onApplyPreset={applyPreset}
                onResetLayout={resetLayout}
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                tiviParams={tiviSettings}
                onTiviParamsChange={updateTiviSettings}
                tivi={tivi}
                speechProbRef={tivi.speechProbRef}
                audioLevelRef={tivi.audioLevelRef}
                speechCooldownMs={speechCooldownMs}
                onSpeechCooldownChange={(ms: number) => store_updateSettings({ speechCooldownMs: ms })}
                playbackRate={tiviSettings.playbackRate}
                onPlaybackRateChange={(rate) => updateTiviSettings({ playbackRate: rate })}
                isListening={tivi.isListening}
            />

            {/* Render Chat Mode or Voice Mode */}
            {mode === 'chat' ? (
                // Chat Mode - Inlined directly to avoid component recreation
                <Box
                    sx={{
                        height: '90vh',
			width : "100%",
                        display: 'flex',
                        flexDirection: 'column',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                        position: 'relative',
                    }}
                >
            {/* Chat Header */}
            <Box
                sx={{
                    p: 3,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backdropFilter: 'blur(10px)',
                    background: alpha(theme.palette.primary.main, 0.05),
		    paddingLeft : "75px" 				    
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    Cortex 
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Chat Mode
                </Typography>
            </Box>

            {/* Messages Container */}
            <Box
                ref={chatContainerRef}
                sx={{
                    flex: 1,
		    minWidth : "100%", 
                    overflowY: 'auto',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: alpha(theme.palette.background.paper, 0.5),
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: alpha(theme.palette.primary.main, 0.5),
                        borderRadius: '4px',
                        '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.7),
                        },
                    },
                }}
            >
                {chat_history.slice(1).map((message, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'slideIn 0.3s ease-out',
                            '@keyframes slideIn': {
                                from: {
                                    opacity: 0,
                                    transform: 'translateY(20px)',
                                },
                                to: {
                                    opacity: 1,
                                    transform: 'translateY(0)',
                                },
                            },
                        }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                maxWidth: '90%',
                                p: 2,
                                borderRadius: '16px',
                                background: message.role === 'assistant'
                                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.dark, 0.15)} 100%)`
                                    : `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.dark, 0.15)} 100%)`,
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${alpha(message.role === 'assistant' ? theme.palette.primary.main : theme.palette.secondary.main, 0.3)}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 8px 16px ${alpha(message.role === 'assistant' ? theme.palette.primary.main : theme.palette.secondary.main, 0.2)}`,
                                },
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 'bold',
                                    color: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                                    mb: 1,
                                    display: 'block',
                                }}
                            >
                                {message.role === 'assistant' ? 'Cortex' : 'You'}
                            </Typography>
                            <Box sx={{ padding: '10px' }}>
                                <ReactMarkdown className='line-break'>{message.content}</ReactMarkdown>
                            </Box>
                        </Paper>
                    </Box>
                ))}

                {/* Typing Indicator */}
                {isAiTyping && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 2,
                                borderRadius: '16px',
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.dark, 0.15)} 100%)`,
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: 'primary.main',
                                        animation: 'bounce 1.4s infinite ease-in-out',
                                        animationDelay: '0s',
                                        '@keyframes bounce': {
                                            '0%, 80%, 100%': { transform: 'scale(0)' },
                                            '40%': { transform: 'scale(1)' },
                                        },
                                    }}
                                />
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: 'primary.main',
                                        animation: 'bounce 1.4s infinite ease-in-out',
                                        animationDelay: '0.2s',
                                        '@keyframes bounce': {
                                            '0%, 80%, 100%': { transform: 'scale(0)' },
                                            '40%': { transform: 'scale(1)' },
                                        },
                                    }}
                                />
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: 'primary.main',
                                        animation: 'bounce 1.4s infinite ease-in-out',
                                        animationDelay: '0.4s',
                                        '@keyframes bounce': {
                                            '0%, 80%, 100%': { transform: 'scale(0)' },
                                            '40%': { transform: 'scale(1)' },
                                        },
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <Box
                sx={{
                    p: 3,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backdropFilter: 'blur(10px)',
                    background: alpha(theme.palette.background.paper, 0.9),
                }}
            >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleChatKeyPress}
                        placeholder=""
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '16px',
                                backgroundColor: alpha(theme.palette.background.default, 0.5),
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.background.default, 0.7),
                                },
                                '&.Mui-focused': {
                                    backgroundColor: alpha(theme.palette.background.default, 0.9),
                                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`,
                                },
                            },
                        }}
                    />
                    <IconButton
                        onClick={handleChatSend}
                        disabled={!chatInput.trim()}
                        sx={{
                            borderRadius: '50%',
                            width: 56,
                            height: 56,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            color: 'white',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px) scale(1.05)',
                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                            },
                            '&:disabled': {
                                background: alpha(theme.palette.action.disabled, 0.3),
                                color: alpha(theme.palette.action.disabled, 0.5),
                            },
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Box>
            ) : (
                <Box style={{ height : "100%", flexDirection : 'column' , display : 'flex' , alignItems : 'center' , width : '100%', padding : "5px" }} >

	{/* Voice Status Indicator */}



	<Box flexDirection="column" display='flex' alignItems='start'  width="100%" paddingRight="20px">

	{!focusedWidget && memoizedWidgetGrid}

	</Box>

	<Box style={{flexGrow : 1 , width  : "100%"  }}>

	    	{focusedWidget === 'chat' && (
		    <ChatWidget
			chatHistory={chat_history}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'chatInput' && (
		    <ChatInputWidget
			onSubmit={(text) => transcription_cb(text)}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'workspace' && (
		    <WorkspaceWidget
			workspace={workspace}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'thoughts' && (
		    <ThoughtsWidget
			thoughtHistory={thought_history}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
	    	{focusedWidget === 'log' && (
		    <LogWidget
			logHistory={log_history}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
	    	{focusedWidget === 'code' && (
		    <CodeWidget
			codeParams={code_params}
			onChange={handle_code_change}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}

	    	{focusedWidget === 'html' && (
		    <HTMLWidget
			htmlDisplay={html_display}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'codeExecution' && (
		    <CodeExecutionWidget
			currentCode={currentExecution?.code || currentCode}
			executionId={currentExecution?.executionId || executionId}
			status={currentExecution?.status || executionStatus}
			error={currentExecution?.error || executionError}
			duration={currentExecution?.duration || executionDuration}
			result={currentExecution?.result !== undefined ? currentExecution.result : executionResult}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'functionCalls' && (
		    <FunctionCallsWidget
			calls={currentExecution?.functionCalls || functionCalls}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'variableInspector' && (
		    <VariableInspectorWidget
			variables={currentExecution?.variableAssignments || variableAssignments}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'sandboxLogs' && (
		    <SandboxLogsWidget
			logs={currentExecution?.sandboxLogs || sandboxLogs}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}
		{focusedWidget === 'history' && (
		    <HistoryWidget
			executions={executionHistory}
			selectedIndex={selectedIndex}
			isPinned={isPinned}
			onSelectExecution={store_handleHistoryItemClick}
			onTogglePin={() => store_setIsPinned(!isPinned)}
			fullscreen
			onClose={() => setFocusedWidget(null)}
		    />
		)}


	</Box>





	</Box>
            )}

        </>
    )
}

export default Component ;



async function on_init_audio( transcribeRef : any  , transcription_cb : any, tivi : any): Promise<() => void> {

    /* upgrading to use TIVI */

    //transcript handler
    const handleTranscript = async (e: any) => {
	let transcript = e.detail ;
	log(`Transcribe Ref: ${transcribeRef.current}`) ;


	if (transcribeRef.current) {
	    log(`Transcribing audio`)
	    debug.add("transcript" , transcript) ;
	    log(`Sound event transcription: ${transcript}`)
	    await transcription_cb(transcript)
	} else {
	    log(`NOT Transcribing audio`)
	}
    };

    window.addEventListener( 'tidyscripts_web_speech_recognition_result' , handleTranscript)


    //and finially initialize tivi
    await tivi.startListening()

    // Return cleanup function
    return () => {
	window.removeEventListener('tidyscripts_web_speech_recognition_result', handleTranscript);
    };

}

/* sound_feedback is now from the store (store_sound_feedback) */


/*
   let test_chat = [{"role":"user","content":"Hi, how are you today?"},{"role":"assistant","content":"I'm great, thank you! How about you?"},{"role":"user","content":"I'm doing well, thanks for asking."},{"role":"assistant","content":"Glad to hear that. Anything exciting happening today?"},{"role":"user","content":"Not much, just working on some projects."},{"role":"assistant","content":"Sounds productive. Need any help with them?"},{"role":"user","content":"Not right now, but I appreciate it."},{"role":"assistant","content":"Anytime! Just let me know."},{"role":"user","content":"What do you recommend to take a break?"},{"role":"assistant","content":"Maybe a short walk or a quick meditation session?"}]

   init_chat_history = [...init_chat_history, ...test_chat ] ;
 */
