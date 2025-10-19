import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../app/store';
import {
  Button,
  Flex,
  Image,
  Group,
  ActionIcon,
  Text,
  Menu,
  Burger,
  AppShell,
  Divider,
  Popover,
  ScrollArea,
  UnstyledButton,
  Badge,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Role } from '@/app/type/role';
import {
  IconUserCircle,
  IconBell,
  IconLogout,
  IconSettings,
  IconBriefcase2,
  IconSpeakerphone,
} from '@tabler/icons-react';
import styles from './Navbar.module.css';
import SettingModal from '../Modal/EditModal';
import { EditSetting } from '../Modal/EditSetting';
import { resetUser } from '../../features/user/userSlice';
import { notificationApi } from '@/api/notification';
import type { Notification, NotificationType } from '@/models/notification';

function timeAgo(d: string | Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  const t = (n: number, u: string) => `${n} ${u}${n > 1 ? 's' : ''} ago`;
  if (s < 60) return t(s, 'sec');
  const m = Math.floor(s / 60);
  if (m < 60) return t(m, 'min');
  const h = Math.floor(m / 60);
  if (h < 24) return t(h, 'hour');
  const dd = Math.floor(h / 24);
  if (dd < 7) return t(dd, 'day');
  return new Date(d).toLocaleDateString();
}

