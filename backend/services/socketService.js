const Chat = require('../models/Chat');
const User = require('../models/User');

module.exports = function (io) {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user_online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('send_message', async (data) => {
      try {
        const { chatId, senderId, content, type, fileUrl } = data;

        const message = await Chat.addMessage({
          chatId,
          senderId,
          content,
          type: type || 'text',
          fileUrl,
        });

        // Get sender info for the emitted message
        const sender = await User.findById(senderId);

        io.to(chatId).emit('new_message', {
          ...message,
          sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null,
        });
      } catch (error) {
        console.error('Socket message error:', error);
      }
    });

    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('user_typing', data);
    });

    socket.on('stop_typing', (data) => {
      socket.to(data.chatId).emit('user_stop_typing', data);
    });

    // WebRTC signaling
    socket.on('call_user', (data) => {
      const targetSocket = onlineUsers.get(data.targetId);
      if (targetSocket) {
        io.to(targetSocket).emit('incoming_call', {
          from: data.from,
          signal: data.signal,
          callType: data.callType,
        });
      }
    });

    socket.on('answer_call', (data) => {
      io.to(data.to).emit('call_accepted', data.signal);
    });

    socket.on('end_call', (data) => {
      const targetSocket = onlineUsers.get(data.targetId);
      if (targetSocket) {
        io.to(targetSocket).emit('call_ended');
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
};
