import { UploadCard } from "@/components/upload/UploadCard";
import { Header } from "@/components/shell/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <UploadCard />
      </div>
    </div>
  );
}
