import { BoardReviewAdmin } from "@/components/board-review/admin";

// Catapult-only setup + results (middleware requires the research cookie).
export const dynamic = "force-dynamic";
export default function Page() { return <BoardReviewAdmin client="pvas" />; }
