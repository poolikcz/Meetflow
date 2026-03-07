import React from "react";
import { EmptyState, Link, Text } from "@hubspot/ui-extensions";
import { hubspot } from "@hubspot/ui-extensions";

hubspot.extend<"settings">(() => <SettingsPage />);

const SettingsPage = () => {
  const setupGuideUrl = 'https://meetflow-woad.vercel.app';

  return (
    <>
      <EmptyState
        title="Meetflow setup"
        layout="horizontal"
        imageName='building'
      >
        <Text>
          Configure OAuth callback URLs and required scopes before publishing.
          <Link href={setupGuideUrl}> Open setup guide</Link>
        </Text>
      </EmptyState>
    </>
  );
};
