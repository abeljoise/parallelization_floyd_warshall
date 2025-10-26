import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Clock, Cpu, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FloydWarshallSimulator = () => {
  const [n, setN] = useState(5);
  const [graph, setGraph] = useState([]);
  const [distances, setDistances] = useState([]);
  const [k, setK] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [threads, setThreads] = useState([]);
  const [speed, setSpeed] = useState(800);
  const [iterations, setIterations] = useState(0);
  const [parallelMode, setParallelMode] = useState(true);
  const [numThreads, setNumThreads] = useState(4);
  const [completedThreads, setCompletedThreads] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [sequentialTime, setSequentialTime] = useState(0);
  const [parallelTime, setParallelTime] = useState(0);
  const [speedupHistory, setSpeedupHistory] = useState([]);
  const animationRef = useRef(null);
  const threadAnimationRef = useRef(null);

  const INF = 999;

  useEffect(() => {
    initializeGraph();
  }, [n]);

  const initializeGraph = () => {
    const newGraph = Array(n).fill(0).map((_, i) =>
      Array(n).fill(0).map((_, j) => {
        if (i === j) return 0;
        const hasEdge = Math.random() > 0.3;
        return hasEdge ? Math.floor(Math.random() * 15) + 1 : INF;
      })
    );
    setGraph(newGraph);
    setDistances(newGraph.map(row => [...row]));
    setK(-1);
    setIterations(0);
    setThreads([]);
    setCompletedThreads([]);
    setPerformanceData([]);
    setSequentialTime(0);
    setParallelTime(0);
    setSpeedupHistory([]);
  };

  const processThreadBatch = (allThreads, batchIndex) => {
    if (!parallelMode || batchIndex >= allThreads.length) {
      setThreads([]);
      return;
    }

    const batchSize = numThreads;
    const batch = allThreads.slice(batchIndex, batchIndex + batchSize);
    
    setThreads(batch.map((t, idx) => ({
      ...t,
      threadId: (batchIndex + idx) % numThreads,
      status: 'running',
      progress: 0
    })));

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 20;
      if (progress <= 100) {
        setThreads(prev => prev.map(t => ({ ...t, progress })));
      } else {
        clearInterval(progressInterval);
        setCompletedThreads(prev => [...prev, ...batch]);
        
        threadAnimationRef.current = setTimeout(() => {
          processThreadBatch(allThreads, batchIndex + batchSize);
        }, 100);
      }
    }, speed / 5);
  };

  const step = () => {
    if (k >= n - 1) {
      setIsRunning(false);
      return;
    }

    const nextK = k + 1;
    setK(nextK);

    const newDistances = distances.map(row => [...row]);
    const allThreads = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const oldDist = newDistances[i][j];
          const newDist = newDistances[i][nextK] + newDistances[nextK][j];
          const updated = newDist < oldDist;
          
          allThreads.push({
            i,
            j,
            k: nextK,
            oldDist: oldDist === INF ? '∞' : oldDist,
            newDist: newDist === INF ? '∞' : newDist,
            updated
          });

          if (updated) {
            newDistances[i][j] = newDist;
          }
        }
      }
    }

    setDistances(newDistances);
    setCompletedThreads([]);

    const seqTime = allThreads.length * 10;
    const parTime = Math.ceil(allThreads.length / numThreads) * 10;
    const speedup = seqTime / parTime;

    setSequentialTime(prev => prev + seqTime);
    setParallelTime(prev => prev + parTime);

    setPerformanceData(prev => [...prev, {
      iteration: nextK + 1,
      sequential: seqTime,
      parallel: parTime,
      threads: allThreads.length
    }]);

    setSpeedupHistory(prev => [...prev, {
      iteration: nextK + 1,
      speedup: speedup.toFixed(2),
      efficiency: ((speedup / numThreads) * 100).toFixed(1)
    }]);

    if (parallelMode) {
      processThreadBatch(allThreads, 0);
    } else {
      setThreads(allThreads.map((t, idx) => ({
        ...t,
        threadId: 0,
        status: 'completed',
        progress: 100
      })));
      setCompletedThreads(allThreads);
    }

    setIterations(prev => prev + 1);
  };

  useEffect(() => {
    if (isRunning && k < n - 1) {
      const timeout = parallelMode 
        ? speed + (Math.ceil((n * n - n) / numThreads) * (speed / 5))
        : speed;
      animationRef.current = setTimeout(step, timeout);
    } else if (k >= n - 1) {
      setIsRunning(false);
    }
    return () => {
      clearTimeout(animationRef.current);
      clearTimeout(threadAnimationRef.current);
    };
  }, [isRunning, k, distances, speed, parallelMode, numThreads]);

  const togglePlay = () => {
    if (k >= n - 1) {
      initializeGraph();
      setTimeout(() => setIsRunning(true), 100);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const reset = () => {
    setIsRunning(false);
    clearTimeout(animationRef.current);
    clearTimeout(threadAnimationRef.current);
    initializeGraph();
  };

  const getCellColor = (i, j) => {
    if (k === -1) return 'bg-slate-100';
    if (i === k || j === k) return 'bg-purple-200';
    
    const isActive = threads.some(t => t.i === i && t.j === j);
    if (isActive) return 'bg-emerald-300 animate-pulse';
    
    const isCompleted = completedThreads.some(t => t.i === i && t.j === j && t.updated);
    if (isCompleted) return 'bg-amber-300';
    
    if (distances[i][j] !== graph[i][j]) return 'bg-blue-200';
    return 'bg-slate-100';
  };

  const totalSpeedup = sequentialTime > 0 ? (sequentialTime / parallelTime).toFixed(2) : 0;
  const efficiency = sequentialTime > 0 ? ((totalSpeedup / numThreads) * 100).toFixed(1) : 0;

  const getThreadColor = (threadId) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500'
    ];
    return colors[threadId % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-[1800px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Zap className="text-yellow-400" size={40} />
            Floyd-Warshall Parallelization Analysis
          </h1>
          <p className="text-slate-300">Interactive visualization with detailed thread execution and performance metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="text-blue-400" size={18} />
                Iteration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{k + 1} / {n}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Cpu className="text-emerald-400" size={18} />
                Active Threads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400">{threads.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingUp className="text-yellow-400" size={18} />
                Speedup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{totalSpeedup}x</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="text-pink-400" size={18} />
                Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-400">{efficiency}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg text-sm"
                >
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  {isRunning ? 'Pause' : k >= n - 1 ? 'Restart' : 'Start'}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg text-sm"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-xs font-medium mb-1 block">
                    Graph Size: {n}x{n}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    value={n}
                    onChange={(e) => {
                      setN(parseInt(e.target.value));
                      setIsRunning(false);
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-white text-xs font-medium mb-1 block">
                    Animation Speed: {speed}ms
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-white text-xs font-medium mb-1 block">
                    Number of Threads: {numThreads}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={numThreads}
                    onChange={(e) => setNumThreads(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => setParallelMode(!parallelMode)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      parallelMode
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Parallel Mode: {parallelMode ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Thread Execution Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {threads.length === 0 && completedThreads.length === 0 && (
                  <div className="text-slate-400 text-sm text-center py-4">
                    No active threads. Start the simulation to see thread execution.
                  </div>
                )}
                {threads.map((thread, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getThreadColor(thread.threadId)}`}></div>
                        <span className="text-white text-xs font-medium">
                          Thread {thread.threadId}: d[{thread.i}][{thread.j}]
                        </span>
                      </div>
                      <span className="text-xs text-slate-300">{thread.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getThreadColor(thread.threadId)} transition-all duration-300`}
                        style={{ width: `${thread.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {thread.oldDist} → {thread.newDist} via vertex {thread.k}
                    </div>
                  </div>
                ))}
                {threads.length === 0 && completedThreads.length > 0 && (
                  <div className="text-emerald-400 text-sm text-center py-2">
                    ✓ Batch completed: {completedThreads.length} operations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <Card className="bg-white/10 backdrop-blur border-white/20 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white text-lg">Distance Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n + 1}, minmax(0, 1fr))` }}>
                    <div className="w-10 h-10"></div>
                    {Array(n).fill(0).map((_, j) => (
                      <div
                        key={`header-${j}`}
                        className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-white font-bold text-xs"
                      >
                        {j}
                      </div>
                    ))}
                    
                    {distances.map((row, i) => (
                      <React.Fragment key={i}>
                        <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-white font-bold text-xs">
                          {i}
                        </div>
                        {row.map((val, j) => (
                          <div
                            key={`${i}-${j}`}
                            className={`w-10 h-10 ${getCellColor(i, j)} rounded flex items-center justify-center font-semibold text-xs transition-all duration-300 border border-slate-400/30`}
                          >
                            {val === INF ? '∞' : val}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-200 rounded"></div>
                  <span className="text-white text-xs">k vertex</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-300 rounded"></div>
                  <span className="text-white text-xs">Computing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-300 rounded"></div>
                  <span className="text-white text-xs">Just updated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 rounded"></div>
                  <span className="text-white text-xs">Updated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-100 rounded"></div>
                  <span className="text-white text-xs">Original</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Sequential Time</div>
                  <div className="text-2xl font-bold text-blue-400">{sequentialTime}ms</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Parallel Time</div>
                  <div className="text-2xl font-bold text-emerald-400">{parallelTime}ms</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Time Saved</div>
                  <div className="text-2xl font-bold text-yellow-400">{sequentialTime - parallelTime}ms</div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-400/30">
                  <div className="text-slate-300 text-xs mb-1">Overall Speedup</div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {totalSpeedup}x
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Speedup Over Iterations</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={speedupHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="iteration" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="speedup" stroke="#eab308" strokeWidth={3} name="Speedup (x)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Execution Time Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="iteration" stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                  <Bar dataKey="sequential" fill="#3b82f6" name="Sequential (ms)" />
                  <Bar dataKey="parallel" fill="#10b981" name="Parallel (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Alert className="mt-4 bg-blue-500/20 border-blue-400/50">
          <AlertDescription className="text-white text-sm">
            <strong>How it works:</strong> The Floyd-Warshall algorithm computes shortest paths between all vertex pairs. 
            In parallel mode, computations for each intermediate vertex k are distributed across {numThreads} threads. 
            Watch the thread monitor to see individual operations, and observe the speedup graphs showing performance gains from parallelization!
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default FloydWarshallSimulator;