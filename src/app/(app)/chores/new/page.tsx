import { NewChoreFlow } from "@/components/chore/NewChoreFlow";
import { getRoomContext } from "@/data/rooms/queries";
import type { RoomRow } from "@/data/supabase/types";
import { getCurrentHousehold } from "@/data/household/queries";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";
import { HOUSEHOLD_TIME_ZONE } from "@/config/time";
import { todayDateOnly, weekday } from "@/domain/dates/date-only";
import { isShellTestMode } from "@/lib/test-mode";
import { roomFixtures } from "@/data/rooms/test-fixtures";
import { getSuggestionPreset } from "@/data/suggestions/catalog";
import type { ChoreFormValues } from "@/components/chore/ChoreForm";

export default async function AddChorePage({ searchParams }: PageProps<"/chores/new">) {
  const startDate = todayDateOnly(new Date(), HOUSEHOLD_TIME_ZONE);
  const suggestionId = (await searchParams).suggestion;
  const preset = getSuggestionPreset(typeof suggestionId === "string" ? suggestionId : undefined);
  let roomContext: { rooms: RoomRow[]; available: boolean } = { rooms: roomFixtures(), available: true };
  let featuresAvailable = true;
  if (!isShellTestMode()) {
    const household = await getCurrentHousehold();
    roomContext = household ? await getRoomContext(household.id) : { rooms: [], available: false };
    featuresAvailable = household ? await getCategoryFeaturesAvailable(household.id) : false;
  }
  const initialValues: ChoreFormValues = preset ? {
    name: preset.name, description: preset.description, iconKey: preset.iconKey, accentKey: preset.accentKey,
    recurrenceType: preset.schedule.recurrenceType, intervalCount: preset.schedule.intervalCount, anchorDate: startDate,
    weekdays: [weekday(startDate)], dayOfMonth: Number(startDate.slice(-2)),
  } : {
    name: "", description: "", iconKey: "sparkle", accentKey: "mint", recurrenceType: "weekly", intervalCount: 1,
    anchorDate: startDate, weekdays: [weekday(startDate)], dayOfMonth: Number(startDate.slice(-2)),
  };
  return (
      <NewChoreFlow
        initialValues={initialValues}
        rooms={roomContext.rooms}
        available={roomContext.available}
        featuresAvailable={featuresAvailable}
        preset={preset}
      />
  );
}
