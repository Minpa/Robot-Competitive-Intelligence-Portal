'use client';

import { useState } from 'react';
import {
  useLgRobotsManagement,
  useCreateLgRobot,
  useUpdateLgRobotSpecs,
  useLgRobotHistory,
} from '@/hooks/useWarRoom';
import { LgRobotList } from '@/components/war-room/lg-management/LgRobotList';
import { SpecEditorForm } from '@/components/war-room/lg-management/SpecEditorForm';
import { ChangeHistoryPanel } from '@/components/war-room/lg-management/ChangeHistoryPanel';
import { CreateRobotModal } from '@/components/war-room/lg-management/CreateRobotModal';

export default function LgRobotManagementPage() {
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data hooks
  const { data: robots, isLoading: robotsLoading } = useLgRobotsManagement();
  const { data: history, isLoading: historyLoading } = useLgRobotHistory(selectedRobotId);
  const createRobot = useCreateLgRobot();
  const updateSpecs = useUpdateLgRobotSpecs();

  const selectedRobot = robots?.find((r) => r.id === selectedRobotId) ?? null;

  const handleCreate = (data: any) => {
    createRobot.mutate(data, {
      onSuccess: () => setShowCreateModal(false),
    });
  };

  const handleSave = (specs: any) => {
    if (!selectedRobotId) return;
    updateSpecs.mutate({ robotId: selectedRobotId, specs });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left sidebar: Robot list */}
      <div className="col-span-12 lg:col-span-3">
        <LgRobotList
          robots={robots ?? []}
          selectedId={selectedRobotId}
          onSelect={setSelectedRobotId}
          onCreateClick={() => setShowCreateModal(true)}
          isLoading={robotsLoading}
        />
      </div>

      {/* Main area */}
      <div className="col-span-12 space-y-4 lg:col-span-9">
        {selectedRobot ? (
          <>
            <SpecEditorForm
              robot={selectedRobot}
              onSave={handleSave}
              isSaving={updateSpecs.isPending}
            />
            <ChangeHistoryPanel
              history={history ?? []}
              isLoading={historyLoading}
            />
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-ink-200 bg-white shadow-report">
            <p className="text-sm text-ink-500">
              왼쪽 목록에서 로봇을 선택하세요
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <CreateRobotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isCreating={createRobot.isPending}
      />
    </div>
  );
}
