import React from "react";
import { Flex, Illustration, Link, Stack, Text } from "@hubspot/ui-extensions";

type QuickAccessContentProps = {
  title: string;
  description: string;
  url: string;
  linkLabel: string;
};

export function QuickAccessContent({
  title,
  description,
  url,
  linkLabel,
}: QuickAccessContentProps) {
  return (
    <Flex direction="row" align="center" gap="sm">
      <Illustration name="meetings" alt="Meetflow" width={44} height={44} />

      <Stack direction="column" distance="flush">
        <Text format={{ fontWeight: 'demibold' }}>{title}</Text>
        <Text variant="microcopy">{description}</Text>
        <Link href={url}>{linkLabel}</Link>
      </Stack>
    </Flex>
  );
}
