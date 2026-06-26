import RoomListPage from "@/components/RoomList";

export default function KamarTerisiPage() {
  return (
    <RoomListPage
      title="Kamar Terisi"
      description="Daftar kamar yang sedang ditempati penghuni"
      filter="OCCUPIED"
      showAdd={false}
    />
  );
}
