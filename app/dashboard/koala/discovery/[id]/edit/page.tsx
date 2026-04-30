'use client';

import Link from 'next/link';
import { use } from 'react';

export default function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Edit Candidate</h3>
        <p className="text-sm text-gray-500 mb-4">Candidate ID: {id}</p>
        <p className="text-gray-600">Full edit form coming in Phase 2 when persistence is wired.</p>
        <Link
          href="/dashboard/koala/discovery"
          className="mt-4 inline-block px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
        >
          Back to Discovery
        </Link>
      </div>
    </div>
  );
}
