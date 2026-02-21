import React from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarDays, Hourglass, MoreVertical, Edit, Trash2, CheckCircle, PlayCircle, PauseCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onStatusChange: (project: Project, newStatus: Project['status']) => void; // Changed to pass full project
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, onStatusChange }) => {
  const { teamMembers } = useTeamMembers();

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

  const assignedMemberDetails = project.assigned_members.map(memberId =>
    teamMembers.find(member => member.id === memberId)
  ).filter(Boolean);

  return (
    <Card className="rounded-2xl glass-card border-none ring-1 ring-white/10 shadow-xl overflow-hidden group animate-fade-in-up">
      <CardHeader className="pb-3 relative">
        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-2xl bg-card/90 backdrop-blur-lg border-white/10 text-card-foreground">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-primary/20 transition-colors">
                <Edit className="h-4 w-4 text-primary" /> Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'pending'); }} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-yellow-500/20 transition-colors">
                <PauseCircle className="h-4 w-4 text-yellow-500" /> Set to Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'in-progress'); }} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-blue-500/20 transition-colors">
                <PlayCircle className="h-4 w-4 text-blue-500" /> Set to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'completed'); }} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-green-500/20 transition-colors">
                <CheckCircle className="h-4 w-4 text-green-500" /> Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'overdue'); }} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-red-500/20 transition-colors">
                <XCircle className="h-4 w-4 text-red-500" /> Mark as Overdue
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="flex items-center gap-2 cursor-pointer text-destructive hover:bg-destructive/20 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="text-xl font-bold text-foreground flex flex-col gap-2">
          <Link to={`/projects/${project.id}`} className="hover:text-primary transition-colors duration-300">
            {project.title}
          </Link>
          <div className="flex items-center">
            <Badge className={cn("rounded-full px-4 py-0.5 text-[10px] font-bold uppercase tracking-wider", getStatusBadgeColor(project.status))}>
              {project.status.replace('-', ' ')}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-10">{project.description}</p>
        )}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-muted-foreground/80 font-medium">
            <CalendarDays className="h-4 w-4 mr-3 text-primary/70" />
            <span>Deadline: <span className="text-foreground">{format(new Date(project.deadline), 'MMM d, yyyy')}</span></span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground/80 font-medium">
            <Hourglass className="h-4 w-4 mr-3 text-secondary/70" />
            <span>Created: <span className="text-foreground">{format(new Date(project.created_at), 'MMM d, yyyy')}</span></span>
          </div>
        </div>
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</span>
            <div className="flex -space-x-2">
              {assignedMemberDetails.map((member) => (
                <Avatar key={member!.id} className="h-8 w-8 border-2 border-card ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-500">
                  <AvatarImage src={member!.avatar} alt={member!.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                    {member!.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignedMemberDetails.length === 0 && (
                <span className="text-[10px] italic text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};