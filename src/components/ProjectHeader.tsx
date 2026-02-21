import React from 'react';
import { Link } from 'react-router-dom';
import { Project, ProjectOverviewStatsProps, TeamMember } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Hourglass, Users, ArrowLeft, MessageCircle, Edit, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProjectOverviewStats } from './ProjectOverviewStats';

interface ProjectHeaderProps {
  project: Project;
  projectStats: ProjectOverviewStatsProps;
  teamMembers: TeamMember[];
  onEditProject: () => void;
  onLogTime: () => void;
}

const getStatusBadgeStyles = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
    case 'in-progress':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
    case 'overdue':
      return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
    case 'pending':
    default:
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
  }
};

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  projectStats,
  teamMembers,
  onEditProject,
  onLogTime,
}) => {
  const assignedMemberDetails: (TeamMember | undefined)[] = project.assigned_members.map(memberId =>
    teamMembers.find(member => member.id === memberId)
  );

  return (
    <div className="w-full space-y-12 animate-fade-in">
      {/* Navigation and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <Link
          to="/projects"
          className="group flex items-center text-muted-foreground hover:text-primary font-bold text-xs tracking-widest uppercase transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Workspace Network
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onLogTime}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-bold text-xs uppercase tracking-widest px-6 transition-all active:scale-95"
          >
            <Timer className="h-4 w-4 mr-2 text-primary" /> Log Hours
          </Button>
          <Button
            onClick={onEditProject}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-bold text-xs uppercase tracking-widest px-6 transition-all active:scale-95"
          >
            <Edit className="h-4 w-4 mr-2 text-primary" /> Configure
          </Button>
          {project.chat_room_id && (
            <Link to="/chat" state={{ activeChatRoomId: project.chat_room_id }}>
              <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-8 shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all active:scale-95">
                <MessageCircle className="h-4 w-4 mr-2" /> Launch Comms
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <Card className="relative w-full rounded-[2.5rem] border-none ring-1 ring-white/10 glass-card overflow-hidden shadow-2xl">
          <CardHeader className="p-10 pb-6">
            <div className="flex flex-col gap-6">
              <Badge className={cn(
                "w-fit rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                getStatusBadgeStyles(project.status)
              )}>
                {project.status.replace('-', ' ')}
              </Badge>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                {project.title}
              </h1>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-10">
            {project.description && (
              <p className="text-xl text-muted-foreground/80 leading-relaxed max-w-2xl font-medium">
                {project.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-white/5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-0.5">Final Deadline</p>
                  <p className="text-lg font-bold text-foreground">{format(new Date(project.deadline), 'MMMM do, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Hourglass className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-0.5">Project Inception</p>
                  <p className="text-lg font-bold text-foreground">{format(new Date(project.created_at), 'MMMM do, yyyy')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <h5 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Operative Assets</h5>
              </div>
              <div className="flex flex-wrap gap-4">
                {assignedMemberDetails.length > 0 ? (
                  assignedMemberDetails.map((member) => member && (
                    <div key={member.id} className="group/member flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-2xl pl-1 pr-5 py-1 border border-white/5 transition-all cursor-default">
                      <Avatar className="h-10 w-10 border-2 border-transparent group-hover/member:border-primary/30 transition-all shadow-lg">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-black uppercase">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold text-foreground/80 group-hover/member:text-foreground transition-colors">{member.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-muted-foreground italic">No assets currently assigned to this mission.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectOverviewStats {...projectStats} />
    </div>
  );
};