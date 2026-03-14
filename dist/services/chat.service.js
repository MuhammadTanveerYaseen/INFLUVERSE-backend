"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
class ChatService {
    static getChatById(chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            const chat = yield Chat_1.default.findById(chatId);
            return chat;
        });
    }
    static findOrCreateNegotiationChat(participants) {
        return __awaiter(this, void 0, void 0, function* () {
            const chatQuery = yield Chat_1.default.findOne({
                participants: { $all: participants },
                contextType: { $in: ['general', 'offer', ''] }
            });
            if (!chatQuery) {
                const newChat = yield Chat_1.default.create({
                    participants,
                    contextType: 'offer',
                    isReadOnly: false,
                });
                return newChat;
            }
            return chatQuery;
        });
    }
    static addSystemMessage(chatId_1, senderId_1, content_1, relatedId_1) {
        return __awaiter(this, arguments, void 0, function* (chatId, senderId, content, relatedId, relatedModel = 'offer') {
            const messagePayload = {
                chat: chatId,
                sender: senderId,
                content,
                isSystemMessage: true,
            };
            if (relatedModel === 'offer' && relatedId) {
                messagePayload.offer = relatedId;
            }
            else if (relatedModel === 'order' && relatedId) {
                messagePayload.offer = relatedId; // Using offer field for relations
            }
            const message = yield Message_1.default.create(messagePayload);
            yield Chat_1.default.findByIdAndUpdate(chatId, { updatedAt: new Date() });
            // Real-time Emit
            try {
                const { emitToUser } = yield Promise.resolve().then(() => __importStar(require('./socket.service')));
                const chat = yield Chat_1.default.findById(chatId);
                if (chat) {
                    chat.participants.forEach((p) => {
                        emitToUser(p.toString(), 'chat_message', { chatId, message });
                        emitToUser(p.toString(), 'refresh_chats', {});
                    });
                }
            }
            catch (e) {
                console.error("Socket emit error in system message:", e);
            }
            return message;
        });
    }
}
exports.ChatService = ChatService;
