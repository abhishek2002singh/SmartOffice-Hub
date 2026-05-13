const Notification = require('../models/Notification');
const { unreadCount } = require('../services/notification.service');

const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { recipient: req.user.userId };
    if (req.query.unread === 'true') filter.isRead = false;

    const [notifications, total, unread] = await Promise.all([
      Notification.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      unreadCount(req.user.userId),
    ]);

    res.json({ success: true, data: { notifications, total, unread, page, limit } });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

module.exports = { list, markRead, markAllRead };
