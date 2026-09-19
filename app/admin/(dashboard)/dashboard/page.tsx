import 'server-only';
import AdminOverviewPage from '../page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Operational Dashboard | Mana Grameena',
  description: 'Live PostgreSQL operational metrics and administrative controls.',
};

export default AdminOverviewPage;
