import MailboxPage from '../shared/MailboxPage';
import StudentSidebar from '../../components/StudentSidebar';

const StudentMailbox = () => (
    <MailboxPage
        SidebarComponent={StudentSidebar}
        headerTitle="Hộp thư"
        headerSubtitle="Thông báo dành cho học sinh"
    />
);

export default StudentMailbox;
