import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import { QuickAccessContent } from "./QuickAccessContent";

hubspot.extend<'helpdesk.sidebar'>(() => <HelpdeskSidebarCard />);

const HelpdeskSidebarCard = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <QuickAccessContent
      title="Meet Flow support view"
      description="Open customer meetings, calls and tasks from help desk."
      url={calendarUrl}
      linkLabel="Open calendar"
    />
  );
};

export default HelpdeskSidebarCard;
