import { Suspense } from "react";
import RoomTransferBoard from "@/components/RoomTransferBoard";

export default function PenghuniPindahPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      }
    >
      <RoomTransferBoard />
    </Suspense>
  );
}
