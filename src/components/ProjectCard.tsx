import React from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, CalendarDays, Hourglass, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { teamMembers } from '@/data/teamMembers';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'default'; // Greenish
      case 'in-progress':
        return 'secondary'; // Grayish
      case 'overdue':
        return 'destructive'; // Red
      case 'pending':
      default:
        return 'outline'; // Light gray
    }
  };

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
  ).filter(Boolean); // Filter out undefined members

  return (
    <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-between">
          {project.title}
          <Badge className={cn("rounded-full px-3 py-1 text-xs font-medium", getStatusBadgeColor(project.status))}>
            {project.status.replace('-', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <div key={member.id} className="flex items-center space-x-2 bg-gray-100 rounded-full pr-3 py-1">
                  <Avatar className="h-7 w-7 border border-gray-200">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{member.name}</span>
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