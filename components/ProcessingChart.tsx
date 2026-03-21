import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ProcessingStats } from '../types';

interface Props {
  stats: ProcessingStats;
}

const ProcessingChart: React.FC<Props> = ({ stats }) => {
  const data = [
    { name: 'Confidence', value: stats.confidenceScore, fullMark: 100 },
    { name: 'Word Density', value: Math.min(stats.wordCount, 100), fullMark: 100 }, // Normalize for visuals
  ];

  return (
    <div className="h-40 w-full mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">AI Analysis</h4>
      <div className="flex gap-4">
        <div className="w-1/2 h-24">
             <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#9ca3af'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '12px' }} 
                itemStyle={{ color: '#e5e7eb' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#60A5FA' : '#34D399'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/2 flex flex-col justify-center space-y-2 text-xs">
           <div className="flex justify-between">
              <span className="text-gray-400">Detected Language:</span>
              <span className="font-bold text-white">{stats.languageDetected}</span>
           </div>
           <div className="flex justify-between">
              <span className="text-gray-400">Word Count:</span>
              <span className="font-bold text-white">{stats.wordCount}</span>
           </div>
           <div className="flex justify-between">
              <span className="text-gray-400">Proc. Time:</span>
              <span className="font-bold text-white">{(stats.transcriptionTime / 1000).toFixed(1)}s</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingChart;
