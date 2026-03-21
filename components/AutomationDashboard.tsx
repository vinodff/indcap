import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Zap, MessageCircle, Bot, Activity, Play, Pause, Send, User, ChevronRight, Terminal, AlertTriangle, AlertOctagon, BarChart3, PieChart, Users, TrendingUp, Filter, Lightbulb, MousePointerClick, Sparkles } from 'lucide-react';
import { subscribeToSimulation, simulateIncomingComment, simulateStoryReply, simulateFollow, triggerPlatformError } from '../services/automationSimulationService';
import { AutomationLog, SimulationStats, LogStatus, HealthStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, TooltipProps } from 'recharts';

interface Props {
  onClose: () => void;
}

const AutomationDashboard: React.FC<Props> = ({ onClose }) => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'ANALYTICS'>('LIVE');
  const [testComment, setTestComment] = useState('');
  const [simUser, setSimUser] = useState('fan_user_99');

  useEffect(() => {
    const unsubscribe = subscribeToSimulation((newLogs, newStats) => {
      setLogs(newLogs);
      setStats(newStats);
    });
    return unsubscribe;
  }, []);

  const handleSimulate = async (type: 'COMMENT' | 'STORY' | 'FOLLOW') => {
      if (type === 'COMMENT' && !testComment) return;
      const user = simUser || `user_${Math.floor(Math.random()*1000)}`;
      if (type === 'COMMENT') {
          await simulateIncomingComment(user, testComment);
          setTestComment('');
      } else if (type === 'STORY') {
          await simulateStoryReply(user, "🔥 This is fire!");
      } else if (type === 'FOLLOW') {
          await simulateFollow(user);
      }
  };

  const getStatusColor = (status: LogStatus) => {
      switch (status) {
          case 'RECEIVED': return 'text-blue-400';
          case 'PROCESSING': return 'text-yellow-400';
          case 'SENT': return 'text-green-400';
          case 'SKIPPED': return 'text-gray-500';
          case 'ERROR': return 'text-red-500';
          default: return 'text-gray-400';
      }
  };
  
  const getHealthBadge = (status: HealthStatus) => {
      switch (status) {
          case 'HEALTHY': return <div className="flex items-center gap-1 text-green-500 font-bold bg-green-500/20 px-2 py-0.5 rounded text-[10px] border border-green-500/30"><ShieldCheck size={12}/> SAFE</div>;
          case 'WARNING': return <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/20 px-2 py-0.5 rounded text-[10px] border border-yellow-500/30"><AlertTriangle size={12}/> CAUTION</div>;
          case 'COOLDOWN': return <div className="flex items-center gap-1 text-red-500 font-bold bg-red-500/20 px-2 py-0.5 rounded text-[10px] animate-pulse border border-red-500/30"><AlertOctagon size={12}/> COOLDOWN</div>;
          case 'PAUSED': return <div className="flex items-center gap-1 text-gray-500 font-bold bg-gray-500/20 px-2 py-0.5 rounded text-[10px] border border-gray-500/30"><Pause size={12}/> PAUSED</div>;
      }
  };

  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#050505] flex flex-col animate-in slide-in-from-bottom-10 duration-300 font-sans text-gray-200">
      
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center border border-green-500/30">
                      <Activity size={18} className="text-green-500" />
                  </div>
                  <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">Automation Hub</h2>
                      <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-[10px] text-gray-400">System Online</span>
                      </div>
                  </div>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-[#161616] p-1 rounded-lg border border-gray-800">
                  <button onClick={() => setActiveTab('LIVE')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'LIVE' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Live Console</button>
                  <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'ANALYTICS' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Analytics Report</button>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
              {getHealthBadge(stats.healthStatus)}
              <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505] p-6">
              
              {/* LIVE CONSOLE VIEW */}
              {activeTab === 'LIVE' && (
                  <div className="flex flex-col h-full gap-6">
                      {/* Metric Summary */}
                      <div className="grid grid-cols-4 gap-4">
                          <MetricCard label="Comments Detected" value={stats.commentsDetected} icon={<MessageCircle size={16} className="text-blue-500"/>} />
                          <MetricCard label="DMs Sent" value={stats.dmsSent} icon={<Send size={16} className="text-green-500"/>} />
                          <MetricCard label="Spam Blocked" value={stats.spamBlocked} icon={<ShieldCheck size={16} className="text-red-500"/>} />
                          <MetricCard label="Replies" value={stats.repliesReceived} icon={<Zap size={16} className="text-yellow-500"/>} />
                      </div>

                      {/* Console Logs */}
                      <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
                          <div className="p-3 border-b border-gray-800 bg-[#101010] flex justify-between items-center">
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                  <Terminal size={14} /> System Logs
                              </div>
                              <span className="text-[10px] text-gray-600 font-mono">Real-time</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                              {logs.length === 0 && (
                                  <div className="text-center text-gray-600 mt-20">
                                      <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                                      <p>Waiting for events...</p>
                                  </div>
                              )}
                              {logs.map(log => (
                                  <div key={log.id} className="flex gap-3 p-2 hover:bg-white/5 rounded border border-transparent hover:border-white/5 transition-colors group">
                                      <span className="text-gray-600 min-w-[60px]">{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                      <div className="flex-1 space-y-1">
                                          <div className="flex items-center gap-2">
                                              <span className={`font-bold ${getStatusColor(log.status)}`}>{log.status}</span>
                                              <span className="text-gray-400">[{log.type}]</span>
                                              <span className="text-gray-300">User: <span className="text-white font-bold">{log.user}</span></span>
                                          </div>
                                          <div className="text-gray-500 pl-4 border-l border-gray-800">
                                              {log.content && <div className="text-gray-300 italic">"{log.content}"</div>}
                                              <div>{log.details}</div>
                                              {log.actionTaken && (
                                                  <div className="mt-1 p-2 bg-green-900/20 border border-green-500/30 rounded text-green-300">
                                                      <span className="font-bold">Action:</span> {log.actionTaken}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* ANALYTICS VIEW */}
              {activeTab === 'ANALYTICS' && (
                  <div className="space-y-6 max-w-5xl mx-auto">
                      
                      {/* Top Row: Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <AnalyticsCard 
                             title="Reply Rate" 
                             value={`${stats.analytics.replyRate}%`} 
                             trend="+2.4%" 
                             trendUp={true}
                             icon={<TrendingUp size={18} className="text-green-500"/>}
                          />
                          <AnalyticsCard 
                             title="Active Conversations" 
                             value={stats.repliesReceived} 
                             subtext={`${stats.dmsSent} DMs Sent`}
                             icon={<Users size={18} className="text-blue-500"/>}
                          />
                          <AnalyticsCard 
                             title="Link Clicks (Est)" 
                             value={stats.analytics.funnel.clicks}
                             trend="High Intent"
                             trendUp={true} 
                             icon={<MousePointerClick size={18} className="text-purple-500"/>}
                          />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Chart: Performance Trend */}
                          <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                              <div className="flex justify-between items-center mb-6">
                                  <div>
                                      <h3 className="text-sm font-bold text-white">Performance Trend</h3>
                                      <p className="text-xs text-gray-500">DMs sent vs Replies (Last 7 Days)</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div> DMs</div>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-green-500"></div> Replies</div>
                                  </div>
                              </div>
                              <div className="h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={stats.analytics.dailyHistory}>
                                          <defs>
                                              <linearGradient id="colorDms" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                              </linearGradient>
                                              <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                              </linearGradient>
                                          </defs>
                                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                                          <Tooltip content={<CustomTooltip />} />
                                          <Area type="monotone" dataKey="dmsSent" stroke="#3B82F6" fillOpacity={1} fill="url(#colorDms)" strokeWidth={2} />
                                          <Area type="monotone" dataKey="replies" stroke="#22C55E" fillOpacity={1} fill="url(#colorReplies)" strokeWidth={2} />
                                      </AreaChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>

                          {/* Funnel */}
                          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                              <h3 className="text-sm font-bold text-white mb-6">Conversion Funnel</h3>
                              <div className="space-y-4">
                                  <FunnelStep label="Comments" value={stats.analytics.funnel.comments} color="bg-gray-700" width="100%" />
                                  <div className="flex justify-center"><ChevronRight className="rotate-90 text-gray-700" size={16}/></div>
                                  <FunnelStep label="DMs Sent" value={stats.analytics.funnel.dmsSent} color="bg-blue-600" width="80%" />
                                  <div className="flex justify-center"><ChevronRight className="rotate-90 text-gray-700" size={16}/></div>
                                  <FunnelStep label="Replies" value={stats.analytics.funnel.replies} color="bg-green-600" width="40%" />
                                  <div className="flex justify-center"><ChevronRight className="rotate-90 text-gray-700" size={16}/></div>
                                  <FunnelStep label="Link Clicks" value={stats.analytics.funnel.clicks} color="bg-purple-600" width="20%" />
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Trigger Performance */}
                          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                              <h3 className="text-sm font-bold text-white mb-1">Trigger Effectiveness</h3>
                              <p className="text-xs text-gray-500 mb-6">Which strategy gets more replies?</p>
                              
                              <div className="space-y-4">
                                  {stats.analytics.triggerPerformance.map((t, idx) => (
                                      <div key={idx} className="flex items-center gap-4">
                                          <div className="w-24 text-xs font-bold text-gray-400 uppercase">{t.type.replace('_', ' ')}</div>
                                          <div className="flex-1">
                                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                  <div className="h-full bg-blue-500 rounded-full" style={{width: `${t.conversionRate}%`}}></div>
                                              </div>
                                          </div>
                                          <div className="w-12 text-xs font-bold text-white text-right">{t.conversionRate}%</div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Smart Insights */}
                          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <Lightbulb size={120} />
                              </div>
                              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-4">
                                  <Sparkles size={14} /> AI Smart Insights
                              </h3>
                              <div className="space-y-3">
                                  <InsightItem text="AI Intent triggers are converting 15% better than Keywords." positive={true} />
                                  <InsightItem text="Reply rate peaks between 6PM - 9PM." positive={true} />
                                  <InsightItem text="Consider asking a question in DMs to boost replies." positive={false} />
                              </div>
                          </div>

                      </div>
                  </div>
              )}

          </div>

          {/* RIGHT SIDEBAR: CONTROLS & HEALTH (Always Visible) */}
          <div className="w-[300px] bg-[#0a0a0a] border-l border-gray-800 flex flex-col p-6 shadow-xl z-10">
              
              {/* Health Panel */}
              <div className="mb-8">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldCheck size={12} /> Account Health
                  </h3>
                  <div className="bg-[#101010] border border-gray-800 rounded-xl p-4 space-y-4">
                       <div className="flex justify-between items-center">
                           <span className="text-xs text-gray-400">Hourly Limit</span>
                           <span className="text-xs font-mono font-bold text-white">{stats.hourlyUsage} / 30</span>
                       </div>
                       <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                           <div className={`h-full ${stats.hourlyUsage > 25 ? 'bg-red-500' : 'bg-green-500'} transition-all`} style={{width: `${Math.min(stats.hourlyUsage * 3.3, 100)}%`}}></div>
                       </div>
                       
                       <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                           <span className="text-xs text-gray-400">Daily Limit</span>
                           <span className="text-xs font-mono font-bold text-white">{stats.dailyUsage} / 100</span>
                       </div>
                       <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                           <div className={`h-full ${stats.dailyUsage > 80 ? 'bg-red-500' : 'bg-green-500'} transition-all`} style={{width: `${Math.min(stats.dailyUsage, 100)}%`}}></div>
                       </div>
                  </div>
              </div>

              {/* Simulation Controls */}
              <div className="flex-1">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Play size={12} className="text-purple-500" /> Simulator
                  </h3>

                  <div className="space-y-4">
                      {/* User Config */}
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Simulate As</label>
                          <div className="flex items-center bg-black border border-gray-800 rounded-lg px-3 py-2">
                              <User size={14} className="text-gray-500 mr-2" />
                              <input 
                                type="text" 
                                value={simUser} 
                                onChange={e => setSimUser(e.target.value)}
                                className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-700"
                                placeholder="username"
                              />
                          </div>
                      </div>

                      {/* Trigger: Comment */}
                      <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-white">
                              <MessageCircle size={14} className="text-blue-500" /> New Comment
                          </div>
                          <textarea 
                            value={testComment}
                            onChange={e => setTestComment(e.target.value)}
                            className="w-full h-16 bg-black border border-gray-800 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                            placeholder="Type comment..."
                          />
                          <button 
                            onClick={() => handleSimulate('COMMENT')}
                            disabled={!testComment}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                             Trigger Event <ChevronRight size={12} />
                          </button>
                          <div className="flex gap-2 justify-center">
                              <button onClick={() => setTestComment("Link pls!")} className="text-[9px] px-2 py-1 bg-gray-800 rounded text-gray-400 hover:text-white">"Link"</button>
                              <button onClick={() => setTestComment("Cheap likes here")} className="text-[9px] px-2 py-1 bg-gray-800 rounded text-gray-400 hover:text-white">Spam</button>
                          </div>
                      </div>

                      {/* Other Triggers */}
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleSimulate('STORY')} className="p-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-1 transition-all">
                              <Zap size={16} className="text-yellow-500" />
                              <span className="text-[9px] font-bold text-gray-300">Story Reply</span>
                          </button>
                          <button onClick={() => handleSimulate('FOLLOW')} className="p-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-1 transition-all">
                              <Bot size={16} className="text-purple-500" />
                              <span className="text-[9px] font-bold text-gray-300">Follow</span>
                          </button>
                      </div>
                  </div>
              </div>

              {/* Footer Controls */}
              <div className="pt-6 border-t border-gray-800 mt-auto">
                 <button 
                    onClick={() => triggerPlatformError()}
                    className="w-full p-2 bg-red-900/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                 >
                     <AlertTriangle size={12} /> Simulate Error (429)
                 </button>
              </div>

          </div>

      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const MetricCard = ({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) => (
    <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="text-2xl font-black text-white">{value}</span>
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
);

const AnalyticsCard = ({ title, value, subtext, trend, trendUp, icon }: { title: string, value: string | number, subtext?: string, trend?: string, trendUp?: boolean, icon: React.ReactNode }) => (
    <div className="bg-[#0a0a0a] border border-gray-800 p-5 rounded-xl">
        <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-gray-900 rounded-lg">{icon}</div>
            {trend && (
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {trend}
                </div>
            )}
        </div>
        <h3 className="text-2xl font-black text-white">{value}</h3>
        <p className="text-xs font-bold text-gray-500 uppercase mt-1">{title}</p>
        {subtext && <p className="text-[10px] text-gray-600 mt-2">{subtext}</p>}
    </div>
);

const FunnelStep = ({ label, value, color, width }: { label: string, value: number, color: string, width: string }) => (
    <div className="w-full">
        <div className="flex justify-between text-xs mb-1 px-1">
            <span className="text-gray-400 font-medium">{label}</span>
            <span className="text-white font-bold">{value}</span>
        </div>
        <div className="h-8 bg-gray-900 rounded-lg overflow-hidden mx-auto" style={{width: width}}>
            <div className={`h-full ${color} opacity-80`}></div>
        </div>
    </div>
);

const InsightItem = ({ text, positive }: { text: string, positive: boolean }) => (
    <div className="flex gap-3 items-start">
        <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${positive ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
        <p className="text-xs text-indigo-200 leading-relaxed">{text}</p>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg shadow-xl">
                <p className="text-xs font-bold text-white mb-2">{label}</p>
                <p className="text-xs text-blue-400">DMs: {payload[0].value}</p>
                <p className="text-xs text-green-400">Replies: {payload[1].value}</p>
            </div>
        );
    }
    return null;
};

export default AutomationDashboard;