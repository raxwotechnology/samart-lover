const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

/**
 * Create an in-app notification
 */
const createNotification = async ({ userId, type, title, message, link, metadata }) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      metadata,
    });
    return notification;
  } catch (error) {
    console.error('[Notification] Failed to create:', error.message);
    return null;
  }
};

/**
 * Send notification via all available channels (in-app + email)
 * @param {object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.userEmail - Target user email (for email channel)
 * @param {string} params.type - Notification type
 * @param {string} params.title - Title
 * @param {string} params.message - Message body
 * @param {string} params.link - Frontend route link
 * @param {object} params.metadata - Extra data
 * @param {object} params.emailContent - { subject, html } for email
 */
const sendNotification = async ({
  userId,
  userEmail,
  type,
  title,
  message,
  link,
  metadata,
  emailContent,
}) => {
  // 1. Create in-app notification
  const notification = await createNotification({ userId, type, title, message, link, metadata });

  // 2. Send email if email content and address provided
  if (emailContent && userEmail) {
    await sendEmail(userEmail, emailContent.subject, emailContent.html);
  }

  return notification;
};

module.exports = {
  createNotification,
  sendNotification,
};
