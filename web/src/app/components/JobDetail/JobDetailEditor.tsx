import { TextInput, Textarea, Button, Select, Group, Avatar } from '@mantine/core';
import { useState, useEffect } from 'react';
import styles from './JobDetail.module.css';
import { Job } from '@/models/job.model';
import { createJob, updateJob } from '@/api/job';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useUserAvatar } from '@/hooks/useUserAvatar';
import { useNavigate } from 'react-router-dom';

interface JobEditorModalProps {
  initialData?: Job | null;
  mode: 'create' | 'edit';
  isEditMode?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
}

interface FormData {
  title: string;
  specialisation: string;
  description: string;
  roleType: string;
  salary: string;
  applicationDeadline: string;
  applicationLink: string;
}

function normalizeSalary(value: string, type: string): string {
  const toAnnual = (hourly: number) => hourly * 40 * 52;
  const roundTo5000 = (num: number) => Math.round(num/1000) * 1000;
  if (type === 'hourly' && value.includes('-')) {
    const [min, max] = value.split('-').map(Number);

    return `${roundTo5000(toAnnual(min))}-${roundTo5000(toAnnual(max))}`
  } else if (type === 'salary') {
    return value;
  }
    else if (value === '') {
      return 'negotiable';
    }
  // if either voluntary or negotiable, return the type
  return type;
}

