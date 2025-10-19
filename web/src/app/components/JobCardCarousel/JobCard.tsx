import { UniversalJobCard, UniversalJobCardProps } from '../UniversalJobCard/UniversalJobCard';

export interface JobCardProps {
  id: string;
  title: string;
  specialisation: string;
  description: string;
  roleType: string;
  salary?: string;
  applicationDeadline: string;
  datePosted: string;
  publisherID: string;
}

export function JobCard({ data, onJobDeleted, onEditJob }: {
  data: JobCardProps;
  onJobDeleted?: () => void;
  onEditJob?: (jobData: JobCardProps) => void;
}) {
  const universalData: UniversalJobCardProps = {
    id: data.id,
    title: data.title,
    specialisation: data.specialisation,
    description: data.description,
    roleType: data.roleType,
    salary: data.salary,
    applicationDeadline: data.applicationDeadline,
    datePosted: data.datePosted,
    publisherID: data.publisherID
  };

  return (
    <UniversalJobCard
      data={universalData}
      variant="sponsor-profile"
      showDeleteButton={true}
      showEditButton={true}
      onJobDeleted={onJobDeleted}
      onEditJob={onEditJob}
    />
  );
}
