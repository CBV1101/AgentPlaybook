import type { CoverageRequest, FirsthandReport } from "@/lib/types";

export const mostRequested: CoverageRequest[] = [
  {
    id: "req-1",
    title: "What is the crowd like outside city hall tonight?",
    location: "Austin, TX",
    supporterCount: 148,
    createdAt: "2026-09-10T08:12:00.000Z",
  },
  {
    id: "req-2",
    title: "Are the river crossing points still open after the storm?",
    location: "Asheville, NC",
    supporterCount: 121,
    createdAt: "2026-09-09T21:40:00.000Z",
  },
  {
    id: "req-3",
    title: "Is the transit station operating on a normal schedule?",
    location: "Chicago, IL",
    supporterCount: 96,
    createdAt: "2026-09-09T16:05:00.000Z",
  },
  {
    id: "req-4",
    title: "What does the street look like after the overnight fire?",
    location: "Oakland, CA",
    supporterCount: 84,
    createdAt: "2026-09-08T11:22:00.000Z",
  },
];

export const latestReports: FirsthandReport[] = [
  {
    id: "rep-1",
    title: "Line around the block at the community cooling center",
    location: "Phoenix, AZ",
    excerpt:
      "People started lining up before noon. Volunteers were handing out water at the side entrance.",
    mediaKind: "video",
    capturedAt: "2026-09-10T09:00:00.000Z",
    publishedAt: "2026-09-10T09:18:00.000Z",
    reporterName: "Jordan M.",
    respondsToRequest: false,
  },
  {
    id: "rep-2",
    title: "Ferry terminal is running, but with long waits",
    location: "Seattle, WA",
    excerpt:
      "Boats are departing. Staff said delays are 45–60 minutes. Photos of the queue and departure board.",
    mediaKind: "photo",
    capturedAt: "2026-09-10T06:40:00.000Z",
    publishedAt: "2026-09-10T07:02:00.000Z",
    reporterName: "Priya S.",
    respondsToRequest: false,
  },
  {
    id: "rep-3",
    title: "Main square is quiet after this morning’s gathering",
    location: "Madison, WI",
    excerpt:
      "By early afternoon the square was mostly empty. A few people remained near the library steps.",
    mediaKind: "text",
    capturedAt: "2026-09-09T22:10:00.000Z",
    publishedAt: "2026-09-09T22:47:00.000Z",
    reporterName: "Alex R.",
    respondsToRequest: false,
  },
  {
    id: "rep-4",
    title: "Road crews still working the washed-out stretch of Route 9",
    location: "Hudson Valley, NY",
    excerpt:
      "One lane is open with a flagger. Local traffic is being waved through in groups of five.",
    mediaKind: "photo",
    capturedAt: "2026-09-09T18:50:00.000Z",
    publishedAt: "2026-09-09T19:31:00.000Z",
    reporterName: "Chris V.",
    respondsToRequest: false,
  },
];
