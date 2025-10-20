import { apiInstance } from '@/api/ApiInstance';

export enum AdminStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export async function login(email: string, password: string) {
  let role;
  try {
    const res = await apiInstance.get(`user/${email}/role`);
    role = res.data;
    console.log(role);

    if (!role) {
      throw Error('Invalid credentials');
    }
  } catch (e) {
    throw e;
  }

  let loginUrl;
  if (role === 'admin') {
    loginUrl = 'login-admin';
  } else if (role === 'alumni') {
    loginUrl = 'login-alumni';
  } else if (role === 'member') {
    loginUrl = 'login-member';
  } else if (role === 'sponsor') {
    loginUrl = 'login-sponsor';
  } else {
    throw Error('Unknown login type');
  }

  try {
    const res = await apiInstance.post(loginUrl, {
      email,
      password,
    });
    const { userId, token, verified, activated, adminStatus } = res.data;
    console.log('Activated', activated);
    console.log('Admin Status', adminStatus);

    if (!activated) {
      return { role: 'deactivated', id: userId };
    } else if (adminStatus === AdminStatus.PENDING) {
      localStorage.setItem('accessToken', token);
      return { role: 'pending', id: userId };
    } else if (adminStatus === AdminStatus.REJECTED) {
      return { role: 'rejected', id: userId };
    } else if (!verified) {
      return { role: 'unverified', id: userId };
    } else {
      localStorage.setItem('accessToken', token);
      console.log(`Successfully logged in as UserID ${userId}`);
      // console.log(role);
      return { role: role, id: userId }; // Return role and missing info flag
    }
  } catch (e) {
    throw e;
  }
}

export async function validateInviteCode(inviteCode: string, token: string | null) {
  try {
    if (!token) {
      throw Error('No token provided');
    }

    const res = await apiInstance.post(
      '/auth/validate-code',
      { code: inviteCode },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res;
  } catch (err) {
    throw err;
  }
}
