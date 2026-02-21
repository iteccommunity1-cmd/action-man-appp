import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    Activity, CheckCircle2, Target, BarChart2, TrendingUp, Users, Clock, AlertCircle, Download, Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { exportAnalyticsToPdf } from '@/utils/analyticsPdfExport';

const Analytics = () => {
    const { data, isLoading, error } = useAnalyticsData();
    const [exportingCard, setExportingCard] = useState<string | null>(null);

    const handleExport = async (cardTitle: string, headers: string[], rowData: (string | number)[][], filename: string) => {
        setExportingCard(cardTitle);
        try {
            await exportAnalyticsToPdf(cardTitle, headers, rowData, filename);
        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setExportingCard(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-2xl glass-card border-none" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton className="h-[400px] rounded-2xl glass-card border-none" />
                    <Skeleton className="h-[400px] rounded-2xl glass-card border-none" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] glass-card">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-bold">Failed to load analytics</h2>
                <p className="text-muted-foreground">{(error as Error).message}</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
                    <BarChart2 className="h-8 w-8 text-primary" />
                    Project Analytics
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">Real-time performance insights for Action Man workspace.</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</p>
                                <div className="text-3xl font-black text-foreground">{data.overviewStats.totalTasks}</div>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-xl">
                                <Activity className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Completion Rate</p>
                                <div className="text-3xl font-black text-emerald-500">{data.overviewStats.completionRate}%</div>
                            </div>
                            <div className="bg-emerald-500/10 p-3 rounded-xl">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Milestones</p>
                                <div className="text-3xl font-black text-blue-500">{data.overviewStats.activeMilestones}</div>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-xl">
                                <Clock className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Goals Achieved</p>
                                <div className="text-3xl font-black text-orange-400">{data.overviewStats.goalsAchieved}</div>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-xl">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Velocity Chart */}
                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Task Completion Velocity
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-white/10"
                            disabled={exportingCard !== null}
                            onClick={() => handleExport(
                                'Task Completion Velocity',
                                ['Date', 'Completed Tasks'],
                                data.taskVelocityData.map((item: any) => [item.date, item.completed]),
                                'task_velocity'
                            )}
                        >
                            {exportingCard === 'Task Completion Velocity'
                                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                : <Download className="h-4 w-4 text-muted-foreground" />
                            }
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.taskVelocityData}>
                                    <defs>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={20}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={25}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="completed"
                                        stroke="#F97316"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorCompleted)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Distribution Chart */}
                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            Status Distribution
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-white/10"
                            disabled={exportingCard !== null}
                            onClick={() => handleExport(
                                'Task Status Distribution',
                                ['Status', 'Count'],
                                data.taskStatusDistribution.map((item: any) => [item.name, item.value]),
                                'status_distribution'
                            )}
                        >
                            {exportingCard === 'Task Status Distribution'
                                ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                : <Download className="h-4 w-4 text-muted-foreground" />
                            }
                        </Button>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <div className="h-[300px] w-full max-w-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.taskStatusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {data.taskStatusDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px'
                                        }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Team Member Performance */}
                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                            <Users className="h-5 w-5 text-blue-500" />
                            Team Throughput
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-white/10"
                            disabled={exportingCard !== null}
                            onClick={() => handleExport(
                                'Team Member Performance',
                                ['Member Name', 'Tasks Completed'],
                                data.memberPerformanceData.map((item: any) => [item.name, item.tasks]),
                                'team_performance'
                            )}
                        >
                            {exportingCard === 'Team Member Performance'
                                ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                : <Download className="h-4 w-4 text-muted-foreground" />
                            }
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.memberPerformanceData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        width={100}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px'
                                        }}
                                    />
                                    <Bar dataKey="tasks" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Project Progress */}
                <Card className="glass-card border-none ring-1 ring-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                            <Target className="h-5 w-5 text-primary" />
                            Project Completion Progress
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-white/10"
                            disabled={exportingCard !== null}
                            onClick={() => handleExport(
                                'Project Completion Progress',
                                ['Project Title', 'Progress Percentage'],
                                data.projectProgressData.map((item: any) => [item.name, `${item.progress}%`]),
                                'project_progress'
                            )}
                        >
                            {exportingCard === 'Project Completion Progress'
                                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                : <Download className="h-4 w-4 text-muted-foreground" />
                            }
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 mt-4">
                            {data.projectProgressData.slice(0, 5).map((project: { name: string; progress: number }, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-foreground">{project.name}</span>
                                        <span className="text-primary font-black">{project.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {data.projectProgressData.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">No active projects to display</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Analytics;
