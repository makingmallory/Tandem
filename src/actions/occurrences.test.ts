import { beforeEach, describe, expect, it, vi } from "vitest";
import { rescheduleOccurrenceAction } from "@/actions/occurrences";

const refresh = vi.hoisted(() => vi.fn());
const getCurrentHousehold = vi.hoisted(() => vi.fn());
const rescheduleOccurrence = vi.hoisted(() => vi.fn());

const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ refresh, revalidatePath }));
vi.mock("@/data/household/queries", () => ({ getCurrentHousehold }));
vi.mock("@/data/completions/mutations", () => ({
  completeOccurrence: vi.fn(),
  undoOccurrenceCompletion: vi.fn(),
  skipOccurrence: vi.fn(),
  rescheduleOccurrence,
}));

describe("rescheduleOccurrenceAction", () => {
  const occurrenceId = "00000000-0000-4000-8000-000000000001";
  const householdId = "10000000-0000-4000-8000-000000000001";
  const scheduledDate = "2026-10-06";

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentHousehold.mockResolvedValue({ id: householdId });
  });

  it("reports success only after the requested occurrence and date are returned", async () => {
    rescheduleOccurrence.mockResolvedValue({
      data: { id: occurrenceId, scheduled_date: scheduledDate },
      error: null,
    });
    const formData = new FormData();
    formData.set("scheduledDate", scheduledDate);

    await expect(rescheduleOccurrenceAction(occurrenceId, { status: "idle" }, formData)).resolves.toEqual({
      status: "success",
      successMessage: "Occurrence rescheduled.",
      tone: "success",
      rescheduledDate: scheduledDate,
    });
    expect(rescheduleOccurrence).toHaveBeenCalledWith(householdId, occurrenceId, scheduledDate);
    expect(refresh).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");
  });

  it("does not report success when the mutation returns no confirmed occurrence", async () => {
    rescheduleOccurrence.mockResolvedValue({ data: null, error: null });
    const formData = new FormData();
    formData.set("scheduledDate", scheduledDate);

    await expect(rescheduleOccurrenceAction(occurrenceId, { status: "idle" }, formData)).resolves.toEqual({
      status: "error",
      formError: "We could not confirm the new date. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
