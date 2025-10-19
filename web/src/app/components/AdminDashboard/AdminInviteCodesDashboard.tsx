import { useState, useEffect, FC } from 'react';
import { Group, Pagination, Stack, Table, Text } from '@mantine/core';
import { AdminReview } from '@/models/adminReview.model';
import { date2string } from '@/app/features/date/dateConverter';
import styles from './AdminDashboard.module.css';

interface InviteCode {
  id: string;
  code: string;
  isActive: boolean;
  useCount: number;
  maxUses: number;
  createdAt: Date;
}

interface Props {
  data: InviteCode[];
  onSelect?: (review: InviteCode) => void;
}

const AdminInviteCodesDashboard: FC<Props> = ({ data }) => {
  const [page, setPage] = useState(1);
  const entriesPerPage = 6;

  /* if data shrinks (e.g. after filtering) keep page in range */
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / entriesPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [data, page]);

  const totalPages = Math.max(1, Math.ceil(data.length / entriesPerPage));
  const startIdx = (page - 1) * entriesPerPage;
  const pageData = data.slice(startIdx, startIdx + entriesPerPage);

  useEffect(() => {
    console.log(data);
    console.log(pageData[0]);
    console.log(pageData[0]?.createdAt?.toLocaleDateString());
  }, [pageData])

  return (
    <Stack justify="center" align="center" gap="md" mt="md">
      <div className={styles.tableContainer}>
        <Table.ScrollContainer minWidth={500} h={500}>
          <Table stickyHeader stickyHeaderOffset={0} className={styles.table}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th className={styles.tableHeader}>Code</Table.Th>
                <Table.Th className={styles.tableHeader}>Active Status</Table.Th>
                <Table.Th className={styles.tableHeader}>Use Count</Table.Th>
                <Table.Th className={styles.tableHeader}>Max Uses</Table.Th>
                <Table.Th className={styles.tableHeader}>Created At</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {(pageData as InviteCode[]).map((code) => (
                <Table.Tr
                  key={code.id}
                  className={styles.tableRow}
                >
                  <Table.Td className={styles.leftRoundedCell}>{code.code}</Table.Td>

                  <Table.Td>{code.isActive ? "True" : "False"}</Table.Td>

                  <Table.Td>{code.useCount}</Table.Td>

                  <Table.Td>{code.maxUses}</Table.Td>

                  <Table.Td className={styles.rightRoundedCell}>{code?.createdAt?.toLocaleDateString()}</Table.Td>
                </Table.Tr>
              ))}

              {pageData.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed">
                      No requests match your filters
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Pagination.Root
          total={totalPages}
          value={page}
          onChange={setPage}
          className={styles.pagination}
          mt="xl"
        >
          <Group gap={20} justify="center">
            <Pagination.First aria-label="First page" />
            <Pagination.Previous aria-label="Previous page" />
            <Pagination.Items />
            <Pagination.Next aria-label="Next page" />
            <Pagination.Last aria-label="Last page" />
          </Group>
        </Pagination.Root>
      </div>
    </Stack>
  );
};

export default AdminInviteCodesDashboard;
