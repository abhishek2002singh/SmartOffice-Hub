const Notification = require('../models/Notification');

// Create + emit via Socket.io
const send = async (io, { recipientId, senderId = null, type = 'INFO', title, message, link = null }) => {
  const notif = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    link,
  });

  if (io) {
    io.to(`user:${recipientId}`).emit('notification:new', {
      _id: notif._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link,
      isRead: false,
      createdAt: notif.createdAt,
    });
  }

  return notif;
};

// Get unread count
const unreadCount = async (userId) =>
  Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { send, unreadCount };
