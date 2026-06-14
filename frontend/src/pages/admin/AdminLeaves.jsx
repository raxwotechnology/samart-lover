import ManagerLeaves from '../storeOwner/ManagerLeaves';
import { adminNavGroups as navItems } from './adminNavItems';

const AdminLeaves = () => {
  return <ManagerLeaves navItems={navItems} title="Admin Panel" />;
};

export default AdminLeaves;
