import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import { QuickAccessContent } from "./QuickAccessContent";

hubspot.extend<'crm.preview'>(() => <PreviewCard />);

const PreviewCard = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <QuickAccessContent
      title="Meetflow preview"
      description="Open calendar access directly from CRM preview panels."
      url={calendarUrl}
      linkLabel="Open calendar"
    />
  );
};

export default PreviewCard;
