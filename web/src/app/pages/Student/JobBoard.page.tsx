import { Divider, Grid, useMantineTheme, RangeSlider, Text, Stack } from '@mantine/core';
import Filter from '../../components/Filter/Filter';
import JobListing from '../../components/JobBoard/JobListing';
import { useEffect, useState } from 'react';
import SearchBar from '../../components/SearchBar/SearchBar';

export function JobBoard() {
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterSpecs, setFilterSpecs] = useState<string[]>([]);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState<[number, number]>([0, 100000]);
  const [search, setSearch] = useState('');
  const [postedByFilter, setPostedByFilter] = useState<'all' | 'alumni' | 'sponsors'>('all');
  const theme = useMantineTheme();

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = (value?: string) => {
    setSearch(value ?? searchInput);
  };

  return (
    <Grid justify="center" align="center">
      {!isPortrait ? (
        <>
          <Grid.Col span={2}>
            <Filter
              filterRoles={filterRoles}
              setFilterRoles={setFilterRoles}
              filterSpecs={filterSpecs}
              setFilterSpecs={setFilterSpecs}
              postedByFilter={postedByFilter}
              setPostedByFilter={setPostedByFilter}
              range={range}
              setRange={setRange}
            />
          </Grid.Col>

          <Grid.Col span={0.5} pl={40} style={{ alignSelf: 'stretch' }}>
            <Divider
              orientation="vertical"
              size="sm"
              style={{ height: '80%' }}
              mt={160}
              color={theme.colors.customWhite[0]}
            />
          </Grid.Col>

          <Grid.Col span={9}>
            <SearchBar
              search={searchInput}
              setSearch={setSearchInput}
              title="Job Board"
              placeholder="Search jobs"
              onSearch={handleSearch}
            />
            <JobListing
              filterRoles={filterRoles}
              filterSpecs={filterSpecs}
              filterSalary={range}
              search={search}
              postedByFilter={postedByFilter}
            />
          </Grid.Col>
        </>
      ) : (
        <Grid.Col span={12} mt={90}>
          <SearchBar
            search={searchInput}
            setSearch={setSearchInput}
            title="Job Board"
            placeholder="Search jobs"
            onSearch={handleSearch}
          />
          <Filter
            filterRoles={filterRoles}
            setFilterRoles={setFilterRoles}
            filterSpecs={filterSpecs}
            setFilterSpecs={setFilterSpecs}
            postedByFilter={postedByFilter}
            setPostedByFilter={setPostedByFilter}
            range={range}
            setRange={setRange}
          />
          <JobListing
            filterRoles={filterRoles}
            filterSpecs={filterSpecs}
            filterSalary={range}
            search={search}
            postedByFilter={postedByFilter}
          />
        </Grid.Col>
      )}
    </Grid>
  );
}
