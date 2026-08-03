import { Dashboard } from '@/components/admin/Dashboard';

/**
 * Manager console.
 *
 * A thin server component: everything below it is a client island, because the
 * console reads the API with a bearer token held in browser memory rather than
 * rendering server-side. The demo fixtures that used to feed this page are gone
 * — `lib/admin/demo-data.ts` remains only as a shape reference for tests.
 */
export default function AdminDashboardPage() {
  return <Dashboard />;
}
