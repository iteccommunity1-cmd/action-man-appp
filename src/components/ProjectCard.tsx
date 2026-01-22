import React from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, CalendarDays, Hourglass, MoreVertical, Edit, Trash2, CheckCircle, PlayCircle, PauseCircle, XCircle } from 'lucide-react';
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
    <Card className="rounded-xl glass-card"> {/* Applied glass-card */}
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"> {/* Adjusted for mobile stacking */}
          <Link to={`/projects/${project.id}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md">
            {project.title}
          </Link>
          <div className="flex items-center gap-2">
            <Badge className={cn("rounded-full px-3 py-1 text-xs font-medium", getStatusBadgeColor(project.status))}>
              {project.status.replace('-', ' ')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-lg shadow-md">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-gray-100">
                  <Edit className="h-4 w-4" /> Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'pending'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-yellow-50">
                  <PauseCircle className="h-4 w-4 text-yellow-600" /> Set to Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'in-progress'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-blue-50">
                  <PlayCircle className="h-4 w-4 text-blue-600" /> Set to In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'completed'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" /> Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project, 'overdue'); }} className="flex items-center gap-2 cursor-pointer rounded-md hover:bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" /> Mark as Overdue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="flex items-center gap-2 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md">
                  <Trash2 className="h-4 w-4" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
          <span>Deadline: {format(new Date(project.deadline), 'PPP')}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Hourglass className="h-4 w-4 mr-2 text-purple-500" />
          <span>Created: {format(new Date(project.created_at), 'PPP')}</span>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Users className="h-4 w-4 mr-2 text-indigo-500" />
            Assigned Members:
          </h5>
          <div className="flex flex-wrap gap-2">
            {assignedMemberDetails.length > 0 ? (
              assignedMemberDetails.map((member) => (
                <div key={member!.id} className="flex items-center space-x-2 bg-gray-100 rounded-full pr-3 py-1">
                  <Avatar className="h-7 w-7 border border-gray-200">
                    <AvatarImage src={member!.avatar} alt={member!.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                      {member!.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{member!.name}</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-500">No members assigned</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};