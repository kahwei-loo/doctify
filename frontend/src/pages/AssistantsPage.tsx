/**
 * AssistantsPage (L1 Container)
 *
 * Main page for AI Assistants management with three-level navigation:
 * L1: Sidebar (URL-based routing) → /assistants/:assistantId?
 * L2: AssistantsPanel (Assistant selection + stats)
 * L3: ConversationsInbox (Intercom split layout)
 *
 * Day 3-4: CRUD operations for assistants with modal dialogs
 * Day 5-7: Conversations Inbox with resizable split layout
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AssistantsPanel,
  AssistantFormModal,
  DeleteAssistantDialog,
  ConversationsInbox,
} from '@/features/assistants/components';
import {
  useCreateAssistantMutation,
  useUpdateAssistantMutation,
  useDeleteAssistantMutation,
  useGetAssistantsQuery,
} from '@/store/api/assistantsApi';
import type { Assistant, CreateAssistantRequest } from '@/features/assistants/types';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from '@/shared/components';
import { Bot } from 'lucide-react';

const AssistantsPage: React.FC = () => {
  const { assistantId } = useParams<{ assistantId?: string }>();
  const navigate = useNavigate();

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null);

  // RTK Query mutations
  const [createAssistant, { isLoading: isCreating }] = useCreateAssistantMutation();
  const [updateAssistant, { isLoading: isUpdating }] = useUpdateAssistantMutation();
  const [deleteAssistant, { isLoading: isDeleting }] = useDeleteAssistantMutation();

  // Fetch assistants to get the selected assistant data
  const { data: assistantsResponse } = useGetAssistantsQuery();
  const assistants = assistantsResponse?.data || [];
  const selectedAssistant = assistants.find((a) => a.assistant_id === assistantId);

  // Handle assistant selection (updates URL)
  const handleSelectAssistant = (id: string | null) => {
    if (id) {
      navigate(`/assistants/${id}`);
    } else {
      navigate('/assistants');
    }
  };

  // Handle create assistant modal
  const handleCreateAssistant = () => {
    setEditingAssistant(null);
    setFormModalOpen(true);
  };

  // Handle edit assistant modal
  const handleEditAssistant = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setFormModalOpen(true);
  };

  // Handle delete assistant dialog
  const handleDeleteAssistant = (assistant: Assistant) => {
    setDeletingAssistant(assistant);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (create or update)
  const handleFormSubmit = async (data: CreateAssistantRequest) => {
    console.log('[AssistantsPage] handleFormSubmit called:', data);
    console.log('[AssistantsPage] isEditMode:', !!editingAssistant);
    try {
      if (editingAssistant) {
        // Update existing assistant
        console.log('[AssistantsPage] Calling updateAssistant...');
        await updateAssistant({
          assistant_id: editingAssistant.assistant_id,
          ...data,
        }).unwrap();
        console.log('[AssistantsPage] updateAssistant completed successfully');

        toast.success(`Assistant "${data.name}" updated successfully`);
      } else {
        // Create new assistant
        console.log('[AssistantsPage] Calling createAssistant...');
        const result = await createAssistant(data).unwrap();
        console.log('[AssistantsPage] createAssistant completed successfully:', result);

        toast.success(`Assistant "${data.name}" created successfully`);

        // Navigate to the new assistant
        navigate(`/assistants/${result.assistant_id}`);
      }

      // Close modal
      console.log('[AssistantsPage] Closing modal...');
      setFormModalOpen(false);
      setEditingAssistant(null);
    } catch (error) {
      console.error('[AssistantsPage] Failed to save assistant:', error);
      toast.error(
        editingAssistant
          ? 'Failed to update assistant. Please try again.'
          : 'Failed to create assistant. Please try again.'
      );
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingAssistant) return;

    try {
      await deleteAssistant(deletingAssistant.assistant_id).unwrap();

      toast.success(`Assistant "${deletingAssistant.name}" deleted successfully`);

      // If deleted assistant was selected, navigate to base path
      if (assistantId === deletingAssistant.assistant_id) {
        navigate('/assistants');
      }

      // Close dialog
      setDeleteDialogOpen(false);
      setDeletingAssistant(null);
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      toast.error('Failed to delete assistant. Please try again.');
    }
  };

  // Handle activate/deactivate toggle
  const handleToggleStatus = async (assistantIdToToggle: string, newStatus: boolean) => {
    try {
      // Find the assistant to get its current data
      // We'll use optimistic update via RTK Query's automatic cache invalidation

      await updateAssistant({
        assistant_id: assistantIdToToggle,
        is_active: newStatus,
      }).unwrap();

      toast.success(newStatus ? 'Assistant activated' : 'Assistant deactivated');
    } catch (error) {
      console.error('Failed to toggle assistant status:', error);
      toast.error('Failed to update assistant status. Please try again.');
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-112px)] overflow-hidden">
        {/* L2: AssistantsPanel */}
        <ErrorBoundary
          fallback={
            <div className="w-64 flex-shrink-0 flex items-center justify-center border-r bg-muted/30 p-4">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Failed to load assistants</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh page
                </button>
              </div>
            </div>
          }
        >
          <AssistantsPanel
            selectedAssistantId={assistantId || null}
            onSelectAssistant={handleSelectAssistant}
            onCreateAssistant={handleCreateAssistant}
            onEditAssistant={handleEditAssistant}
            onDeleteAssistant={handleDeleteAssistant}
            onToggleStatus={handleToggleStatus}
            className="w-[280px] flex-shrink-0"
          />
        </ErrorBoundary>

        {/* L3: ConversationsInbox */}
        <div className="flex-1 flex bg-muted/30">
          {selectedAssistant ? (
            <ErrorBoundary
              fallback={
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="text-sm text-destructive mb-2">Failed to load conversations</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs text-primary hover:underline"
                    >
                      Refresh page
                    </button>
                  </div>
                </div>
              }
            >
              <ConversationsInbox
                assistant={selectedAssistant}
                onEditAssistant={handleEditAssistant}
                className="flex-1"
              />
            </ErrorBoundary>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="max-w-md">
                <CardContent className="pt-6 text-center">
                  <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-4">
                    <Bot className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Assistant Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select an assistant from the panel to view its conversations.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Modals and Dialogs */}
        <AssistantFormModal
          open={formModalOpen}
          onClose={() => {
            setFormModalOpen(false);
            setEditingAssistant(null);
          }}
          onSubmit={handleFormSubmit}
          assistant={editingAssistant}
          isSubmitting={isCreating || isUpdating}
        />

        <DeleteAssistantDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeletingAssistant(null);
          }}
          onConfirm={handleDeleteConfirm}
          assistant={deletingAssistant}
          isDeleting={isDeleting}
        />
      </div>
    </ErrorBoundary>
  );
};

export default AssistantsPage;
