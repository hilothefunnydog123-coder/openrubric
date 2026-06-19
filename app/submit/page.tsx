import type { Metadata } from "next";
import { SimpleHeader } from "@/components/app/simple-header";
import { SubmitForm } from "@/components/app/submit-form";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = { title: "Submit a project" };

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SimpleHeader />
      <div className="mx-auto w-full max-w-wizard px-8 pb-20 pt-10">
        <Eyebrow className="mb-2">Participant · OpenRubric</Eyebrow>
        <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.025em]">Submit your project</h1>
        <SubmitForm />
      </div>
    </div>
  );
}
