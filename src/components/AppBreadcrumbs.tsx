import React from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  '': 'Dashboard', // For '/'
  'chat': 'Chat',
  'projects': 'Projects',
  'profile': 'Profile',
  'daily-digest': 'Daily Digest',
  'notifications': 'Notifications',
};

interface BreadcrumbSegment {
  name: string;
  path: string;
  isCurrent: boolean;
}

export const AppBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Query for project title
  const projectId = params.id;
  const { data: projectTitle } = useQuery<string, Error>({
    queryKey: ['projectTitle', projectId],
    queryFn: async () => {
      if (!projectId) return '';
      const { data, error } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      if (error) {
        console.error("[AppBreadcrumbs] Error fetching project title:", error);
        return 'Unknown Project';
      }
      return data?.title || 'Unknown Project';
    },
    enabled: !!projectId,
  });

  const breadcrumbs: BreadcrumbSegment[] = [];
  let currentPath = '';

  // Add Dashboard as the root
  breadcrumbs.push({ name: 'Dashboard', path: '/', isCurrent: location.pathname === '/' });

  pathnames.forEach((name, index) => {
    currentPath += `/${name}`;
    const isLast = index === pathnames.length - 1;

    let displayName = routeNameMap[name] || name; // Default to segment name

    // Special handling for project details page
    if (name === projectId && pathnames[index - 1] === 'projects') {
      displayName = projectTitle || 'Loading...';
    }

    breadcrumbs.push({
      name: displayName,
      path: currentPath,
      isCurrent: isLast,
    });
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 bg-background text-muted-foreground text-sm">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.path}>
              <BreadcrumbItem>
                {crumb.isCurrent ? (
                  <span className="font-semibold text-foreground">{crumb.name}</span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path} className="hover:text-primary transition-colors">
                      {crumb.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!crumb.isCurrent && (
                <BreadcrumbSeparator>
                  <Slash className="h-4 w-4 text-muted-foreground" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};