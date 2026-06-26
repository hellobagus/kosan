import RoomListPage from "@/components/RoomList";

export default function KamarKosongPage() {
  return (
    <RoomListPage
      title="Kamar Kosong"
      description="Daftar kamar yang tersedia untuk disewa"
      filter="AVAILABLE"
      showAdd={false}
    />
  );
}
