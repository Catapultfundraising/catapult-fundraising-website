import { BoardReviewMember } from "@/components/board-review/member";

// Board / committee member review form (middleware requires a member or Catapult login).
export const dynamic = "force-dynamic";
export default function Page() { return <BoardReviewMember client="pvas" />; }
