import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { addMonths } from '@/lib/pembayaran';

export async function POST(request: NextRequest) {
  const fd = await request.formData();
  const penghuni_id = fd.get('penghuni_id')?.toString();
  const periode_awal = fd.get('periode_awal')?.toString();
  const periode_tipe = fd.get('periode_tipe')?.toString() || '1_tahun';
  const bulan_bebas = fd.get('bulan_bebas')?.toString();
  const diskon_persen = parseFloat(fd.get('diskon_persen')?.toString() || '0') || 0;
  const diskon_nominal = parseFloat(fd.get('diskon_nominal')?.toString() || '0') || 0;

  if (!penghuni_id || !periode_awal || !periode_tipe) {
    return Response.json({ ok: false, error: 'Penghuni, periode awal, dan tipe periode wajib diisi.' }, { status: 400 });
  }

  let bulan = 12;
  if (periode_tipe === '3_bulan') bulan = 3;
  else if (periode_tipe === '6_bulan') bulan = 6;
  else if (periode_tipe === '1_tahun') bulan = 12;
  else if (periode_tipe === 'bebas' && bulan_bebas) bulan = parseInt(bulan_bebas, 10) || 1;

  const periode_akhir = addMonths(periode_awal, bulan);

  const penghuniRes = await pool.query(
    'SELECT p.id, u.harga_bulanan FROM penghuni p JOIN unit_kos u ON p.unit_id = u.id WHERE p.id = $1',
    [penghuni_id]
  );
  if (penghuniRes.rows.length === 0) {
    return Response.json({ ok: false, error: 'Penghuni tidak ditemukan.' }, { status: 400 });
  }
  const hargaBulanan = parseFloat(penghuniRes.rows[0].harga_bulanan) || 0;
  const nominal_kosan = hargaBulanan * bulan;
  let total_kosan = nominal_kosan - diskon_nominal - (nominal_kosan * diskon_persen / 100);
  if (total_kosan < 0) total_kosan = 0;

  const client = await pool.connect();
  let sumTambahan = 0;
  try {
    const payRes = await client.query(
      `INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, bulan_bebas, nominal_kosan, diskon_persen, diskon_nominal, total_kosan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [penghuni_id, periode_awal, periode_akhir, periode_tipe, periode_tipe === 'bebas' ? bulan : null, nominal_kosan, diskon_persen, diskon_nominal, total_kosan]
    );
    const pembayaranId = payRes.rows[0].id;

    const add = async (jenis: string, nama: string, nominal: number) => {
      if (nominal > 0) {
        await client.query(
          'INSERT INTO pembayaran_tambahan (pembayaran_id, jenis, nama_item, nominal) VALUES ($1, $2, $3, $4)',
          [pembayaranId, jenis, nama, nominal]
        );
        sumTambahan += nominal;
      }
    };
    await add('sampah', 'Sampah', parseFloat(fd.get('tambahan_sampah')?.toString() || '0') || 0);
    await add('listrik', 'Listrik', parseFloat(fd.get('tambahan_listrik')?.toString() || '0') || 0);
    await add('wifi', 'Wifi', parseFloat(fd.get('tambahan_wifi')?.toString() || '0') || 0);
    const lainNom = parseFloat(fd.get('tambahan_lain_nominal')?.toString() || '0') || 0;
    if (lainNom > 0) {
      const lainNama = (fd.get('tambahan_lain_nama')?.toString() || 'Lain-lain').trim();
      await client.query(
        'INSERT INTO pembayaran_tambahan (pembayaran_id, jenis, nama_item, nominal) VALUES ($1, $2, $3, $4)',
        [pembayaranId, 'lain', lainNama, lainNom]
      );
      sumTambahan += lainNom;
    }
    if (sumTambahan > 0) {
      await client.query('UPDATE pembayaran SET total_kosan = total_kosan + $1 WHERE id = $2', [sumTambahan, pembayaranId]);
    }
  } finally {
    client.release();
  }
  return Response.json({ ok: true });
}
