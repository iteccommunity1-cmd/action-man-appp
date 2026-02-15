import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskComment } from '@/types/comment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface TaskCommentsProps {
  taskId: string;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments, isLoading } = useQuery<TaskComment[], Error>({
    queryKey: ['taskComments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, profiles(first_name, last_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
  });

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: currentUser.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      showSuccess("Comment added!");
    } catch (error: any) {
      showError("Failed to add comment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      showSuccess("Comment deleted.");
    } catch (error: any) {
      showError("Failed to delete comment: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Start the conversation!</p>
        ) : (
          comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.profiles?.avatar_url} />
                <AvatarFallback>{comment.profiles?.first_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-grow space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {comment.profiles?.first_name} {comment.profiles?.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm relative group">
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                  {currentUser?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] rounded-lg bg-input border-border focus:ring-primary"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSendComment}
            disabled={isSubmitting || !newComment.trim()}
            className="rounded-lg bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  );
};