export function JobDetailEditor({ onSave, onCancel, initialData, mode }: JobEditorModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    specialisation: '',
    description: '',
    roleType: '',
    salary: '',
    applicationDeadline: '',
    applicationLink: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [salaryType, setSalaryType] = useState<string>('');
  const [salaryValue, setSalaryValue] = useState<string>('');

  const userRole = useSelector((state: RootState) => state.user.role);
  const userId = useSelector((state: RootState) => state.user.id);
  const { avatarUrl: posterAvatar } = useUserAvatar(userId);

  // Check if user can edit this job
  const canEdit = userRole === 'sponsor' || userRole === 'alumni';
  const isOwner = initialData && userId && initialData.publisherID === userId;
  const isEditMode = mode === 'edit';
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData && mode === 'edit') {
      // Convert ISO date to YYYY-MM-DD for input[type="date"]
      let deadline = '';
      if (initialData.applicationDeadline) {
        const d = new Date(initialData.applicationDeadline);
        deadline = d.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      setFormData({
        title: initialData.title || '',
        specialisation: initialData.specialisation || '',
        description: initialData.description || '',
        roleType: initialData.roleType || '',
        salary: initialData.salary || '',
        applicationDeadline: deadline,
        applicationLink: initialData.applicationLink || '',
      });
    } else if (mode === 'create') {
      // Reset form for creating new job
      setFormData({
        title: '',
        specialisation: '',
        description: '',
        roleType: '',
        salary: '',
        applicationDeadline: '',
        applicationLink: '',
      });
    }
  }, [initialData, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.specialisation.trim()) {
      newErrors.specialisation = 'Specialisation is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.roleType || formData.roleType.trim() === '') {
      newErrors.roleType = 'Role type is required';
    }

    // Validate roleType is one of the allowed values
    const validRoleTypes = ['Internship', 'Graduate', 'Junior'];
    if (formData.roleType && !validRoleTypes.includes(formData.roleType.trim())) {
      newErrors.roleType = 'Role type must be one of: Internship, Graduate, Junior';
    }

    if (!formData.applicationDeadline) {
      newErrors.applicationDeadline = 'Application deadline is required';
    }

    if (!formData.applicationLink.trim()) {
      newErrors.applicationLink = 'Application link is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault(); // Prevent page reload

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!canEdit) {
      toast.error('You do not have permission to edit jobs');
      return;
    }

    if (mode === 'edit' && !isOwner) {
      toast.error('You can only edit your own job posts');
      return;
    }

    if (mode === 'create' && !userId) {
      toast.error('User ID not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'edit' && initialData) {
        // Update existing job - ensure date format is consistent with create
        const updateData: any = {
          title: formData.title.trim(),
          specialisation: formData.specialisation.trim(),
          description: formData.description.trim(),
          roleType: formData.roleType.trim(),
          applicationDeadline: new Date(formData.applicationDeadline).toISOString(),
          applicationLink: formData.applicationLink.trim(),
        };

        updateData.salary = normalizeSalary(salaryValue, salaryType);

        console.log('Updating job with data:', updateData);
        await updateJob(initialData.id, updateData);
        toast.success('Job updated successfully!');
        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile/' + userRole + '/' + userId);
        }, 1000);
      } else {
        // Create new job - ensure all required fields are properly set
        const jobData: any = {
          title: formData.title.trim(),
          specialisation: formData.specialisation.trim(),
          description: formData.description.trim(),
          roleType: formData.roleType.trim(),
          applicationDeadline: new Date(formData.applicationDeadline).toISOString(),
          applicationLink: formData.applicationLink.trim(),
          datePosted: new Date().toISOString(),
          // Note: publisherID is automatically set by the backend from the current user
        };

        jobData.salary = normalizeSalary(salaryValue, salaryType);

        console.log('Creating job with data:', jobData);
        await createJob(jobData);
        toast.success('Job created successfully!');
        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile/' + userRole + '/' + userId);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error saving job:', error);
      if (error.response) {
        console.error('Backend response:', error.response.data);
        console.error('Backend status:', error.response.status);
        console.error('Backend headers:', error.response.headers);

        // Provide more specific error messages
        const errorMessage =
          error.response.data?.error?.message ||
          error.response.data?.message ||
          error.response.statusText ||
          'Unknown error';
        toast.error(
          `${mode === 'edit' ? 'Failed to update job' : 'Failed to create job'}: ${errorMessage}`
        );
      } else if (error.message) {
        toast.error(
          `${mode === 'edit' ? 'Failed to update job' : 'Failed to create job'}: ${error.message}`
        );
      } else {
        toast.error(mode === 'edit' ? 'Failed to update job' : 'Failed to create job');
      }
    } finally {
      setLoading(false);
    }
  };

  const roleTypeOptions = [
    { value: 'Internship', label: 'Internship' },
    { value: 'Graduate', label: 'Graduate' },
    { value: 'Junior', label: 'Junior' },
  ];

  if (!canEdit) {
    return (
      <main className={styles.jobDetailPageWrapper}>
        <div className={styles.contentWrapper}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Access Denied</h2>
            <p>You do not have permission to edit job posts.</p>
            <Button variant="outline" onClick={onCancel}>
              Go Back
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.jobDetailPageWrapper}>
      <form className={styles.contentWrapper} onSubmit={(e) => handleSubmit(e)}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          <Avatar src={posterAvatar} alt={'Company Logo'} className={styles.companyLogo} />
          <div className={styles.leftFields}>
            <Select
              label="Salary Type"
              data={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'salary', label: 'Salary' },
                { value: 'negotiable', label: 'Negotiable' },
                { value: 'voluntary', label: 'Voluntary' },
              ]}
              value={salaryType}
              onChange={(value) => {value &&
                setSalaryType(value);
                setSalaryValue('');
              }}
              placeholder="Select salary type"
              required
            />

            {salaryType === 'hourly' && (
              <Select
                label="Hourly Wage"
                data={[
                  { value: '20-25', label: '$20-$25/hr' },
                  { value: '25-30', label: '$25-$30/hr' },
                  { value: '30-35', label: '$30-$35/hr' },
                  { value: '35-40', label: '$35-$40/hr' },
                ]}
                value={salaryValue}
                onChange={(value) => {value &&
                  setSalaryValue(value);
                }}
                placeholder="Select Hourly Wage"
                required
              />
            )}

            {salaryType === 'salary' && (
              <Select
                label="Annual Salary"
                data={[
                  { value: '0-45000', label: '$0-$45,000' },
                  { value: '45000-50000', label: '$45,000-$50,000' },
                  { value: '55000-60000', label: '$55,000-$60,000' },
                  { value: '60000-65000', label: '$60,000-$65,000' },
                  { value: '65000-70000', label: '$65,000-$70,000' },
                  { value: '70000-75000', label: '$70,000-$75,000' },
                  { value: '75000-80000', label: '$75,000-$80,000' },
                  { value: '80000-85000', label: '$80,000-$85,000' },
                  { value: '85000-90000', label: '$85,000-$90,000' },
                  { value: '90000-95000', label: '$90,000-$95,000' },
                  { value: '95000-100000', label: '$95,000-$100,000+' },
                ]}
                value={salaryValue}
                onChange={(value) => {value &&
                  setSalaryValue(value);
                }}
                placeholder="Select Annual Salary"
                required
              />
            )}

            <TextInput
              label="Application Deadline"
              type="date"
              placeholder="Enter application deadline"
              className={styles.detailItem}
              value={formData.applicationDeadline}
              onChange={(e) => handleInputChange('applicationDeadline', e.currentTarget.value)}
              error={errors.applicationDeadline}
              required
            />
            <TextInput
              label="Application Link"
              placeholder="https://company.com/apply"
              className={styles.detailItem}
              value={formData.applicationLink}
              onChange={(e) => handleInputChange('applicationLink', e.currentTarget.value)}
              error={errors.applicationLink}
              required
            />
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          <div className={styles.titleRow}>
            <TextInput
              label="Job Title"
              placeholder="Job Title"
              className={styles.titleInput}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.currentTarget.value)}
              error={errors.title}
              required
            />
            <div className={styles.badgeField}>
              <label className={styles.badgeLabel}>Role Type</label>
              <Select
                data={roleTypeOptions}
                value={formData.roleType}
                onChange={(value) => handleInputChange('roleType', value || '')}
                placeholder="Select role type"
                error={errors.roleType}
                required
              />
            </div>
          </div>

          <TextInput
            label="Specialisation"
            placeholder="Enter specialisation"
            className={styles.fullWidth}
            value={formData.specialisation}
            onChange={(e) => handleInputChange('specialisation', e.currentTarget.value)}
            error={errors.specialisation}
            required
          />

          <Textarea
            label="About"
            placeholder="Type job description here"
            minRows={4}
            className={styles.fullWidth}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.currentTarget.value)}
            error={errors.description}
            required
          />

          <div className={styles.buttonRow}>
            <Group gap="sm">
              <Button type="submit" loading={loading}>
                {mode === 'edit' ? 'Update Job' : 'Save & Continue'}
              </Button>
              <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            </Group>
          </div>
        </div>
      </form>
    </main>
  );
}
