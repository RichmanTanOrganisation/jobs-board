import { Modal, Stack, Text, Group, Badge, Select, Paper, Divider, Box, Anchor, List } from '@mantine/core';
import { IconSquareCheck, IconSquare, IconCircleFilled, IconCircle, IconFile, IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import { useState } from 'react';

interface SubmissionDetailModalProps {
  opened: boolean;
  onClose: () => void;
  submission: {
    id: string;
    applicant_name?: string;
    applicant_email?: string;
    submitted_at: string;
    status: string;
    submission_data?: any;
  };
  onStatusChange: (submissionId: string, newStatus: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  unread: 'blue',
  reviewed: 'gray',
  shortlisted: 'green',
  rejected: 'red',
};

const STATUS_OPTIONS = [
  { value: 'unread', label: 'Unread' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
];

export function SubmissionDetailModal({
  opened,
  onClose,
  submission,
  onStatusChange,
}: SubmissionDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus || newStatus === submission.status) return;

    setIsUpdating(true);
    try {
      await onStatusChange(submission.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const formattedDate = new Date(submission.submitted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Extract form fields from submission_data
  const formFields = submission.submission_data?.fields || [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="xl" fw={700}>
          Application Details
        </Text>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Applicant Information */}
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <div>
                <Text size="lg" fw={600}>
                  {submission.applicant_name || 'Unknown Applicant'}
                </Text>
                <Text size="sm" c="dimmed">
                  {submission.applicant_email || 'No email provided'}
                </Text>
              </div>
              <Badge color={STATUS_COLORS[submission.status] || 'gray'} size="lg" variant="filled">
                {submission.status}
              </Badge>
            </Group>

            <Text size="sm" c="dimmed">
              Submitted: {formattedDate}
            </Text>

            <Group gap="sm" mt="xs">
              <Text size="sm" fw={500}>
                Update Status:
              </Text>
              <Select
                data={STATUS_OPTIONS}
                value={submission.status}
                onChange={handleStatusChange}
                disabled={isUpdating}
                placeholder="Update status"
                style={{ flex: 1, maxWidth: 200 }}
              />
            </Group>
          </Stack>
        </Paper>

        <Divider />

        {/* Form Responses */}
        <div>
          <Text size="lg" fw={600} mb="md">
            Form Responses
          </Text>

          {formFields.length > 0 ? (
            <Stack gap="lg">
              {formFields
                .filter((field: any) =>
                  field.type !== 'HIDDEN_FIELDS' &&
                  !isIndividualCheckboxField(field.key)
                )
                .map((field: any, index: number) => (
                  <Paper key={index} p="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" fw={600} c="dimmed">
                        {field.label || `Question ${index + 1}`}
                      </Text>
                      <Box style={{ whiteSpace: 'pre-wrap' }}>
                        {formatFieldValue(field)}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
            </Stack>
          ) : (
            <Text c="dimmed" size="sm">
              No form responses available
            </Text>
          )}
        </div>
      </Stack>
    </Modal>
  );
}

// Helper function to detect individual checkbox boolean fields (duplicates)
// These have keys like: question_OGGJgp_3bf416bb-63e3-4864-a404-0923de620651
// Pattern: {parentKey}_{uuid}
function isIndividualCheckboxField(key: string): boolean {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(key);
}

// Helper function to format file size from bytes to human-readable format
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Helper function to get file icon based on MIME type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return IconPhoto;
  if (mimeType === 'application/pdf') return IconFileTypePdf;
  return IconFile;
}

// Helper function to format field values based on type
function formatFieldValue(field: any): React.ReactNode {
  if (!field.value && field.type !== 'CHECKBOXES' && field.type !== 'MULTIPLE_CHOICE') {
    return 'No answer provided';
  }

  // Handle different field types
  switch (field.type) {
    case 'CHECKBOXES':
      // Show checkboxes (square icons) for multiple selection
      if (field.options && Array.isArray(field.options)) {
        const selectedIds = Array.isArray(field.value) ? field.value : [];

        return (
          <Stack gap="xs">
            {field.options.map((option: any) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <Group key={option.id} gap="xs">
                  {isSelected ? (
                    <IconSquareCheck size={18} color="var(--mantine-color-green-6)" />
                  ) : (
                    <IconSquare size={18} color="var(--mantine-color-gray-6)" opacity={0.5} />
                  )}
                  <Text
                    size="sm"
                    fw={isSelected ? 500 : 400}
                    c={isSelected ? 'bright' : 'dimmed'}
                  >
                    {option.text}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        );
      }

      // Fallback: Show selected values as text if no options array
      if (Array.isArray(field.value)) {
        return field.value.join(', ') || 'No answer provided';
      }
      return field.value?.toString() || 'No answer provided';

    case 'MULTIPLE_CHOICE':
      // Show radio buttons (circle icons) for single selection
      if (field.options && Array.isArray(field.options)) {
        const selectedIds = Array.isArray(field.value) ? field.value : [];

        return (
          <Stack gap="xs">
            {field.options.map((option: any) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <Group key={option.id} gap="xs">
                  {isSelected ? (
                    <IconCircleFilled size={18} color="var(--mantine-color-green-6)" />
                  ) : (
                    <IconCircle size={18} color="var(--mantine-color-gray-6)" opacity={0.5} />
                  )}
                  <Text
                    size="sm"
                    fw={isSelected ? 500 : 400}
                    c={isSelected ? 'bright' : 'dimmed'}
                  >
                    {option.text}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        );
      }

      // Fallback: Show selected values as text if no options array
      if (Array.isArray(field.value)) {
        return field.value.join(', ') || 'No answer provided';
      }
      return field.value?.toString() || 'No answer provided';

    case 'FILE_UPLOAD':
      // Handle file uploads - value is always an array of file objects
      if (!Array.isArray(field.value) || field.value.length === 0) {
        return <Text c="dimmed" size="sm">No files uploaded</Text>;
      }

      return (
        <List spacing="sm" size="sm">
          {field.value.map((file: any, idx: number) => {
            const FileIcon = getFileIcon(file.mimeType || '');
            const fileExtension = file.name?.split('.').pop()?.toUpperCase() || 'FILE';

            return (
              <List.Item
                key={file.id || idx}
                icon={<FileIcon size={18} color="var(--mantine-color-blue-6)" />}
              >
                <Group gap="xs" wrap="nowrap">
                  <Anchor
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    fw={500}
                  >
                    {file.name || 'Unnamed file'}
                  </Anchor>
                  <Group gap={4}>
                    <Badge size="xs" variant="light" color="gray">
                      {fileExtension}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      ({formatFileSize(file.size || 0)})
                    </Text>
                  </Group>
                </Group>
              </List.Item>
            );
          })}
        </List>
      );

    default:
      if (Array.isArray(field.value)) {
        return field.value.join(', ');
      }
      return field.value.toString();
  }
}
