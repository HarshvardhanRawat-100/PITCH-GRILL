import { UploadCard } from "@/components/upload/UploadCard";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090B10] text-gray-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <UploadCard />
      </main>
      <Footer />
    </div>
  );
}
