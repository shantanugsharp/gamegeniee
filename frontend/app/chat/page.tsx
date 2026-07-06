import ChatUI from "@/components/ChatUI";

export const metadata = {
  title: "Make a wish",
  description:
    "Chat with GameGenie. Tell it a mood, budget, or vibe — get personalized picks from 56,000+ PC games with rationales.",
  alternates: { canonical: "/chat" },
};

export default function ChatPage() {
  return <ChatUI />;
}
