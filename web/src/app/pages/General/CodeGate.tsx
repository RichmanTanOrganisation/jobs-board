import { TextInput, Flex, Title, Button } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiInstance } from '@/api/ApiInstance';
import { adminApi } from '@/api/admin';
import { validateInviteCode } from '@/api/login';

export function CodeGate() {
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [attempts, setAttempts] = useState(0);
  const loginCase = location.state?.case ?? 'unknown';
  const email = location.state?.email ?? 'unknown';
  const password = location.state?.password ?? 'unknown';
  const id = location.state?.id ?? 'unknown';

  const MAX_ATTEMPTS = 15;
  const attemptsKey = `failedAttempts-${id}`;

  useEffect(() => {
    const savedAttempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10);
    setAttempts(savedAttempts);
  }, [attemptsKey]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Token does not exist.');
        return;
      }
      const res = await validateInviteCode(inputValue, token);

      setAttempts(0);
      localStorage.removeItem(attemptsKey);

      if (res.data.adminStatus === 'approved') {
        console.log('Code validated:', res.data);
        toast.success('Code Validated');
        navigate('/login', {
          replace: true,
          state: { email, password },
        });
      }
    } catch (error: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem(attemptsKey, newAttempts.toString());
      if (newAttempts >= MAX_ATTEMPTS) {
        toast.error('Too many failed attempts. Please contact admin.');
      } else {
        toast.error(`Invalid code. Attempt ${newAttempts}/${MAX_ATTEMPTS}`);
      }
    }
  };

  let message = '';
  switch (loginCase) {
    case 'deactivated':
      message = 'Account deactivated. Contact admin for assistance.';
      break;
    case 'rejected':
      message = 'Your account was rejected. Contact admin for assistance.';
      break;
    case 'pending':
      message =
        'Your account status is pending. Enter an invite code or contact support for details.';
      break;
    default:
      message = 'Access denied';
  }

  return (
    <Flex justify="center" align="center" direction="column" w="100%" h="100%" p="md">
      <Title order={2} ta="center" mb="md">
        {message}
      </Title>
      {loginCase === 'pending' && (
        <Flex direction="column" gap="sm" w="100%" style={{ maxWidth: 400 }}>
          <TextInput
            label="Enter Invite Code"
            placeholder="Type in your invite code"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            disabled={attempts >= MAX_ATTEMPTS}
          />
          <Button onClick={handleSubmit}>Submit</Button>
        </Flex>
      )}
      {attempts > 0 && attempts < MAX_ATTEMPTS && (
        <div style={{ marginTop: 10, color: 'gray' }}>
          Attempts remaining: {MAX_ATTEMPTS - attempts}
        </div>
      )}
    </Flex>
  );
}
