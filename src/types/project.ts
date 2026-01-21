export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface Project {
  id: string;
  title: string;
  assignedMembers: TeamMember['id'][];
  deadline: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  createdAt: Date;
}