function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isRole = (value: any): value is Role =>
    value === Role.Member ||
    value === Role.Sponsor ||
    value === Role.Alumni ||
    value === Role.Admin;

  const role = useSelector((state: RootState) => state.user.role);
  const id = useSelector((state: RootState) => state.user.id);

  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!role || !id) {
        setUnread(0);
        return;
      }
      try {
        const [n, a] = await Promise.all([
          notificationApi.getNotifications(role, id),
          notificationApi.getAnnouncements(role),
        ]);
        if (!cancelled) setUnread((n?.unreadCount ?? 0) + (a?.unreadCount ?? 0));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [role, id]);

  const handleNotificationClick = async () => {
    if (!role || !id) return;
    try {
      const [n, a] = await Promise.all([
        notificationApi.getNotifications(role, id),
        notificationApi.getAnnouncements(role),
      ]);

      const merged = [...(n.notifications ?? []), ...(a.announcements ?? [])].sort(
        (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
      );

      setNotifs(merged);
      setNotifsOpen(true);

      await Promise.all([
        notificationApi.markAsRead(role, id),
        notificationApi.ackAnnouncements(role),
      ]);

      setUnread(0);
      setNotifs((curr) => curr.map((x) => ({ ...x, read: true })));
    } catch {}
  };

  const navLinks: { [key in Role]: { path: string; label: string }[] } = {
    [Role.Member]: [
      { path: '/jobs', label: 'Jobs' },
      { path: '/sponsors', label: 'Sponsors' },
      { path: '/alumni', label: 'Alumni' },
    ],
    [Role.Sponsor]: [
      { path: '/members', label: 'Members' },
      { path: '/alumni', label: 'Alumni' },
    ],
    [Role.Alumni]: [
      { path: '/members', label: 'Members' },
      { path: '/sponsors', label: 'Sponsors' },
      { path: '/alumni', label: 'Alumni' },
    ],
    [Role.Admin]: [
      { path: '/jobs', label: 'Job Board' },
      { path: '/members', label: 'Members' },
      { path: '/sponsors', label: 'Sponsors' },
      { path: '/alumni', label: 'Alumni' },
      { path: '/admin-dashboard', label: 'Dashboard' },
    ],
    [Role.Unknown]: [],
  };

  const handleLogout = () => {
    dispatch(resetUser());
    localStorage.removeItem('accessToken');
    navigate('/');
  };

  const handleProfileClick = () => {
    if (role) {
      const profilePath = {
        [Role.Member]: `/profile/member/${id}`,
        [Role.Sponsor]: `/profile/sponsor/${id}`,
        [Role.Alumni]: `/profile/alumni/${id}`,
        [Role.Admin]: '/profile/admin',
        [Role.Unknown]: '/profile/unknown',
      }[role as Role];
      navigate(profilePath);
    } else {
      navigate('/login');
    }
  };

  const handleJobClick = () => {
    if (role) {
      const jobPath = {
        [Role.Member]: '/jobs',
        [Role.Sponsor]: '/jobs',
        [Role.Alumni]: '/jobs',
        [Role.Admin]: '/jobs',
        [Role.Unknown]: '/jobs',
      }[role as Role];
      navigate(jobPath);
    } else {
      navigate('/login');
    }
  };

  const [opened, { toggle, open, close }] = useDisclosure();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [openModal, setOpenModal] = useState(false);
  const handleSetting = () => setOpenModal(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const iconFor = (t: NotificationType) =>
    t === 'announcement' ? <IconSpeakerphone size={18} /> : <IconBell size={18} />;

  return (
    <>
      <Flex
        className={styles.Navbar}
        gap="md"
        pt="lg"
        pr="lg"
        pl="lg"
        pb="lg"
        justify="space-between"
        align="center"
      >
        <NavLink to="/">
          <Image radius="md" h={20} src="/fsae_white_and_orange_logo.png" alt="FSAE Logo" />
        </NavLink>

        <Flex justify="center" align="center" style={{ flex: 1 }}>
          {!isMobile && role && isRole(role) && (
            <Group gap={100}>
              {navLinks[role].map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    borderBottom: isActive
                      ? `2px solid var(--mantine-color-customPapayaOrange-5)`
                      : 'none',
                    color: isActive
                      ? 'var(--mantine-color-customMercurySilver-5)'
                      : 'var(--mantine-color-white)',
                    paddingBottom: '2px',
                  })}
                >
                  <Text size="lg">{link.label}</Text>
                </NavLink>
              ))}
            </Group>
          )}
        </Flex>

        {/* Desktop Icons/Auth Buttons */}
        {/* Desktop Icons - Supposed to be seperate layout compared to mobile view */}
        {!isMobile && (
          <Flex gap="md" align="center">
            {role ? (
              <Group gap={20}>
                <ActionIcon size={35} variant="subtle" color="white" onClick={handleJobClick}
                 aria-label="See jobs">
                  <IconBriefcase2 size={35} />
                </ActionIcon>
                <ActionIcon size={35} variant="subtle" color="white" onClick={handleProfileClick}
                 aria-label="See profile">
                  <IconUserCircle size={35} />
                </ActionIcon>
                <ActionIcon size={35} variant="subtle" color="white" onClick={handleSetting}
                 aria-label="Go to settings">
                  <IconSettings size={35} />
                </ActionIcon>
                {role !== Role.Member && (
                  <ActionIcon size={35} variant="subtle" color="white">
                    <IconBell size={35} />
                  </ActionIcon>
                )}
                <ActionIcon size={35} variant="subtle" color="white" onClick={handleLogout}
                  aria-label="Logout">
                  <IconLogout size={35} />
                </ActionIcon>
              </Group>
            ) : (
              <>
                {/* Render Sign Up/Log In if not logged in */}
                <Menu>
                  <Menu.Target>
                    <Button variant="filled" color="customPapayaOrange">
                      Sign Up
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <NavLink to="/signup/member" style={{ textDecoration: 'none' }}>
                      <Menu.Item>Student</Menu.Item>
                    </NavLink>
                    <NavLink to="/signup/sponsor" style={{ textDecoration: 'none' }}>
                      <Menu.Item>Sponsor</Menu.Item>
                    </NavLink>
                    <NavLink to="/signup/alumni" style={{ textDecoration: 'none' }}>
                      <Menu.Item>Alumni</Menu.Item>
                    </NavLink>
                  </Menu.Dropdown>
                </Menu>
                <NavLink to="/login">
                  <Button color="var(--mantine-color-customAzureBlue-1)">Log In</Button>
                </NavLink>
              </>
            )}
          </Flex>
        )}

        {isMobile && (
          <Burger
            opened={opened}
            onClick={toggle}
            aria-label="Toggle navigation"
            size="sm"
            color="white"
          />
        )}
      </Flex>

      <AppShell
        header={{ height: 0 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
        hidden={!isMobile}
      >
        <AppShell.Navbar p="md" className={styles.mobileNavbar}>
          <Group justify="flex-end">
            <Burger
              opened={opened}
              onClick={toggle}
              aria-label="Toggle navigation"
              size="sm"
              color="white"
            />
          </Group>
          <Divider my="sm" />
          {role && isRole(role) ? (
            <>
              <Flex className={styles.mobileButtonsContainer}>
                <div className={styles.mobileTopGroup}>
                  <Divider my="sm" />
                  {/* Primary role-specific links first (exclude Jobs/Dashboard) */}
                  {navLinks[role]
                    .filter(
                      (link) =>
                        link.label !== 'Jobs' &&
                        link.label !== 'Job Board' &&
                        link.label !== 'Dashboard'
                    )
                    .map((link) => (
                      <Button
                        key={link.path}
                        size="xl"
                        radius="md"
                        variant="light"
                        color="customPapayaOrange"
                        fullWidth
                        className={styles.mobileButton}
                        onClick={() => {
                          navigate(link.path);
                          close();
                        }}
                      >
                        <Text size="xl">{link.label}</Text>
                      </Button>
                    ))}
                </div>

                <div className={styles.mobileBottomGroup}>
                  {/* Profile */}
                  <Button
                    size="xl"
                    radius="md"
                    variant="light"
                    color="customPapayaOrange"
                    fullWidth
                    className={styles.mobileButton}
                    onClick={() => {
                      handleProfileClick();
                      close();
                    }}
                    leftSection={<IconUserCircle size={36} />}
                  >
                    <Text size="xl">Profile</Text>
                  </Button>

                  {/* Job Board under Profile */}
                  <Button
                    size="xl"
                    radius="md"
                    variant="light"
                    color="customPapayaOrange"
                    fullWidth
                    className={styles.mobileButton}
                    onClick={() => {
                      handleJobClick();
                      close();
                    }}
                    leftSection={<IconBriefcase2 size={36} />}
                  >
                    <Text size="xl">Job Board</Text>
                  </Button>

                  {/* Settings */}
                  <Button
                    size="xl"
                    radius="md"
                    variant="light"
                    color="customPapayaOrange"
                    fullWidth
                    className={styles.mobileButton}
                    onClick={() => {
                      handleSetting();
                      close();
                    }}
                    leftSection={<IconSettings size={36} />}
                  >
                    <Text size="xl">Settings</Text>
                  </Button>

                  {/* Notifications (only for non-members) */}
                  {role !== Role.Member && (
                    <Button
                      size="xl"
                      radius="md"
                      variant="light"
                      color="customPapayaOrange"
                      fullWidth
                      className={styles.mobileButton}
                      onClick={() => {
                        close();
                      }}
                      leftSection={<IconBell size={36} />}
                    >
                      <Text size="xl">Notifications</Text>
                    </Button>
                  )}

                  {/* Logout (red) */}
                  <Button
                    size="xl"
                    radius="md"
                    variant="light"
                    color="red"
                    fullWidth
                    className={`${styles.mobileButton} ${styles.logoutButton}`}
                    onClick={() => {
                      handleLogout();
                      close();
                    }}
                    leftSection={<IconLogout size={36} />}
                  >
                    <Text size="xl">Logout</Text>
                  </Button>
                </div>
              </Flex>
            </>
          ) : (
            <>
              <Flex justify="center" align="center" gap="sm" direction="column">
                <Divider my="sm" />

                <Menu width={200}>
                  <Menu.Target>
                    <Button
                      size="xl"
                      radius="md"
                      variant="light"
                      color="customPapayaOrange"
                      fullWidth
                      className={styles.mobileButton}
                    >
                      Sign Up
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <NavLink to="/signup/member" onClick={close} className={styles.navLinkReset}>
                      <Menu.Item>Student</Menu.Item>
                    </NavLink>
                    <NavLink to="/signup/sponsor" onClick={close} className={styles.navLinkReset}>
                      <Menu.Item>Sponsor</Menu.Item>
                    </NavLink>
                    <NavLink to="/signup/alumni" onClick={close} className={styles.navLinkReset}>
                      <Menu.Item>Alumni</Menu.Item>
                    </NavLink>
                  </Menu.Dropdown>
                </Menu>

                <NavLink to="/login" onClick={close} className={styles.navLinkReset}>
                  <Button
                    size="xl"
                    radius="md"
                    variant="light"
                    color="customPapayaOrange"
                    fullWidth
                    className={styles.mobileButton}
                  >
                    Log In
                  </Button>
                </NavLink>
              </Flex>
            </>
          )}
        </AppShell.Navbar>
      </AppShell>

      <SettingModal
        opened={openModal}
        close={() => setOpenModal(false)}
        content={<EditSetting close={() => setOpenModal(false)} />}
        title="Settings"
      />
    </>
  );
}

export default Navbar;
