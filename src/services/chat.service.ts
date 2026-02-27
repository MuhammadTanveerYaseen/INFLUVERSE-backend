import Chat from '../models/Chat';
import Message from '../models/Message';

export class ChatService {
    static async getChatById(chatId: string) {
        const chat = await Chat.findById(chatId);
        return chat;
    }

    static async findOrCreateNegotiationChat(participants: string[]) {
        const chatQuery = await Chat.findOne({
            participants: { $all: participants },
            contextType: { $in: ['general', 'offer', ''] }
        });

        if (!chatQuery) {
            const newChat = await Chat.create({
                participants,
                contextType: 'offer',
                isReadOnly: false,
            });
            return newChat;
        }

        return chatQuery;
    }

    static async addSystemMessage(
        chatId: string | any,
        senderId: string | any,
        content: string,
        relatedId?: string | any,
        relatedModel: 'offer' | 'order' = 'offer'
    ) {
        const messagePayload: any = {
            chat: chatId,
            sender: senderId,
            content,
            isSystemMessage: true,
        };

        if (relatedModel === 'offer' && relatedId) {
            messagePayload.offer = relatedId;
        } else if (relatedModel === 'order' && relatedId) {
            messagePayload.offer = relatedId; // Using offer field for relations
        }

        const message = await Message.create(messagePayload);

        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

        // Real-time Emit
        try {
            const { emitToUser } = await import('./socket.service');
            const chat = await Chat.findById(chatId);
            if (chat) {
                chat.participants.forEach((p: any) => {
                    emitToUser(p.toString(), 'chat_message', { chatId, message });
                    emitToUser(p.toString(), 'refresh_chats', {});
                });
            }
        } catch (e) {
            console.error("Socket emit error in system message:", e);
        }

        return message;
    }
}
