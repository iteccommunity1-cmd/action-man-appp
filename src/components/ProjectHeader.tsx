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

const getStatusBadgeColor = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500 text-white hover:bg-green-600';
    case 'in-progress':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'overdue':
      return 'bg-red-500 text-white hover:bg-red-600';
    case 'pending':
    default:
      return 'bg-yellow-500 text-white hover:bg-yellow-600';
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
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Link to="/projects" className="flex items-center text-primary hover:text-primary/80 font-medium text-lg transition-colors duration-200">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={onLogTime}
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 w-full sm:w-auto"
          >
            <Timer className="h-5 w-5 mr-2" /> Log Time
          </Button>
          <Button
            onClick={onEditProject}
            className="rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 w-full sm:w-auto"
          >
            <Edit className="h-5 w-5 mr-2" /> Edit Project
          </Button>
          {project.chat_room_id && (
            <Link to="/chat" state={{ activeChatRoomId: project.chat_room_id }} className="w-full sm:w-auto">
              <Button className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 w-full">
                <MessageCircle className="h-5 w-5 mr-2" /> Go to Project Chat
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="w-full rounded-xl glass-card mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {project.title}
            <Badge className={cn("rounded-full px-3 py-1 text-sm font-medium", getStatusBadgeColor(project.status))}>
              {project.status.replace('-', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {project.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">{project.description}</p>
          )}
          <div className="flex items-center text-lg text-muted-foreground">
            <CalendarDays className="h-5 w-5 mr-3 text-primary" />
            <span>Deadline: {format(new Date(project.deadline), 'PPP')}</span>
          </div>
          <div className="flex items-center text-lg text-muted-foreground">
            <Hourglass className="h-5 w-5 mr-3 text-secondary" />
            <span>Created: {format(new Date(project.created_at), 'PPP')}</span>
          </div>
          <div>
            <h5 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <Users className="h-5 w-5 mr-3 text-primary" />
              Assigned Team Members:
            </h5>
            <div className="flex flex-wrap gap-3">
              {assignedMemberDetails.length > 0 ? (
                assignedMemberDetails.map((member) => member && (
                  <div key={member.id} className="flex items-center space-x-2 bg-muted rounded-full pr-4 py-2 shadow-sm">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-base text-foreground font-medium">{member.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-base text-muted-foreground">No members assigned</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProjectOverviewStats {...projectStats} />
    </div>
  );
};