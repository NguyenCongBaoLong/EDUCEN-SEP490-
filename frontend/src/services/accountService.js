import api from './api';

// Gửi email tài khoản cho Teacher
export const sendTeacherAccount = async (teacherId, username, password) => {
    const response = await api.post(`/Teachers/send-account/${teacherId}`, {
        username,
        password
    });
    return response.data;
};

// Gửi email tài khoản cho Assistant
export const sendAssistantAccount = async (assistantId, username, password) => {
    const response = await api.post(`/Assistants/send-account/${assistantId}`, {
        username,
        password
    });
    return response.data;
};

// Gửi email tài khoản cho Student
export const sendStudentAccount = async (studentId, username, password) => {
    const response = await api.post(`/Students/send-account/${studentId}`, {
        username,
        password
    });
    return response.data;
};

// Gửi email tài khoản cho Parent
export const sendParentAccount = async (parentId) => {
    const response = await api.post(`/Parents/send-account/${parentId}`);
    return response.data;
};

export default {
    sendTeacherAccount,
    sendAssistantAccount,
    sendStudentAccount,
    sendParentAccount
};
