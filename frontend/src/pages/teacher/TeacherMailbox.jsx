import MailboxPage from '../shared/MailboxPage';
import TeacherSidebar from '../../components/TeacherSidebar';

const TeacherMailbox = () => (
    <MailboxPage
        SidebarComponent={TeacherSidebar}
        headerTitle="Hộp thư"
        headerSubtitle="Thông báo dành cho giáo viên"
    />
);

export default TeacherMailbox;
