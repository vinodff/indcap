import { InstagramAutomationConfig, AutomationLog, LogStatus, LogType, SimulationStats, Caption, IGAccountType, HealthStatus, AnalyticsData, DailyMetric } from '../types';
import { generateInstagramDm, analyzeCommentIntent } from './geminiService';

// --- IN-MEMORY MOCK DATABASE ---
let activeConfig: InstagramAutomationConfig | null = null;
let activeCaptions: Caption[] = [];
let logs: AutomationLog[] = [];
let messagedUsers = new Set<string>(); // Persist who we DM'd to avoid dupes

// --- SAFETY TRACKERS ---
let hourlyCounter = 0;
let dailyCounter = 0;
let lastHourReset = Date.now();
let lastDayReset = Date.now();
let consecutiveErrors = 0;
let cooldownEndTime = 0;

let stats: SimulationStats = {
  commentsDetected: 0,
  dmsSent: 0,
  repliesReceived: 0,
  spamBlocked: 0,
  healthStatus: 'HEALTHY',
  hourlyUsage: 0,
  dailyUsage: 0,
  analytics: {
      replyRate: 0,
      funnel: { comments: 0, dmsSent: 0, replies: 0, clicks: 0 },
      dailyHistory: [],
      triggerPerformance: []
  }
};
let subscribers: ((logs: AutomationLog[], stats: SimulationStats) => void)[] = [];

// --- CONSTANTS ---
const BOT_USERNAMES = ['bot_123', 'cheap_likes', 'crypto_king'];

// --- PUBLIC METHODS ---

export const activateAutomation = (config: InstagramAutomationConfig, captions: Caption[]) => {
  activeConfig = config;
  activeCaptions = captions;
  
  // Reset session stats (but keep logs for history if needed, though usually better to clear)
  logs = []; 
  hourlyCounter = 0;
  dailyCounter = 0;
  messagedUsers.clear();
  
  // Generate Mock Analytics for "History"
  const mockHistory = generateMockHistory();
  const initialAnalytics: AnalyticsData = {
      replyRate: 24,
      funnel: { comments: 145, dmsSent: 120, replies: 29, clicks: 12 },
      dailyHistory: mockHistory,
      triggerPerformance: [
          { type: 'AI_INTENT', count: 85, conversionRate: 32 },
          { type: 'KEYWORDS', count: 45, conversionRate: 18 },
          { type: 'ANY', count: 15, conversionRate: 5 }
      ]
  };

  stats = { 
      commentsDetected: 0, 
      dmsSent: 0, 
      repliesReceived: 0, 
      spamBlocked: 0,
      healthStatus: 'HEALTHY',
      hourlyUsage: 0,
      dailyUsage: 0,
      analytics: initialAnalytics
  };
  
  const typeMsg = config.accountType === 'PERSONAL' ? 'WARNING: Personal Account Limits Applied' : `Account Type: ${config.accountType}`;
  addLog('SYSTEM', 'System', 'Automation Activated', 'RECEIVED', `Configuration loaded. ${typeMsg}`);
  
  if (config.accountType === 'PERSONAL') {
      addLog('HEALTH', 'System', 'Risk Detected', 'SKIPPED', 'Personal accounts have very high risk. Automation effectively disabled.');
      updateHealth('PAUSED');
  }

  notifySubscribers();
};

export const subscribeToSimulation = (callback: (logs: AutomationLog[], stats: SimulationStats) => void) => {
  subscribers.push(callback);
  callback(logs, stats); // Initial emission
  return () => {
    subscribers = subscribers.filter(s => s !== callback);
  };
};

export const triggerPlatformError = () => {
    // Manually trigger an error to test safety mechanism
    consecutiveErrors++;
    addLog('HEALTH', 'Instagram API', 'Rate Limit 429', 'ERROR', 'Platform reported too many requests.');
    checkCompliance('SYSTEM'); // This will trigger cooldown
    notifySubscribers();
};

// --- SIMULATION TRIGGER ENTRY POINTS (Webhooks) ---

export const simulateIncomingComment = async (username: string, text: string) => {
  if (!activeConfig || !activeConfig.enabled || !activeConfig.comment.enabled) return;

  stats.commentsDetected++;
  stats.analytics.funnel.comments++;
  updateAnalytics();
  addLog('COMMENT', username, text, 'RECEIVED', 'Webhook received.');
  
  // 1. COMPLIANCE & SAFETY CHECK
  const compliance = checkCompliance(username);
  if (!compliance.allowed) {
      addLog('COMMENT', username, undefined, 'SKIPPED', `Compliance Block: ${compliance.reason}`);
      notifySubscribers();
      return;
  }

  // 2. DECISION ENGINE
  await processCommentDecision(username, text);
};

