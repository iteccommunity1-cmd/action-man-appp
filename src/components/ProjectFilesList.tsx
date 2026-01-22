import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Download, Trash2, UploadCloud } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  mime_type?: string;
  size?: number;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface ProjectFilesListProps {
  projectId: string;
}

export const ProjectFilesList: React.FC<ProjectFilesListProps> = ({ projectId }) => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; storage_path: string; file_name: string } | null>(null);

  const { data: files, isLoading, isError, error } = useQuery<ProjectFile[], Error>({
    queryKey: ['projectFiles', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*, profiles(first_name, last_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch project details to get the project creator's ID and assigned members for notifications
  const { data: projectDetails } = useQuery<{ user_id: string; title: string; assigned_members: string[] }, Error>({
    queryKey: ['projectDetailsForFiles', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('user_id, title, assigned_members')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    if (!currentUser?.id) {
      showError("You must be logged in to upload files.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${projectId}/${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files') // Ensure this bucket exists in Supabase Storage
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { error: dbError } = await supabase.from('project_files').insert({
        project_id: projectId,
        user_id: currentUser.id,
        file_name: file.name,
        storage_path: filePath,
        mime_type: file.type,
        size: file.size,
      });

      if (dbError) {
        // If DB insert fails, try to remove the uploaded file from storage
        await supabase.storage.from('project-files').remove([filePath]);
        throw dbError;
      }

      showSuccess("File uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });

      // Send notifications to project creator and assigned members
      if (projectDetails) {
        const notificationMessage = `${currentUser.name} uploaded a new file "${file.name}" to project "${projectDetails.title}".`;
        const pushTitle = `New File Uploaded: ${projectDetails.title}`;
        const pushBody = `${currentUser.name} uploaded "${file.name}".`;
        const pushUrl = `/projects/${projectId}`;

        const recipients = new Set<string>();
        if (projectDetails.user_id) recipients.add(projectDetails.user_id);
        projectDetails.assigned_members.forEach(memberId => recipients.add(memberId));
        recipients.delete(currentUser.id); // Don't notify self

        for (const recipientId of Array.from(recipients)) {
          sendNotification({
            userId: recipientId,
            message: notificationMessage,
            type: 'file_upload',
            relatedId: projectId,
            pushTitle,
            pushBody,
            pushIcon: currentUser.avatar,
            pushUrl,
          });
        }
      }

    } catch (error: any) {
      console.error("[ProjectFilesList] Error uploading file:", error);
      showError("Failed to upload file: " + error.message);
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Clear the file input
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(storagePath);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("[ProjectFilesList] Error downloading file:", error);
      showError("Failed to download file: " + error.message);
    }
  };

  const handleDeleteFile = (file: { id: string; storage_path: string; file_name: string }) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([fileToDelete.storage_path]);

      if (storageError) {
        console.warn("[ProjectFilesList] Error deleting file from storage (might not exist):", storageError);
        // Continue to delete from DB even if storage delete fails, as file might be gone already
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (dbError) {
        throw dbError;
      }

      showSuccess("File deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });

      // Send notifications to project creator and assigned members
      if (projectDetails) {
        const notificationMessage = `${currentUser?.name || 'A user'} deleted file "${fileToDelete.file_name}" from project "${projectDetails.title}".`;
        const pushTitle = `File Deleted: ${projectDetails.title}`;
        const pushBody = `${currentUser?.name || 'A user'} deleted "${fileToDelete.file_name}".`;
        const pushUrl = `/projects/${projectId}`;

        const recipients = new Set<string>();
        if (projectDetails.user_id) recipients.add(projectDetails.user_id);
        projectDetails.assigned_members.forEach(memberId => recipients.add(memberId));
        recipients.delete(currentUser?.id || ''); // Don't notify self

        for (const recipientId of Array.from(recipients)) {
          sendNotification({
            userId: recipientId,
            message: notificationMessage,
            type: 'file_delete',
            relatedId: projectId,
            pushTitle,
            pushBody,
            pushIcon: currentUser?.avatar,
            pushUrl,
          });
        }
      }

    } catch (error: any) {
      console.error("[ProjectFilesList] Error deleting file:", error);
      showError("Failed to delete file: " + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load files: " + error.message);
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading files. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Project Files</h3>
        <label htmlFor="file-upload" className="w-full sm:w-auto">
          <Button
            asChild
            className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full cursor-pointer"
            disabled={isUploading}
          >
            <span>
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <UploadCloud className="h-5 w-5 mr-2" />
              )}
              {isUploading ? 'Uploading...' : 'Upload File'}
            </span>
          </Button>
          <input
            id="file-upload"
            type="file"
            className="sr-only"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {files!.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No files attached to this project yet.</p>
          <p className="text-sm mt-2">Click "Upload File" to add your first attachment!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {files!.map((file) => (
            <Card key={file.id} className="rounded-xl glass-card">
              <CardContent className="p-4 flex items-center justify-between space-x-4">
                <div className="flex items-center flex-grow min-w-0">
                  <FileText className="h-6 w-6 mr-3 text-primary flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <p className="font-semibold text-foreground truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(file.size)} &bull; Uploaded by {file.profiles?.first_name || 'Unknown'} on {format(new Date(file.created_at), 'PPP')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30"
                    onClick={() => handleDownloadFile(file.storage_path, file.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {currentUser?.id === file.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20"
                      onClick={() => handleDeleteFile({ id: file.id, storage_path: file.storage_path, file_name: file.file_name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this file? This action cannot be undone and will permanently remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFile} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};