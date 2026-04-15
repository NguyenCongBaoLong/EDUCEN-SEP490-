import MailboxPage from '../shared/MailboxPage';
import ParentSidebar from '../../components/ParentSidebar';

const ParentMailbox = () => (
    <MailboxPage
        SidebarComponent={ParentSidebar}
        headerTitle="Hộp thư"
        headerSubtitle="Thông báo dành cho phụ huynh"
    />
);

export default ParentMailbox;