export const simulateStoryReply = async (username: string, text: string) => {
    if (!activeConfig || !activeConfig.enabled || !activeConfig.story.enabled) return;
    
    addLog('STORY_REPLY', username, text, 'RECEIVED', 'Webhook received.');
    
    const compliance = checkCompliance(username);
    if (!compliance.allowed) {
        addLog('STORY_REPLY', username, undefined, 'SKIPPED', `Compliance Block: ${compliance.reason}`);
        notifySubscribers();
        return;
    }
    
    // Simple decision for story: Always reply if enabled
    const replyText = activeConfig.story.dmMode === 'AI_SMART' 
        ? await generateInstagramDm(activeCaptions, 'STORY')
        : activeConfig.story.messageTemplate;
        
    scheduleAction(username, replyText, 'DM Sent (Story Reply)');
};

export const simulateFollow = async (username: string) => {
    if (!activeConfig || !activeConfig.enabled || !activeConfig.welcome.enabled) return;
    
    addLog('WELCOME', username, 'New Follower', 'RECEIVED', 'Webhook received.');

    const compliance = checkCompliance(username);
    if (!compliance.allowed) {
        addLog('WELCOME', username, undefined, 'SKIPPED', `Compliance Block: ${compliance.reason}`);
        notifySubscribers();
        return;
    }
    
    const replyText = activeConfig.welcome.dmMode === 'AI_SMART' 
        ? await generateInstagramDm(activeCaptions, 'WELCOME')
        : activeConfig.welcome.messageTemplate;
        
    scheduleAction(username, replyText, 'Welcome DM Sent');
};

// --- COMPLIANCE ENGINE ---

const checkCompliance = (username: string): { allowed: boolean; reason?: string } => {
    if (!activeConfig) return { allowed: false, reason: "No config" };
    
    // 0. Emergency Cooldown Check
    if (Date.now() < cooldownEndTime) {
        return { allowed: false, reason: "System in Cooldown Mode (Safety Pause)" };
    }

    // 1. Platform Error Circuit Breaker
    if (consecutiveErrors >= 2) {
        triggerCooldown(120); // 2 mins pause
        return { allowed: false, reason: "Too many platform errors. Pausing." };
    }

    // 2. Account Type Restrictions
    if (activeConfig.accountType === 'PERSONAL') {
        return { allowed: false, reason: "Automation unsafe for Personal Accounts." };
    }

    // 3. User Filtering
    if (BOT_USERNAMES.includes(username)) {
        stats.spamBlocked++;
        return { allowed: false, reason: "Bot/Spam account detected." };
    }

    // 4. Duplicate Check
    if (activeConfig.safety.avoidDuplicates && messagedUsers.has(username)) {
        return { allowed: false, reason: "User already messaged." };
    }

    // 5. Rate Limiting (Hourly)
    // Reset hour if passed
    if (Date.now() - lastHourReset > 3600000) {
        hourlyCounter = 0;
        lastHourReset = Date.now();
    }
    if (hourlyCounter >= activeConfig.safety.maxDmsPerHour) {
        updateHealth('WARNING');
        return { allowed: false, reason: `Hourly limit reached (${activeConfig.safety.maxDmsPerHour})` };
    }

    // 6. Rate Limiting (Daily)
    if (Date.now() - lastDayReset > 86400000) {
        dailyCounter = 0;
        lastDayReset = Date.now();
    }
    if (dailyCounter >= activeConfig.safety.maxDmsPerDay) {
        updateHealth('WARNING');
        return { allowed: false, reason: `Daily limit reached (${activeConfig.safety.maxDmsPerDay})` };
    }

    updateHealth('HEALTHY');
    return { allowed: true };
};

const triggerCooldown = (seconds: number) => {
    cooldownEndTime = Date.now() + (seconds * 1000);
    updateHealth('COOLDOWN');
    addLog('HEALTH', 'Safety Engine', `Paused for ${seconds}s`, 'ERROR', 'Entered Cooldown Mode to protect account.');
};

const updateHealth = (status: HealthStatus) => {
    stats.healthStatus = status;
};

// --- INTERNAL LOGIC ---

