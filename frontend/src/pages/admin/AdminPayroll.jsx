import ManagerPayroll from '../storeOwner/ManagerPayroll';
import { adminNavGroups as navItems } from './adminNavItems';

const AdminPayroll = () => {
  return <ManagerPayroll navItems={navItems} title="Admin Panel" />;
};

export default AdminPayroll;
