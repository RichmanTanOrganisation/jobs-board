import { ActionIcon, Text, Button, Paper, Flex, Stack, Badge, useMantineTheme } from '@mantine/core';
import styles from './UniversalJobCard.module.css';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { deleteJob } from '@/api/job';
import { toast } from 'react-toastify';
import { FC } from 'react';

export interface UniversalJobCardProps {
  id: string;
  title: string;
  specialisation: string;
  description: string;
  roleType: string;
  salary?: string;
  applicationDeadline: string;
  datePosted: string;
  publisherID: string;
  company?: string;
  location?: string;
  isPostedByAlumni?: boolean;
}

interface UniversalJobCardComponentProps {
  data: UniversalJobCardProps;
  onJobDeleted?: () => void;
  onEditJob?: (jobData: UniversalJobCardProps) => void;
  variant?: 'sponsor-profile' | 'job-board';
  showDeleteButton?: boolean;
  showEditButton?: boolean;
}

export const UniversalJobCard: FC<UniversalJobCardComponentProps> = ({ 
  data, 
  onJobDeleted, 
  onEditJob,
  variant = 'job-board',
  showDeleteButton = false,
  showEditButton = false
}) => {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const role = useSelector((state: RootState) => state.user.role);
  const userId = useSelector((state: RootState) => state.user.id);
  
  const timeSince = (past: Date) => {
    const now = new Date();
    let seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
    ];
    for (const it of intervals) {
      const count = Math.floor(seconds / it.seconds);
      if (count >= 1) {
        return `${count} ${it.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  };

  let isExpired = false;
  let expiredLabel = '';
  if (data.applicationDeadline) {
    const parsed = Date.parse(data.applicationDeadline);
    if (!isNaN(parsed)) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (parsed < startOfToday.getTime()) {
        isExpired = true;
        expiredLabel = `Expired ${timeSince(new Date(parsed))}`;
      }
    }
  }

  const handleDeleteJob = async () => {
    if (window.confirm(`Are you sure you want to delete the job "${data.title}"?`)) {
      try {
        await deleteJob(data.id);
        toast.success('Job deleted successfully!');
        onJobDeleted?.();
      } catch (error) {
        console.error('Failed to delete job:', error);
        toast.error('Failed to delete job. Please try again.');
      }
    }
  };

  const handleEditJob = () => {
    // Check if user can edit this job
    const canEdit = role === 'sponsor' || role === 'alumni';
    const isOwner = userId && data.publisherID === userId;
    
    if (!canEdit) {
      toast.error('You do not have permission to edit jobs');
      return;
    }
    
    if (!isOwner) {
      toast.error('You can only edit your own job posts');
      return;
    }

    navigate(`/job-editor/${data.id}`);
  };

  const handleViewJob = () => {
    navigate(`/jobs/${data.id}`);
  };

  const handleBadgeClick = () => {
    navigate(`/profile/alumni/${data.publisherID}`);
  };

  const getElementBasedOnRole = (element: string) => {
    switch (role) { 
      case 'member':
        return getStudentElements(element);
      case 'sponsor':
        return getSponsorElements(element);
      case 'alumni':
        return getAlumniElements(element);
      case 'admin':
        return getSponsorElements(element);
    }
  };

  const getSponsorElements = (element: string) => {
    const isOwner = userId && data.publisherID === userId;
    
    switch (element) {
      case 'deleteBtn':
        return (showDeleteButton && isOwner) ? (
          <ActionIcon
            variant="transparent"
            color="white"
            onClick={handleDeleteJob}>
            <IconTrash 
            aria-label = "Delete Job"/>
          </ActionIcon>
        ) : null;
      case 'jobBtn':
        return (showEditButton && isOwner) ? (
          <Button
            color="blue"
            mt="xs"
            mr="md"
            radius="lg"
            size="compact-md"
            onClick={handleEditJob}
            leftSection={<IconEdit size={14} />}
          >
            Edit Job
          </Button>
        ) : (
          <Button
            color="blue"
            mt="xs"
            mr="md"
            radius="lg"
            size="compact-md"
            onClick={handleViewJob}
          >
            View Details
          </Button>
        );
    }
  };

  const getStudentElements = (element: string) => {
    switch (element) {
      case 'deleteBtn':
        return null;
      case 'jobBtn':
        return (
          <Button
            color="blue"
            mt="xs"
            mr="md"
            radius="lg"
            size="compact-md"
            onClick={handleViewJob}
          >
            View Details
          </Button>
        );
    }
  };

  const getAlumniElements = (element: string) => {
    const isOwner = userId && data.publisherID === userId;
    
    switch (element) {
      case 'deleteBtn':
        return (showDeleteButton && isOwner) ? (
          <ActionIcon
            variant="transparent"
            color="white"
            onClick={handleDeleteJob}>
            <IconTrash 
            aria-label = "Delete Job"/>
          </ActionIcon>
        ) : null;
      case 'jobBtn':
        return (showEditButton && isOwner) ? (
          <Button
            color="blue"
            mt="xs"
            mr="md"
            radius="lg"
            size="compact-md"
            onClick={handleEditJob}
            leftSection={<IconEdit size={14} />}
          >
            Edit Job
          </Button>
        ) : (
          <Button
            color="blue"
            mt="xs"
            mr="md"
            radius="lg"
            size="compact-md"
            onClick={handleViewJob}
          >
            View Details
          </Button>
        );
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Determine card styling based on variant
  const getCardStyle = () => {
    if (variant === 'sponsor-profile') {
      return {
        opacity: isExpired ? 0.75 : 1,
        backgroundColor: '#2c2e33',
        border: 'none',
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const
      };
    } else {
      return {
        backgroundColor: '#2c2e33',
        border: 'none',
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const
      };
    }
  };

  const getTextColor = () => {
    return variant === 'sponsor-profile' ? 'white' : 'white';
  };

  return (
    <Paper p="md" radius="md" style={getCardStyle()}>
      <Flex direction="column" style={{ height: '100%' }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          {/* Header with title and delete button */}
          <Flex justify={'space-between'}>
            <Text fw={500} size="xl" className={styles.text} c={getTextColor()}>
              {data.title}
            </Text>
            {getElementBasedOnRole('deleteBtn')}
          </Flex>
          {/* Tags */}
          <Flex gap="xs" align="center" wrap="wrap">
            <Badge color="blue" variant="light" size="sm">
              {data.roleType}
            </Badge>
            <Badge color="green" variant="light" size="sm">
              {data.specialisation}
            </Badge>
            {data.salary && (
              <Badge color="orange" variant="light" size="sm">
                {data.salary}
              </Badge>
            )}
            {isExpired && (
              <Badge color="red" variant="filled" size="sm">
                {expiredLabel}
              </Badge>
            )}
          </Flex>

          {/* Description */}
          <Text 
            fw={700} 
            size="sm" 
            className={styles.text} 
            c={getTextColor()}
            style={{ 
              whiteSpace: 'pre-wrap',
              lineClamp: variant === 'job-board' ? 3 : undefined
            }}
          >
            {data.description}
          </Text>

          {/* Dates */}
          <Flex justify="space-between" align="center">
            <Text size="xs" c="dimmed">
              Posted: {formatDate(data.datePosted)}
            </Text>
            <Text size="xs" c="dimmed">
              Deadline: {formatDate(data.applicationDeadline)}
            </Text>
          </Flex>
        </Stack>

        {/* Alumni badge and action button */}
        <Flex justify={data.isPostedByAlumni ? "space-between" : "flex-end"} align="center" mt="md">
          {data.isPostedByAlumni && (
            <Badge
              color={theme.colors.customPapayaOrange[1]}
              onClick={handleBadgeClick}
              style={{
                cursor: 'pointer',
                color: theme.colors.background[0]
              }}
            >
              Alumni-posted
            </Badge>
          )}  
          {getElementBasedOnRole('jobBtn')}
        </Flex>

        {/* Job ID */}
        <Flex justify="flex-end" mt="xs">
          <Text c={'#7C7C7C'} size="sm" className={styles.text}>
            #{data.id}
          </Text>
        </Flex>
      </Flex>
    </Paper>
  );
};

export default UniversalJobCard;
