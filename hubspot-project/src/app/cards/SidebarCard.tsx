import React from "react";
import { Flex, Illustration, Link, Stack, Text } from "@hubspot/ui-extensions";
import { hubspot } from "@hubspot/ui-extensions";

hubspot.extend<'crm.record.sidebar'>(() => <SidebarCard />);

const SidebarCard = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <Flex direction="row" align="center" gap="sm">
      <Illustration name="meetings" alt="Meetflow" width={44} height={44} />

      <Stack direction="column" distance="flush">
        <Text format={{ fontWeight: 'demibold' }}>Meetflow calendar</Text>
        <Text variant="microcopy">Quick access to meetings, calls and tasks.</Text>
        <Link href={calendarUrl}>Open calendar</Link>
      </Stack>
    </Flex>
  );
};
