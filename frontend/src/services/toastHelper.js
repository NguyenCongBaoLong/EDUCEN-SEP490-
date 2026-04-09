import toast from 'react-hot-toast';

// Map English validation error messages to Vietnamese
const errorMessageMap = {
    // Required fields
    'is required': 'bắt buộc',
    'required': 'bắt buộc',
    
    // StringLength
    'cannot exceed': 'không được vượt quá',
    'must be between': 'phải có độ dài từ',
    'must be at least': 'phải có ít nhất',
    'minimum': 'tối thiểu',
    'maximum': 'tối đa',
    'characters': 'ký tự',
    
    // Email
    'invalid email format': 'định dạng email không hợp lệ',
    'email is required': 'Email bắt buộc',
    'email cannot exceed': 'Email không được vượt quá',
    'email cannot be only whitespace': 'Email không được để trống',
    
    // Phone
    'invalid phone number format': 'định dạng số điện thoại không hợp lệ',
    'phone number cannot exceed': 'Số điện thoại không được vượt quá',
    
    // Regular expression (whitespace)
    'cannot be only whitespace': 'không được chỉ có khoảng trắng',
    'cannot be empty': 'không được để trống',
    
    // Range validation
    'must be between 0 and 6': 'phải từ 0 đến 6 (0=Chủ nhật, 1=Thứ 2,...)',
    'must be greater than or equal to 0': 'phải lớn hơn hoặc bằng 0',
    'must be greater than or equal to 1': 'phải lớn hơn hoặc bằng 1',
    
    // Pattern/Regex
    'the field': 'Trường',
    'must match the regular expression': 'không đúng định dạng',
    'contains invalid characters': 'chứa ký tự không hợp lệ',
    
    // Generic
    'invalid': 'không hợp lệ',
    'cannot be null': 'không được để trống',
};

// Translate English error message to Vietnamese
function translateErrorMessage(englishMsg) {
    if (!englishMsg) return 'Giá trị không hợp lệ';
    
    let vietnameseMsg = englishMsg;
    let fieldName = '';
    
    // Extract field name from message (e.g., "FullName is required" -> "FullName")
    const fieldMatch = englishMsg.match(/^([A-Za-z]+)\s+/);
    if (fieldMatch) {
        fieldName = fieldMatch[1].toLowerCase();
    }
    
    // Map common field names first
    const fieldNameMap = {
        'classname': 'Tên lớp',
        'classnames': 'Tên lớp',
        'description': 'Mô tả',
        'syllabuscontent': 'Nội dung giáo trình',
        'subjectid': 'Môn học',
        'subjectname': 'Tên môn học',
        'teacherid': 'Giáo viên',
        'assistantid': 'Trợ giảng',
        'startdate': 'Ngày bắt đầu',
        'enddate': 'Ngày kết thúc',
        'status': 'Trạng thái',
        'scheduleslots': 'Lịch học',
        'pricepersession': 'Đơn giá',
        'roomid': 'Phòng học',
        'roomname': 'Tên phòng',
        'gradeid': 'Khối lớp',
        'gradename': 'Tên khối lớp',
        'fullname': 'Họ tên',
        'email': 'Email',
        'phonenumber': 'Số điện thoại',
        'username': 'Tên đăng nhập',
        'password': 'Mật khẩu',
        'address': 'Địa chỉ',
        'dayofweek': 'Ngày trong tuần',
        'starttime': 'Giờ bắt đầu',
        'endtime': 'Giờ kết thúc',
        'specialization': 'Chuyên môn',
        'degree': 'Bằng cấp',
        'supportlevel': 'Cấp độ hỗ trợ',
        'enrollmentstatus': 'Trạng thái ghi danh',
        'planname': 'Tên gói',
        'price': 'Giá',
        'limitusers': 'Giới hạn người dùng',
        'storagelimit': 'Giới hạn lưu trữ',
        'features': 'Tính năng',
        'studentids': 'Danh sách học sinh',
        'parentids': 'Danh sách phụ huynh',
    };
    
    // Translate common phrases
    for (const [eng, vie] of Object.entries(errorMessageMap)) {
        vietnameseMsg = vietnameseMsg.replace(new RegExp(eng, 'gi'), vie);
    }
    
    // Format: "FullName is required" -> "Họ tên bắt buộc"
    if (fieldName && fieldNameMap[fieldName]) {
        if (vietnameseMsg.includes('bắt buộc')) {
            return `${fieldNameMap[fieldName]} bắt buộc`;
        }
        if (vietnameseMsg.includes('không được vượt quá')) {
            const charMatch = vietnameseMsg.match(/(\d+)\s*ký tự/);
            if (charMatch) {
                return `${fieldNameMap[fieldName]} không được vượt quá ${charMatch[1]} ký tự`;
            }
            return `${fieldNameMap[fieldName]} không hợp lệ`;
        }
        if (vietnameseMsg.includes('không đúng định dạng')) {
            return `${fieldNameMap[fieldName]} không đúng định dạng`;
        }
        if (vietnameseMsg.includes('không được chỉ có khoảng trắng')) {
            return `${fieldNameMap[fieldName]} không được để trống`;
        }
        if (vietnameseMsg.includes('phải có độ dài từ')) {
            return `${fieldNameMap[fieldName]} ${vietnameseMsg}`;
        }
        if (vietnameseMsg.includes('phải có ít nhất')) {
            return `${fieldNameMap[fieldName]} ${vietnameseMsg}`;
        }
    }
    
    return vietnameseMsg;
}

