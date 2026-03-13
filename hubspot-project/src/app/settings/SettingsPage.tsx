import React from "react";
import { EmptyState, Link, Text } from "@hubspot/ui-extensions";
import { hubspot } from "@hubspot/ui-extensions";

hubspot.extend<"settings">(() => <SettingsPage />);

const SettingsPage = () => {
  const setupGuideUrl = 'https://meetflow-woad.vercel.app';

  return (
    <>
      <EmptyState
        title="Meetflow access"
        layout="horizontal"
        imageName='building'
      >
        <Text>
          Open the calendar app directly from HubSpot settings.
          <Link href={setupGuideUrl}> Open Meetflow</Link>
        </Text>
      </EmptyState>
    </>
  );
};
