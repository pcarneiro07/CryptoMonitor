import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import type { ChatMessage, DashboardData } from '../../types';
import { buildContextSnapshot } from '../../lib/cryptoData';

interface ChatbotProps {
  data: DashboardData | null;
}

const SUGGESTED_QUESTIONS = [
  'Qual setor está mais instável agora?',
  'Houve picos de volume anormais?',
  'Qual a melhor performance da última hora?',
  'Como está a dominância do Bitcoin?',
  'Quais assets têm maior volatilidade?',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-blue-500/20 border border-blue-500/30'
            : 'bg-purple-500/20 border border-purple-500/30'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-blue-400" />
        ) : (
          <Bot size={14} className="text-purple-400" />
        )}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-500/15 border border-blue-500/20 text-slate-200 rounded-tr-sm'
            : 'bg-slate-800/80 border border-slate-700/50 text-slate-300 rounded-tl-sm'
        }`}
      >
        {message.content}

        <div className={`text-xs mt-1 ${isUser ? 'text-blue-400/50 text-right' : 'text-slate-600'}`}>
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

export function Chatbot({ data }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        '👋 Olá! Sou o Crypto Analyst, seu assistente de mercado. Posso analisar volatilidade, dominância setorial, picos de volume e comportamento dos principais ativos. O que deseja saber?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const cleanText = text.trim();

      if (!cleanText || isLoading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: cleanText,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setInput('');
      setIsLoading(true);

      try {
        const contextSnapshot = data ? buildContextSnapshot(data) : null;

        const systemPrompt = `Você é um analista profissional de mercado cripto integrado a um dashboard chamado Crypto Health Monitor.

Regras:
- Responda sempre em português brasileiro.
- Seja objetivo, analítico e baseado nos dados disponíveis.
- Não invente números que não aparecem no snapshot.
- Quando não houver dado suficiente, diga claramente.
- Priorize leitura executiva: risco, volatilidade, volume, dominância, setores e anomalias.
- Use emojis com moderação.
- Evite recomendação financeira direta de compra/venda.
- Não diga que está usando Anthropic, Claude ou qualquer API paga. Você é uma LLM local/open source conectada ao backend.

Snapshot atual do mercado:
${
  contextSnapshot
    ? JSON.stringify(contextSnapshot, null, 2)
    : 'Nenhum dado de mercado disponível no momento.'
}`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: nextMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            system: systemPrompt,
          }),
        });

        if (!response.ok) {
          let errorDetail = 'Erro desconhecido no backend.';

          try {
            const errorPayload = await response.json();
            errorDetail = errorPayload?.detail || errorDetail;
          } catch {
            errorDetail = await response.text();
          }

          throw new Error(errorDetail);
        }

        const result = await response.json();

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.content || 'Não consegui gerar uma resposta agora.',
          timestamp: new Date().toISOString(),
        };

        setMessages((previousMessages) => [...previousMessages, assistantMessage]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `⚠️ Não foi possível conectar à IA local.

Verifique:
1. Se o backend está rodando.
2. Se o Ollama está instalado e ativo.
3. Se o modelo foi baixado com: ollama pull llama3.1:8b

Detalhe técnico: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [data, messages, isLoading],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  const panelWidth = isExpanded ? 'w-[480px]' : 'w-[360px]';
  const panelHeight = isExpanded ? 'h-[600px]' : 'h-[480px]';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 border border-slate-600 rotate-0'
            : 'bg-gradient-to-br from-blue-600 to-purple-600 border border-blue-500/50 hover:scale-110'
        }`}
        style={{
          boxShadow: isOpen
            ? '0 4px 20px rgba(0,0,0,0.4)'
            : '0 4px 30px rgba(59, 130, 246, 0.5)',
        }}
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat'}
      >
        {isOpen ? (
          <X size={22} className="text-slate-300" />
        ) : (
          <MessageCircle size={22} className="text-white" />
        )}

        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 z-50 ${panelWidth} ${panelHeight} glass-card border-slate-700/60 flex flex-col shadow-2xl animate-slide-in-right transition-all duration-200`}
          style={{
            boxShadow:
              '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.1)',
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/20 flex items-center justify-center">
                <Bot size={16} className="text-blue-400" />
              </div>

              <div>
                <p className="font-display font-semibold text-slate-200 text-sm">
                  Crypto Analyst AI
                </p>

                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {data ? 'Dados ao vivo conectados' : 'Aguardando dados...'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300"
              aria-label={isExpanded ? 'Minimizar chat' : 'Expandir chat'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-2.5 animate-fade-in-up">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-purple-400" />
                </div>

                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="text-purple-400 animate-spin" />
                  <span className="text-xs text-slate-500">Analisando dados...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length < 3 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-600 mb-2">Sugestões:</p>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-left"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 pt-2 border-t border-slate-800">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre o mercado..."
                rows={1}
                className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                style={{ maxHeight: '100px' }}
              />

              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send size={15} className="text-white" />
              </button>
            </div>

            <p className="text-xs text-slate-700 mt-1.5 text-center">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>
      )}
    </>
  );
}