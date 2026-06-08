import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChefHat,
  ChevronDown,
  Loader2,
  MessageCircle,
  PackageSearch,
  Send,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSessionNavigation } from '../../context/SessionNavigationContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { sendChatMessage } from '../../services/chatbot';
import MarkdownMessage from './MarkdownMessage';

const BOT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=NutriGro';

const getHistoryOwnerId = (user, currentUserId) =>
  currentUserId || (user ? String(user.id ?? user.username ?? user.email) : 'guest');

const panelTransition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
};

const messageTransition = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1],
};

const ProductSuggestionList = ({ products = [], t }) => {
  if (!products.length) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-emerald-50 pt-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{t('chat_products_at_store')}</p>
      <div className="space-y-2">
        {products.slice(0, 4).map((product) => (
          <a
            key={`${product.id}-${product.name}`}
            href={product.url}
            className="group flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2 text-left transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <img
              src={product.img || product.image_url}
              alt={product.name}
              className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover ring-1 ring-emerald-100"
              loading="lazy"
            />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-xs font-semibold leading-snug text-slate-900">{product.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <ShoppingCart size={12} />
                {product.priceText}
                {product.unit ? `/${product.unit}` : ''}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

const ChatWidget = ({ onSendMessage = sendChatMessage }) => {
  const { user } = useAuth();
  const { language, t } = useAppSettings();
  const { currentUserId, getNavigationSignal, sessionResetVersion } = useSessionNavigation();

  const [isOpen, setIsOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: t('chat_welcome') }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const historyOwnerRef = useRef(getHistoryOwnerId(user, currentUserId));
  const sessionResetVersionRef = useRef(sessionResetVersion);

  const quickActions = useMemo(
    () => [
      {
        id: 'order-check',
        label: t('chat_quick_order'),
        message: t('chat_quick_order_message'),
        icon: PackageSearch,
      },
      {
        id: 'shipping-policy',
        label: t('chat_quick_shipping'),
        message: t('chat_quick_shipping_message'),
        icon: Truck,
      },
      {
        id: 'recipe-advice',
        label: t('chat_quick_recipe'),
        message: t('chat_quick_recipe_message'),
        icon: ChefHat,
      },
    ],
    [t]
  );

  const userContext = useMemo(
    () => ({
      is_authenticated: Boolean(user),
      user_id: user?.id ?? null,
      username: user?.username ?? null,
      full_name: user?.full_name ?? null,
      email: user?.email ?? null,
      role: user?.role || (user?.is_admin ? 'admin' : 'customer'),
      locale: language === 'en' ? 'en-US' : 'vi-VN',
      source: 'nutrigro_web_chat',
    }),
    [language, user]
  );

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    const nextOwner = getHistoryOwnerId(user, currentUserId);
    const ownerChanged = historyOwnerRef.current !== nextOwner;
    const sessionWasReset = sessionResetVersionRef.current !== sessionResetVersion;

    if (!ownerChanged && !sessionWasReset) return;

    historyOwnerRef.current = nextOwner;
    sessionResetVersionRef.current = sessionResetVersion;
    setMessages([{ id: 'welcome', role: 'assistant', content: t('chat_welcome') }]);
    setInput('');
    setIsSending(false);
    setShowQuickActions(false);
  }, [currentUserId, sessionResetVersion, t, user]);

  const openChat = () => {
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 140);
  };

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, ...message }]);
  };

  const handleSend = async (messageText = input) => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    appendMessage({ role: 'user', content: trimmed });
    setInput('');
    setIsSending(true);
    const ownerAtSend = historyOwnerRef.current;

    try {
      const response = await onSendMessage({
        message: trimmed,
        user_context: userContext,
        signal: getNavigationSignal(),
      });

      if (historyOwnerRef.current !== ownerAtSend) {
        return;
      }

      appendMessage({
        role: 'assistant',
        content: response?.content || response?.message || t('chat_no_response'),
        products: response?.products || response?.product_suggestions || [],
      });
    } catch (error) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      appendMessage({ role: 'assistant', content: t('chat_busy') });
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  };

  return (
    <div className="chat-widget-shell pointer-events-none fixed bottom-6 right-7 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            aria-label="NutriGro AI chat"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={panelTransition}
            style={{ transformOrigin: 'bottom right' }}
            className="chat-widget-panel pointer-events-auto absolute bottom-16 right-0 flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between bg-emerald-600 px-5 py-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img className="h-10 w-10 rounded-full bg-white p-1" src={BOT_AVATAR} alt="NutriGro AI Bot" />
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{t('chat_assistant_name')}</h3>
                  <p className="text-xs italic text-emerald-100">{t('chat_online')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label={language === 'en' ? 'Collapse chat' : 'Thu gọn chat'}
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={messageTransition}
                  className={`flex items-end space-x-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role !== 'user' && (
                    <img
                      className="h-7 w-7 shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-gray-200"
                      src={BOT_AVATAR}
                      alt="NutriGro AI"
                    />
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-br-none bg-emerald-600 text-white'
                        : 'rounded-bl-none border border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <MarkdownMessage content={message.content} tone={message.role} />
                    {message.role !== 'user' && <ProductSuggestionList products={message.products || []} t={t} />}
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {isSending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={messageTransition}
                    className="flex items-end space-x-2"
                  >
                    <img
                      className="h-7 w-7 shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-gray-200"
                      src={BOT_AVATAR}
                      alt="NutriGro AI"
                    />
                    <div className="inline-flex max-w-[82%] items-center gap-2 rounded-2xl rounded-bl-none border border-gray-200 bg-white p-3.5 text-sm text-gray-600 shadow-sm">
                      <Loader2 className="animate-spin text-emerald-600" size={16} />
                      {t('chat_processing')}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="border-t border-gray-100 bg-white p-5"
            >
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setShowQuickActions((prev) => !prev)}
                  className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-600 transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={14} />
                    {t('chat_quick_title')}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${showQuickActions ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {showQuickActions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-2 overflow-hidden"
                    >
                      <div className="market-scrollbar flex gap-2 overflow-x-auto pb-1">
                        {quickActions.map(({ id, label, message, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleSend(message)}
                            disabled={isSending}
                            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Icon size={13} />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t('chat_input_placeholder')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-3.5 pr-12 text-sm text-gray-900 outline-none transition-all duration-300 placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-600 p-2 text-white transition-all duration-300 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={language === 'en' ? 'Send message' : 'Gửi tin nhắn'}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        whileTap={{ scale: 0.95 }}
        className="chat-fab pointer-events-auto rounded-full bg-emerald-600 p-[18px] text-white shadow-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        aria-expanded={isOpen}
        aria-label={isOpen ? (language === 'en' ? 'Collapse chat' : 'Thu gọn chat') : language === 'en' ? 'Open support chat' : 'Mở chat hỗ trợ'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