const processCommentDecision = async (username: string, text: string) => {
    if (!activeConfig) return;

    // A. Keyword Match
    if (activeConfig.comment.triggerType === 'KEYWORDS') {
        const hasKeyword = activeConfig.comment.keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
        if (!hasKeyword) {
            addLog('COMMENT', username, undefined, 'SKIPPED', 'Decision: No matching keywords found.');
            notifySubscribers();
            return;
        }
        addLog('COMMENT', username, undefined, 'PROCESSING', 'Decision: Keyword matched. Preparing DM...');
    }
    // B. AI Intent Match
    else if (activeConfig.comment.triggerType === 'AI_INTENT') {
        addLog('COMMENT', username, undefined, 'PROCESSING', 'AI analyzing intent...');
        notifySubscribers();
        
        const context = activeCaptions.map(c => c.text).join(' ');
        const analysis = await analyzeCommentIntent(text, context);
        
        if (analysis.intent === 'SPAM' || analysis.intent === 'NEUTRAL' || analysis.confidence < 70) {
            stats.spamBlocked++;
            addLog('COMMENT', username, undefined, 'SKIPPED', `AI Decision: Ignored (${analysis.intent}, ${analysis.confidence}%)`);
            notifySubscribers();
            return;
        }
         addLog('COMMENT', username, undefined, 'PROCESSING', `AI Decision: Valid intent (${analysis.intent}). Generating DM...`);
    }

    // C. Generate Response
    let responseText = activeConfig.comment.messageTemplate;
    if (activeConfig.comment.dmMode === 'AI_SMART') {
        responseText = await generateInstagramDm(activeCaptions, 'COMMENT', activeConfig.comment.triggerType === 'KEYWORDS' ? 'KEYWORDS' : 'AI_INTENT');
    }

    // D. Schedule Action (Safety Delay)
    scheduleAction(username, responseText, 'DM Sent (Comment Match)', activeConfig.comment.delay);
};

const scheduleAction = (username: string, message: string, actionLabel: string, delaySetting: string = 'RANDOM') => {
    let delayMs = 2000;
    if (delaySetting === 'INSTANT') delayMs = 500;
    if (delaySetting === '10S') delayMs = 10000;
    if (delaySetting === '30S') delayMs = 30000;
    if (delaySetting === '1MIN') delayMs = 60000;
    if (delaySetting === 'RANDOM') delayMs = Math.floor(Math.random() * (15000 - 5000) + 5000); // 5-15s

    setTimeout(() => {
        // Re-check compliance just before sending (in case limits hit during delay)
        if (checkCompliance(username).allowed) {
            // Execute Action
            stats.dmsSent++;
            stats.analytics.funnel.dmsSent++;
            hourlyCounter++;
            dailyCounter++;
            stats.hourlyUsage = hourlyCounter;
            stats.dailyUsage = dailyCounter;
            
            // Simulate Reply Chance (30%)
            if (Math.random() > 0.7) {
                setTimeout(() => {
                    stats.repliesReceived++;
                    stats.analytics.funnel.replies++;
                    addLog('COMMENT', username, "Thanks!", 'RECEIVED', 'User replied to DM.');
                    updateAnalytics();
                    notifySubscribers();
                }, 5000);
            }
            
            updateAnalytics();
            messagedUsers.add(username);
            consecutiveErrors = 0; // Reset error streak on success

            addLog('SYSTEM', username, message, 'SENT', actionLabel, message);
        } else {
            addLog('SYSTEM', username, undefined, 'SKIPPED', 'Limit hit during queue time.');
        }
        notifySubscribers();
    }, delayMs);
};

const addLog = (type: LogType, user: string, content: string | undefined, status: LogStatus, details: string, actionTaken?: string) => {
    const newLog: AutomationLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type,
        user,
        content,
        status,
        details,
        actionTaken
    };
    logs.unshift(newLog); // Newest first
    // Limit log size
    if (logs.length > 50) logs.pop();
};

const updateAnalytics = () => {
    const sent = stats.analytics.funnel.dmsSent;
    const replies = stats.analytics.funnel.replies;
    stats.analytics.replyRate = sent > 0 ? Math.round((replies / sent) * 100) : 0;
};

const generateMockHistory = (): DailyMetric[] => {
    const history: DailyMetric[] = [];
    const now = new Date();
    for(let i=6; i>=0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        // Random data trend
        const sent = 40 + Math.floor(Math.random() * 30);
        const rep = Math.floor(sent * (0.2 + Math.random() * 0.2));
        history.push({
            date: d.toLocaleDateString('en-US', {weekday: 'short'}),
            dmsSent: sent,
            replies: rep
        });
    }
    return history;
};

const notifySubscribers = () => {
    subscribers.forEach(cb => cb([...logs], {...stats}));
};