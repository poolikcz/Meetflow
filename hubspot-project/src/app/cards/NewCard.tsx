import React from "react";
import { EmptyState, Link, Text } from "@hubspot/ui-extensions";
import { hubspot } from "@hubspot/ui-extensions";

hubspot.extend<'crm.record.tab'>(() => <Extension />);

const Extension = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <>
      <EmptyState
        title="Open Meetflow Calendar"
        layout="vertical"
        imageName='building'
      >
        <Text>
          View meetings, calls and tasks in the external calendar application.
          <Link href={calendarUrl}> Open calendar</Link>
        </Text>
      </EmptyState>
    </>
  );
};
