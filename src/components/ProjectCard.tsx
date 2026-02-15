import React from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, CalendarDays, Hourglass, MoreVertical, Edit, Trash2, CheckCircle, PlayCircle, PauseCircle, XCircle, Star, Archive, ArchiveRestore } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onStatusChange: (project: Project, newStatus: Project['status']) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, onStatusChange }) => {
  const { teamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

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

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_favorite: !project.is_favorite })
        .eq('id', project.id);
      
      if (error) throw error;
      showSuccess(project.is_favorite ? "Removed from favorites" : "Added to favorites");
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    } catch (error: any) {
      showError("Failed to update favorite status: " + error.message);
    }
  };

  const handleToggleArchive = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: !project.is_archived })
        .eq('id', project.id);
      
      if (error) throw error;
      showSuccess(project.is_archived ? "Project restored" : "Project archived");
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    } catch (error: any) {
      showError("Failed to archive project: " + error.message);
    }
  };

  const assignedMemberDetails = project.assigned_members.map(memberId =>
    teamMembers.find(member => member.id === memberId)
  ).filter(Boolean);

  return (
    <Card className={cn("rounded-xl glass-card relative group", project.is_archived && "opacity-60 grayscale-[0.5]")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8 rounded-full transition-colors", project.is_favorite ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500")}
              onClick={handleToggleFavorite}
            >
              <Star className={cn("h-5 w-5", project.is_favorite && "fill-current")} />
            </Button>
            <Link to={`/projects/${project.id}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-md">
              {project.title}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("rounded-full px-3 py-1 text-xs font-medium", getStatusBadgeColor(project.status))}>
              {project.status.replace('-', ' ')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-lg shadow-md bg-card border-border text-card-foreground">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-accent/20">
                  <Edit className="h-4 w-4 text-primary" /> Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'pending'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-yellow-500/20">
                  <PauseCircle className="h-4 w-4 text-yellow-500" /> Set to Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'in-progress'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-blue-500/20">
                  <PlayCircle className="h-4 w-4 text-blue-500" /> Set to In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'completed'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleArchive(); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-orange-500/20">
                  {project.is_archived ? (
                    <><ArchiveRestore className="h-4 w-4 text-orange-500" /> Restore Project</>
                  ) : (
                    <><Archive className="h-4 w-4 text-orange-500" /> Archive Project</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="flex items-center gap-2 cursor-pointer text-destructive hover:bg-destructive/20 rounded-md">
                  <Trash2 className="h-4 w-4" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 mr-2 text-primary" />
          <span>Deadline: {format(new Date(project.deadline), 'PPP')}</span>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {assignedMemberDetails.length > 0 ? (
              assignedMemberDetails.slice(0, 3).map((member) => (
                <Avatar key={member!.id} className="h-7 w-7 border border-border">
                  <AvatarImage src={member!.avatar} alt={member!.name} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                    {member!.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No members assigned</span>
            )}
            {assignedMemberDetails.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border border-border">
                +{assignedMemberDetails.length - 3}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};