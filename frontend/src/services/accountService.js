import api from './api';

// Gửi email tài khoản cho Teacher
export const sendTeacherAccount = async (teacherId) => {
    const response = await api.post(`/Teachers/${teacherId}/send-account`);
    return response.data;
};

// Gửi email tài khoản cho Assistant
export const sendAssistantAccount = async (assistantId) => {
    const response = await api.post(`/Assistants/${assistantId}/send-account`);
    return response.data;
};

// Gửi email tài khoản cho Student
export const sendStudentAccount = async (studentId) => {
    const response = await api.post(`/Students/${studentId}/send-account`);
    return response.data;
};

// Gửi email tài khoản cho Parent
export const sendParentAccount = async (parentId) => {
    const response = await api.post(`/Parents/${parentId}/send-account`);
    return response.data;
};

export default {
    sendTeacherAccount,
    sendAssistantAccount,
    sendStudentAccount,
    sendParentAccount
};