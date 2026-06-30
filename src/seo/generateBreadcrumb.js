// src/seo/generateBreadcrumb.js
//
// Utility kecil untuk bangun array breadcrumb yang dipakai BERSAMAAN
// untuk dua tujuan: (1) render UI breadcrumb visual, (2) input ke breadcrumbSchema().
// Memisahkan ini dari generateSchema.js supaya komponen UI tidak perlu import
// seluruh schema builder hanya untuk dapat struktur breadcrumb.

/**
 * @param {{name: string, path: string}[]} segments - tanpa root, root otomatis ditambahkan
 * @returns {{name: string, item: string}[]}
 */
export function generateBreadcrumb(segments) {
  return [
    { name: 'Home', item: '/' },
    ...segments.map(s => ({ name: s.name, item: s.path })),
  ]
}
