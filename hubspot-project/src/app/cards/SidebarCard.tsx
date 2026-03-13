import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import { QuickAccessContent } from "./QuickAccessContent";

hubspot.extend<'crm.record.sidebar'>(() => <SidebarCard />);

const SidebarCard = () => {
  const calendarUrl = 'https://meetflow-woad.vercel.app';

  return (
    <QuickAccessContent
      title="Meet Flow calendar"
      description="Quick access to meetings, calls and tasks."
      url={calendarUrl}
      linkLabel="Open calendar"
    />
  );
};

export default SidebarCard;
