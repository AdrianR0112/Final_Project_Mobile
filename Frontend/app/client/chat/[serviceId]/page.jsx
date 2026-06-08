'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import ChatBox from '../../../../components/chat/ChatBox';
import MessageInput from '../../../../components/chat/MessageInput';

export default function ClientChatPage() {
  const params = useParams();
  const serviceId = params?.serviceId;
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <section className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1280px] min-h-0 flex-col px-5 py-8 md:px-10">
      <h1 className="section-title mb-6 shrink-0">Chat de la solicitud {serviceId}</h1>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <ChatBox serviceId={serviceId} reloadKey={reloadKey} />
        <MessageInput serviceId={serviceId} onMessageSent={() => setReloadKey((current) => current + 1)} />
      </div>
    </section>
  );
}
