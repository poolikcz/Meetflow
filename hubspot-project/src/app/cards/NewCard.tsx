import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import { QuickAccessContent } from "./QuickAccessContent";

hubspot.extend<'crm.record.tab'>(() => <Extension />);

const Extension = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <QuickAccessContent
      title="Meet Flow calendar"
      description="Open meetings, calls and tasks in one clean calendar view."
      url={calendarUrl}
      linkLabel="Open calendar"
    />
  );
};

export default Extension;
