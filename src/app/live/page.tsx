import { PageHeader } from "@/components/ui";
import { LiveSession } from "./LiveSession";

export const metadata = { title: "Live lesson · RTR" };

export default function LivePage() {
  return (
    <>
      <PageHeader eyebrow="Live" title={<>Read the room, <span className="glow-text">as it happens.</span></>} />
      <LiveSession />
    </>
  );
}
