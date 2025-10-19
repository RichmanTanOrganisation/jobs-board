import { Checkbox, Title, Button, Stack, Modal, Flex, Text, RangeSlider } from '@mantine/core';
import styles from './Filter.module.css';
import { FC, useState } from 'react';
import { IconArrowDown } from '@tabler/icons-react';
import PostedByFilter from './PostedByFilter';

interface FilterProps {
  filterRoles: string[];
  setFilterRoles: (filterRoles: string[]) => void;
  filterSpecs: string[];
  setFilterSpecs: (filterSpecs: string[]) => void;
  postedByFilter?: 'all' | 'alumni' | 'sponsors';
  setPostedByFilter?: (filter: 'all' | 'alumni' | 'sponsors') => void;
  range?: [number, number];
  setRange?: (range: [number, number]) => void;
  color?: string;
  useRoles?: boolean;
}

const Filter: FC<FilterProps> = ({
  filterRoles,
  setFilterRoles,
  filterSpecs,
  setFilterSpecs,
  postedByFilter,
  setPostedByFilter,
  range,
  setRange,
  color = '#0091ff',
  useRoles = true,
}) => {
  const roles = [
    { value: 'NOT_FOR_HIRE', label: 'None' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'GRAD_ROLE', label: 'Graduate Roles' },
  ];

  const specialisations = [
    { value: 'BUSINESS', label: 'Business' },
    { value: 'COMPOSITES', label: 'Composites' },
    { value: 'MECHANICAL', label: 'Mechanical' },
    { value: 'ELECTRICAL', label: 'Electrical' },
    { value: 'AUTONOMOUS', label: 'Autonomous' },
    { value: 'RACE_TEAM', label: 'Race Team' },
  ];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const openModalWithLog = () => openModal();
  const closeModalWithLog = () => closeModal();
  const handleRolesChange = (values: string[]) => setFilterRoles(values);
  const handleSpecsChange = (values: string[]) => setFilterSpecs(values);

  return (
    <>
      {!isPortrait && (
        <Stack mt={70} pl={30}>
          <Title fs="italic" className={styles.filterHeading}>
            Filters
          </Title>
          {useRoles ? (
            <Stack>
              {range && (
                <Stack gap="xs">
                  <Text fw={800} className={styles.filterSubheading}>
                    Salary Range
                  </Text>
                  <Text fw={500}>
                    ${range[0].toLocaleString()} - ${range[1].toLocaleString()}
                  </Text>
                  <RangeSlider
                    min={0}
                    max={100000}
                    step={1000}
                    value={range}
                    onChange={setRange}
                    minRange={5000}
                    label={null}
                  />
                </Stack>
              )}
              <Checkbox.Group
                value={filterRoles}
                onChange={handleRolesChange}
                label="Role Type"
                labelProps={{ style: { color: color } }}
                classNames={{ label: styles.filterSubheading }}
              >
                {roles.map((role) => (
                  <Checkbox
                    key={role.value}
                    value={role.value}
                    label={role.label}
                    color={color}
                    className={styles.checkbox}
                    size="md"
                  />
                ))}
              </Checkbox.Group>
            </Stack>
          ) : null}
          <Stack>
            <Checkbox.Group
              value={filterSpecs}
              onChange={handleSpecsChange}
              label={useRoles ? 'Specs' : 'Industry'}
              labelProps={{ style: { color: color } }}
              classNames={{ label: styles.filterSubheading }}
            >
              {specialisations.map((role) => (
                <Checkbox
                  key={role.value}
                  value={role.value}
                  label={role.label}
                  color={color}
                  className={styles.checkbox}
                  size="md"
                />
              ))}
            </Checkbox.Group>
          </Stack>
          {useRoles && postedByFilter && setPostedByFilter ? (
            <Stack>
              <PostedByFilter value={postedByFilter} onChange={setPostedByFilter} color={color} />
            </Stack>
          ) : null}
        </Stack>
      )}
      {isPortrait && (
        <>
          <Flex justify="flex-end">
            <Button
              rightSection={<IconArrowDown size={14} />}
              variant="transparent"
              size="lg"
              onClick={openModalWithLog}
            >
              Filter
            </Button>
          </Flex>
          <Modal
            opened={isModalOpen}
            onClose={closeModalWithLog}
            centered
            classNames={{ content: styles.modal, header: styles.modalHeader }}
          >
            {range && (
              <Stack gap="xs">
                <Text fw={800} className={styles.filterSubheading}>
                  Salary Range
                </Text>
                <Text fw={500}>
                  ${range[0].toLocaleString()} - ${range[1].toLocaleString()}
                </Text>
                <RangeSlider
                  min={0}
                  max={100000}
                  step={1000}
                  value={range}
                  onChange={setRange}
                  minRange={5000}
                  label={null}
                />
              </Stack>
            )}
            <Stack>
              <Checkbox.Group
                value={filterRoles}
                onChange={handleRolesChange}
                label="Role Type"
                labelProps={{ style: { color: color } }}
                classNames={{ label: styles.filterSubheading }}
              >
                {roles.map((role) => (
                  <Checkbox
                    key={role.value}
                    value={role.value}
                    label={role.label}
                    color={color}
                    className={styles.checkbox}
                    size="md"
                  />
                ))}
              </Checkbox.Group>
            </Stack>
            <Stack>
              <Checkbox.Group
                value={filterSpecs}
                onChange={handleSpecsChange}
                label="Specs"
                labelProps={{ style: { color: color } }}
                classNames={{ label: styles.filterSubheading }}
              >
                {specialisations.map((role) => (
                  <Checkbox
                    key={role.value}
                    value={role.value}
                    label={role.label}
                    color={color}
                    className={styles.checkbox}
                    size="md"
                  />
                ))}
              </Checkbox.Group>
            </Stack>
            {useRoles && postedByFilter && setPostedByFilter ? (
              <Stack>
                <PostedByFilter value={postedByFilter} onChange={setPostedByFilter} color={color} />
              </Stack>
            ) : null}
          </Modal>
        </>
      )}
    </>
  );
};

export default Filter;
