import { TextInput, Textarea, Button, Select, Group, Checkbox, Stack, Modal, Avatar, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import styles from './JobDetail.module.css';
import editorStyles from './JobDetailEditor.module.css';
import { useMediaQuery } from '@mantine/hooks';
import { Job } from '@/models/job.model';
import { createJob, updateJob, deleteJob } from '@/api/job';
import { createJobForm } from '@/api/tally';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { TallyFormBuilder, FormField } from '../TallyFormBuilder';
import { CreateFormRequest } from '@/schemas/tally/requests/create-form-request';
import { ZodError } from 'zod';
import { convertToTallyBlocks } from '@/utils/tallyFormUtils';
import { useUserAvatar } from '@/hooks/useUserAvatar';
import { useNavigate } from 'react-router-dom';
import { Specs } from '../../constants/specs';

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
    return `${roundTo5000(toAnnual(min))}-${roundTo5000(toAnnual(max))}`;
  } else if (type === 'salary') {
    return value;
  } else if (type === 'negotiable' || type === 'voluntary') {
    return type;
  } else if (value === '') {
    return 'negotiable';
  }
  
  // Default fallback
  return type || 'negotiable';
}

export function JobDetailEditor({ onSave, onCancel, initialData, mode }: JobEditorModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
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

  // Tally form state
  const [enableTallyForm, setEnableTallyForm] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formTitle, setFormTitle] = useState('Job Application Form');
  const [formFields, setFormFields] = useState<FormField[]>([]);

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

      // Set Tally form state based on existing job data
      if (initialData.tallyFormId) {
        setEnableTallyForm(true);
      }
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

    if (!formData.title.trim()) newErrors.title = 'Title is required';

    if (!formData.specialisation.trim()) newErrors.specialisation = 'Specialisation is required';

    if (!formData.description.trim()) newErrors.description = 'Description is required';

    // Validate roleType is required and one of the allowed values
    const validRoleTypes = ['Internship', 'Graduate', 'Junior'];

    if (!formData.roleType.trim()) {
      newErrors.roleType = 'Role type is required';
    } else if (!validRoleTypes.includes(formData.roleType.trim())) {
      newErrors.roleType = 'Role type must be one of: Internship, Graduate, Junior';
    }

    if (!formData.applicationDeadline) {
      newErrors.applicationDeadline = 'Application deadline is required';
    }

    // Validate salary type and value
    if (!salaryType) {
      newErrors.salaryType = 'Salary type is required';
    }

    if (salaryType && (salaryType === 'hourly' || salaryType === 'salary') && !salaryValue) {
      newErrors.salaryValue = 'Salary value is required';
    }

    // Either applicationLink OR enableTallyForm must be set (not both, not neither)
    if (!enableTallyForm && !formData.applicationLink.trim()) {
      newErrors.applicationLink = 'Application link is required when not using Tally form';
    }

    if (enableTallyForm && formData.applicationLink.trim()) {
      newErrors.applicationLink = 'Clear this field when using Tally form';
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

  // Form builder handlers
  const handleFormBuilderSave = (savedFormTitle: string, fields: FormField[]) => {
    setFormTitle(savedFormTitle);
    setFormFields(fields);
    setShowFormBuilder(false);
    toast.success(`Form configured with ${fields.length} fields!`);
  };

  const handleFormBuilderCancel = () => {
    setShowFormBuilder(false);
  };

  // convertToTallyBlocks moved to /web/src/utils/tallyFormUtils.ts (shared utility)

  /**
   * Pre-validate form blocks using backend Zod schemas
   * Prevents job creation if form would fail backend validation
   *
   * This is Tier 1 protection against limbo state (job exists but no form)
   */
  const validateFormBlocks = (blocks: any[]): { isValid: boolean; error?: string } => {
    try {
      // Use the exact same schema the backend will use
      CreateFormRequest.parse({
        name: formTitle,
        status: 'PUBLISHED',
        blocks: blocks
      });

      return { isValid: true };
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors for user
        const firstError = error.issues[0];
        const errorPath = firstError.path.join('.') || '(root)';
        const errorMessage = `Form validation failed: ${firstError.message} at ${errorPath}`;

        console.error('Form pre-validation failed:', error.issues);
        return { isValid: false, error: errorMessage };
      }

      return { isValid: false, error: 'Form validation failed' };
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
          datePosted: new Date().toISOString(),
          // Note: publisherID is automatically set by the backend from the current user
        };

        // Ensure roleType is one of the valid values
        const validRoleTypes = ['Internship', 'Graduate', 'Junior'];
        if (!validRoleTypes.includes(jobData.roleType)) {
          throw new Error(`Invalid roleType: ${jobData.roleType}. Must be one of: ${validRoleTypes.join(', ')}`);
        }

        // Only include applicationLink if NOT using Tally form
        if (!enableTallyForm && formData.applicationLink.trim()) {
          jobData.applicationLink = formData.applicationLink.trim();
        }

        // Set salary using normalized value
        jobData.salary = normalizeSalary(salaryValue || '', salaryType || '');

        // Tier 1: Pre-validate form BEFORE creating job (prevents limbo state)
        if (enableTallyForm) {
          const blocks = formFields.length > 0
            ? convertToTallyBlocks(formTitle, formFields)
            : [];

          const validation = validateFormBlocks(blocks);

          if (!validation.isValid) {
            // Form would fail backend validation - don't create job!
            toast.error(validation.error || 'Form configuration is invalid');
            setLoading(false);
            return; // Stop here - don't create job
          }

          console.log('Form pre-validation passed ✓');
        }

        // Validation passed (if enabled) - safe to create job
        console.log('Creating job with data:', jobData);
        console.log('Job data types:', {
          title: typeof jobData.title,
          specialisation: typeof jobData.specialisation,
          description: typeof jobData.description,
          roleType: typeof jobData.roleType,
          applicationDeadline: typeof jobData.applicationDeadline,
          datePosted: typeof jobData.datePosted,
          salary: typeof jobData.salary,
          applicationLink: typeof jobData.applicationLink
        });
        const createdJob = await createJob(jobData);
        toast.success('Job created successfully!');

        // Create Tally form if enabled (with Tier 2 rollback)
        if (enableTallyForm && createdJob.id) {
          try {
            const blocks = formFields.length > 0
              ? convertToTallyBlocks(formTitle, formFields)
              : [];

            await createJobForm(createdJob.id, {
              name: formTitle,
              status: 'PUBLISHED',
              blocks: blocks
            });
            toast.success('Application form created successfully!');
          } catch (formError: any) {
            console.error('Failed to create application form:', formError);

            // Tier 2: Rollback - delete the job we just created
            toast.warning('Form creation failed. Rolling back job creation...');

            try {
              await deleteJob(createdJob.id);
              toast.error('Job creation cancelled due to form validation failure. Please check your form configuration and try again.');
              setLoading(false);
              return; // Stop here - rollback complete
            } catch (deleteError: any) {
              console.error('Failed to rollback job creation:', deleteError);
              toast.error('Critical error: Job was created but form failed. Please contact support to resolve this issue.');
              setLoading(false);
              return; // Stop here - critical error
            }
          }
        }

        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile/' + userRole + '/' + userId);
        }, 1000);
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave();
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
      <main className={isMobile ? `${styles.jobDetailPageWrapper} ${editorStyles.editorWrapper}` : styles.jobDetailPageWrapper}>
        <div className={isMobile ? `${styles.contentWrapper} ${editorStyles.contentWrapper}` : styles.contentWrapper}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Access Denied</h2>
            <p>You do not have permission to edit job posts.</p>
            <Button variant="outline" onClick={onCancel}>Go Back</Button>
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
                // Clear error when user selects a value
                if (errors.salaryType) {
                  setErrors((prev) => ({
                    ...prev,
                    salaryType: '',
                  }));
                }
              }}
              placeholder="Select salary type"
              error={errors.salaryType}
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
                  // Clear error when user selects a value
                  if (errors.salaryValue) {
                    setErrors((prev) => ({
                      ...prev,
                      salaryValue: '',
                    }));
                  }
                }}
                placeholder="Select Hourly Wage"
                error={errors.salaryValue}
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
                  // Clear error when user selects a value
                  if (errors.salaryValue) {
                    setErrors((prev) => ({
                      ...prev,
                      salaryValue: '',
                    }));
                  }
                }}
                placeholder="Select Annual Salary"
                error={errors.salaryValue}
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

            {/* Only show application link field when NOT using Tally form */}
            {!enableTallyForm && (
              <TextInput
                label="Application Link"
                placeholder="https://company.com/apply"
                description="External URL where applicants can apply"
                className={styles.detailItem}
                value={formData.applicationLink}
                onChange={(e) => handleInputChange('applicationLink', e.currentTarget.value)}
                error={errors.applicationLink}
                required
              />
            )}

            {/* Show info message when editing job with Tally form */}
            {mode === 'edit' && enableTallyForm && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                title="Application Form Active"
                color="blue"
                variant="light"
                className={styles.detailItem}
              >
                This job uses an integrated application form. The form configuration cannot be modified after creation.
                You can view submissions in the job details page.
              </Alert>
            )}

            {/* Tally Form Creation Option (Create mode only) */}
            {mode === 'create' && (
              <Stack gap="sm" className={styles.detailItem}>
                <Checkbox
                  label="Use integrated application form"
                  description="Collect applications directly on your platform (replaces external link)"
                  checked={enableTallyForm}
                  onChange={(e) => {
                    setEnableTallyForm(e.currentTarget.checked);
                    // Clear external link when enabling Tally form
                    if (e.currentTarget.checked && formData.applicationLink) {
                      handleInputChange('applicationLink', '');
                    }
                  }}
                />
                {enableTallyForm && (
                  <Button
                    variant="light"
                    onClick={() => setShowFormBuilder(true)}
                    fullWidth
                  >
                    {formFields.length > 0
                      ? `Edit Form (${formFields.length} fields configured)`
                      : 'Configure Form Fields'
                    }
                  </Button>
                )}
              </Stack>
            )}
          </div>
        </div>

        <div className={isMobile ? `${styles.rightColumn} ${editorStyles.rightColumn}` : styles.rightColumn}>
          <div className={isMobile ? `${styles.titleRow} ${editorStyles.titleRow}` : styles.titleRow}>
            <TextInput
              label="Job Title"
              placeholder="Job Title"
              className={isMobile ? `${styles.titleInput} ${editorStyles.titleInput}` : styles.titleInput}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.currentTarget.value)}
              error={errors.title}
              required
            />
            <div className={isMobile ? `${styles.badgeField} ${editorStyles.badgeField}` : styles.badgeField}>
              <label className={isMobile ? `${styles.badgeLabel} ${editorStyles.badgeLabel}` : styles.badgeLabel}>Role Type</label>
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

          {/* dropdown to match the real designated fsae filters (carl+ben task) */}
          <Select
            label="Specialisation"
            placeholder="Select a specialisation"
            data={Specs}
            value={formData.specialisation}
            onChange={(value) => handleInputChange('specialisation', value ?? '')}
          />

          <Textarea
            label="About"
            placeholder="Type job description here"
            className={isMobile ? `${styles.fullWidth} ${editorStyles.fullWidth}` : styles.fullWidth}
            minRows={4}
            maxRows={11}
            autosize
            resize="vertical"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.currentTarget.value)}
            error={errors.description}
            required
          />

          <div className={isMobile ? `${styles.buttonRow} ${editorStyles.buttonRow}` : styles.buttonRow}>
            <Group gap="sm" wrap="wrap">
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

      {/* Form Builder Modal */}
      <Modal
        opened={showFormBuilder}
        onClose={handleFormBuilderCancel}
        title="Configure Application Form"
        size="xl"
        centered
      >
        <TallyFormBuilder
          initialFormTitle={formTitle}
          initialFields={formFields}
          onSave={handleFormBuilderSave}
          onCancel={handleFormBuilderCancel}
        />
      </Modal>
    </main>
  );
}