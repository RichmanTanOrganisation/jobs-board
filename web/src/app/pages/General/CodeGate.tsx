import { Flex, Title } from '@mantine/core';

export function CodeGate() {
  return (
    <Flex
      justify="center"
      align="center"
      w="100%"
      h="100%"
      p="md"
    >
      <Title order={2} ta="center">
        Account deactivated. Contact admin for assistance.
      </Title>
    </Flex>
  );
}
