// JobListingItem.ts
import { FC } from 'react';
import { Job } from '@/models/job.model';
import { UniversalJobCard, UniversalJobCardProps } from '../UniversalJobCard/UniversalJobCard';

interface JobListingItemProps {
  job: Job;
}

const JobListingItem: FC<JobListingItemProps> = ({ job }) => {
  const jobData: UniversalJobCardProps = {
    id: job.id,
    title: job.title,
    description: job.description,
    specialisation: job.specialisation,
    roleType: job.roleType,
    salary: job.salary,
    applicationDeadline: job.applicationDeadline,
    datePosted: job.datePosted,
    publisherID: job.publisherID,
    company: job.publisherID,
    location: job.location,
    isPostedByAlumni: job.isPostedByAlumni
  };

  return (
    <UniversalJobCard 
      data={jobData}
      variant="job-board"
      showDeleteButton={false}
      showEditButton={false}
    />
  );
};

export default JobListingItem;