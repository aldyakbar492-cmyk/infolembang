const { v2: cloudinary } = require("cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mengubah byte menjadi KB / MB / GB
function formatBytes(bytes) {
  if (!bytes) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return (
    (bytes / Math.pow(1024, i)).toFixed(2) +
    " " +
    sizes[i]
  );
}

module.exports = async (req, res) => {
    // CORS
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
    return res.status(200).end();
}
  try {

    // Statistik penggunaan
    const usage = await cloudinary.api.usage();

    // Cari semua gambar
    const imageResult = await cloudinary.search
      .expression("resource_type:image")
      .max_results(500)
      .execute();

    // Cari semua video
    const videoResult = await cloudinary.search
      .expression("resource_type:video")
      .max_results(500)
      .execute();

    // Upload terbaru
    const recentUploads = await cloudinary.search
      .sort_by("created_at", "desc")
      .max_results(5)
      .execute();

    res.status(200).json({

      totalImages: imageResult.total_count,

      totalVideos: videoResult.total_count,

      totalAssets:
        imageResult.total_count +
        videoResult.total_count,

      storageBytes: usage.storage?.usage || 0,
      storage: formatBytes(usage.storage?.usage || 0),
      // Batas paket (kalau akun Cloudinary punya limit — biasanya paket Free).
      // Kalau tidak tersedia di API (misal paket pay-as-you-go), nilainya null,
      // dan frontend akan melewati bagian Storage Warning tanpa memaksakan angka.
      storageLimitBytes: usage.storage?.limit ?? null,
      storageUsedPercent: usage.storage?.used_percent ?? null,

      bandwidthBytes: usage.bandwidth?.usage || 0,
      bandwidth: formatBytes(usage.bandwidth?.usage || 0),
      bandwidthLimitBytes: usage.bandwidth?.limit ?? null,

      // Penggunaan kredit paket (dipakai sebagai indikator "penuh" kalau
      // storage.limit tidak tersedia — umum di paket berbasis kredit)
      creditsUsage: usage.credits?.usage ?? null,
      creditsLimit: usage.credits?.limit ?? null,
      creditsUsedPercent: usage.credits?.used_percent ?? null,

      totalUploads: usage.requests || 0,

      totalTransformations:
        usage.transformations?.usage || 0,

      recentUploads: recentUploads.resources.map(item => ({
        public_id: item.public_id,
        format: item.format,
        created_at: item.created_at,
        secure_url: item.secure_url,
        resource_type: item.resource_type
      })),

      uploadTimeline: [],

      // ============================================================
      // DEBUG SEMENTARA — cuma untuk mengecek field asli yang dikirim
      // balik oleh Cloudinary untuk akun ini (supaya tahu kenapa limit
      // storage/bandwidth kelihatan "tanpa batas"). Field ini tidak
      // dipakai oleh dashboard, aman dibiarkan / dihapus kapan saja.
      // ============================================================
      _debugRawUsage: usage

    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};