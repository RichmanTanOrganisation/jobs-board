// JobListingItem.ts
import { Card, Text, Button, Flex, Badge, Stack } from '@mantine/core';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job } from '@/models/job.model';

interface JobListingItemProps {
  id: Job['id'];
  title: Job['title'];
  description: Job['description'];
  company: Job['publisherID'];
  location?: Job['location'];
  logo?: string;
  // new fields added to match JobCard / carousel
  roleType?: Job['roleType'];
  specialisation?: Job['specialisation'];
  salary?: Job['salary'];
  applicationDeadline?: Job['applicationDeadline'];
  datePosted?: Job['datePosted'];
}

const JobListingItem: FC<JobListingItemProps> = ({
  id,
  title,
  description,
  company,
  location,
  logo,
  roleType,
  specialisation,
  salary,
  applicationDeadline,
  datePosted,
}) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/jobs/${id}`);
  };

  const truncateText = (text: string | undefined, max = 200) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Flex justify="space-between" align="center">
        <Flex direction="column" gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="lg" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </Text>

          <Flex gap="xs" align="center" wrap="wrap" style={{ marginTop: 6 }}>
            {roleType && <Badge color="blue" variant="light">{roleType}</Badge>}
            {specialisation && <Badge color="green" variant="light">{specialisation}</Badge>}
            {salary && <Badge color="orange" variant="light">{salary}</Badge>}
          </Flex>

          <Text color="dimmed" size="sm" style={{ marginTop: 6 }}>
            {company} {location ? `・ ${location}` : ''}
          </Text>

          <Text size="sm" lineClamp={3} style={{ marginTop: 8 }}>
            {truncateText(description)}
          </Text>

          <Flex justify="space-between" align="center" style={{ marginTop: 10 }}>
            <Text size="xs" color="dimmed">
              Posted: {formatDate(datePosted)}
            </Text>
            <Text size="xs" color="dimmed">
              Deadline: {formatDate(applicationDeadline)}
            </Text>
          </Flex>
        </Flex>

        <img
          src={logo || '/WDCCLogo.png'}
          alt="Company Logo"
          width={60}
          height={60}
          style={{ borderRadius: '50%', marginLeft: 12, flexShrink: 0 }}
        />
      </Flex>

      <Flex justify="flex-end" mt="md">
        <Button variant="light" color="blue" size="sm" onClick={handleViewDetails}>
          View Details
        </Button>
      </Flex>
    </Card>
  );
};

export default JobListingItem;