/**
 * Parse validation errors trực tiếp với translate to Vietnamese
 */
export function parseValidationErrors(errorResponse) {
    const data = errorResponse?.data;
    
    if (!data) {
        return { hasErrors: false, message: 'Lỗi không xác định', details: null };
    }

    // ASP.NET Core ModelState validation (format từ Program.cs)
    if (data.errors && Array.isArray(data.errors)) {
        const fieldErrors = {};
        let errorMessages = [];

        data.errors.forEach(err => {
            if (err.Field && err.Errors) {
                // Map common field names from BE to Vietnamese
                const fieldNameMap = {
                    'ClassName': 'Tên lớp',
                    'ClassNames': 'Tên lớp',
                    'Description': 'Mô tả',
                    'SyllabusContent': 'Nội dung giáo trình',
                    'SubjectId': 'Môn học',
                    'SubjectName': 'Tên môn học',
                    'TeacherId': 'Giáo viên',
                    'AssistantId': 'Trợ giảng',
                    'StartDate': 'Ngày bắt đầu',
                    'EndDate': 'Ngày kết thúc',
                    'Status': 'Trạng thái',
                    'ScheduleSlots': 'Lịch học',
                    'PricePerSession': 'Đơn giá',
                    'RoomId': 'Phòng học',
                    'RoomName': 'Tên phòng',
                    'GradeId': 'Khối lớp',
                    'GradeName': 'Tên khối lớp',
                    'FullName': 'Họ tên',
                    'Email': 'Email',
                    'PhoneNumber': 'Số điện thoại',
                    'Username': 'Tên đăng nhập',
                    'Password': 'Mật khẩu',
                    'DayOfWeek': 'Ngày trong tuần',
                    'StartTime': 'Giờ bắt đầu',
                    'EndTime': 'Giờ kết thúc',
                    'Specialization': 'Chuyên môn',
                    'Degree': 'Bằng cấp',
                    'SupportLevel': 'Cấp độ hỗ trợ',
                    'EnrollmentStatus': 'Trạng thái ghi danh',
                    'Address': 'Địa chỉ',
                    'PlanName': 'Tên gói',
                    'Price': 'Giá',
                    'LimitUsers': 'Giới hạn người dùng',
                    'StorageLimit': 'Giới hạn lưu trữ',
                    'Features': 'Tính năng',
                    'StudentIds': 'Danh sách học sinh',
                    'ParentIds': 'Danh sách phụ huynh',
                };

                const displayName = fieldNameMap[err.Field] || err.Field;
                const messages = Array.isArray(err.Errors) ? err.Errors : [err.Errors];
                
                // Translate each error message to Vietnamese
                const translatedMessages = messages.map(m => translateErrorMessage(m));
                
                fieldErrors[displayName] = translatedMessages;
                errorMessages.push(...translatedMessages.map(m => `• ${displayName}: ${m}`));
            }
        });

        if (errorMessages.length > 0) {
            return {
                hasErrors: true,
                message: data.message || 'Dữ liệu đầu vào không hợp lệ',
                details: fieldErrors,
                formattedMessage: errorMessages.join('\n')
            };
        }
    }

    // Simple message (không có errors array) - also translate if English
    if (data.message) {
        // Translate common English messages to Vietnamese
        let translatedMessage = data.message;
        
        const commonMessages = {
            'Invalid input': 'Dữ liệu đầu vào không hợp lệ',
            'Bad request': 'Yêu cầu không hợp lệ',
            'Validation failed': 'Kiểm tra dữ liệu thất bại',
            'Object reference not set': 'Dữ liệu không tồn tại',
            'cannot be null': 'không được để trống',
            'not found': 'không tìm thấy',
            'already exists': 'đã tồn tại',
            'failed': 'thất bại',
            'error': 'lỗi',
        };
        
        for (const [eng, vie] of Object.entries(commonMessages)) {
            translatedMessage = translatedMessage.replace(new RegExp(eng, 'gi'), vie);
        }
        
        return {
            hasErrors: true,
            message: translatedMessage,
            details: null,
            formattedMessage: translatedMessage
        };
    }

    return { hasErrors: false, message: 'Lỗi không xác định', details: null };
}

/**
 * Hiển thị toast error với thông báo lỗi chi tiết từ API validation (đã dịch sang tiếng Việt)
 * @param {object} error - Error object từ axios catch
 * @param {string} defaultMessage - Message mặc định nếu không parse được lỗi
 */
export function showValidationError(error, defaultMessage = 'Có lỗi xảy ra') {
    const parsed = parseValidationErrors(error);
    
    if (parsed.hasErrors && parsed.formattedMessage) {
        // Hiển thị chi tiết lỗi đã dịch sang tiếng Việt
        toast.error(parsed.formattedMessage, { 
            duration: 5000,
            style: {
                maxWidth: '500px',
                whiteSpace: 'pre-line'
            }
        });
    } else {
        // Fallback to default message or response data message
        toast.error(error.response?.data?.message || defaultMessage);
    }
}

/**
 * Hiển thị toast error đơn giản (legacy compatibility)
 */
export function showError(message) {
    toast.error(message);
}

/**
 * Hiển thị toast success
 */
export function showSuccess(message) {
    toast.success(message);
}

export default { showValidationError, showError, showSuccess };