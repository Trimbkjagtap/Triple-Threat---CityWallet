import { PhoneFrame } from "@/components/consumer/PhoneFrame";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ios-bg p-8">
      <PhoneFrame>
        <div className="flex h-full items-center justify-center text-sm text-foreground/40">
          Phone screen
        </div>
      </PhoneFrame>
    </main>
  );
}
