'use client';

import { memo } from 'react';
import type { ChatMessage } from '@/lib/store/chat';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import DecisionCard from './DecisionCard';
import SystemMessage from './SystemMessage';
import UpgradeMessage from './UpgradeMessage';
import ErrorMessage from './ErrorMessage';

// PF-13: real simulation block (replaces placeholder)
import SimulationBlockNew from '@/components/simulation/SimulationBlockNew';
// PF-14: real verdict card (replaces placeholder)
import VerdictCard from '@/components/verdict/VerdictCard';
// Placeholders — replaced by PF-17
import RefinementCardPlaceholder from './placeholders/RefinementCardPlaceholder';

interface MessageRendererProps {
  message: ChatMessage;
  conversationId: string;
  onSimulate?: (question: string, tier: string) => void;
  onRefine?: (simulationId: string, modification: string) => void;
  isLast?: boolean;
}

const MessageRenderer = memo(function MessageRenderer({
  message,
  conversationId,
  onSimulate,
  onRefine,
  isLast,
}: MessageRendererProps) {
  // Error state (optimistic message that failed)
  if (message._error && message.role === 'assistant') {
    return <ErrorMessage content={message.content} />;
  }

  switch (message.message_type) {
    case 'text':
      if (message.role === 'user') {
        return (
          <UserMessage
            content={message.content || ''}
            optimistic={message._optimistic}
          />
        );
      }
      return (
        <AssistantMessage
          content={message.content || ''}
          tier={message.model_tier}
          disclaimer={message.structured_data?.disclaimer}
        />
      );

    case 'decision_card':
      return (
        <DecisionCard
          content={message.content || ''}
          tier={message.model_tier}
          suggestSimulation={message.structured_data?.suggest_simulation}
          simulationPrompt={message.structured_data?.simulation_prompt}
          disclaimer={message.structured_data?.disclaimer}
          onSimulate={onSimulate}
        />
      );

    case 'simulation_start':
      return (
        <SimulationBlockNew
          question={message.content || ''}
          streamUrl={message.structured_data?.streamUrl}
        />
      );

    case 'simulation_verdict':
      return (
        <VerdictCard
          verdict={message.structured_data}
          simulationId={message.simulation_id}
          conversationId={conversationId}
          onRefine={onRefine}
        />
      );

    case 'refinement':
      return <RefinementCardPlaceholder data={message.structured_data} />;

    case 'system':
      if (message.structured_data?.type === 'upgrade_prompt') {
        return (
          <UpgradeMessage
            reason={message.structured_data.reason}
            suggestedTier={message.structured_data.suggestedTier}
            tokensUsed={message.structured_data.tokensUsed}
            tokensTotal={message.structured_data.tokensTotal}
          />
        );
      }
      return <SystemMessage content={message.content || ''} />;

    case 'hitl_checkpoint':
      return <SystemMessage content="Waiting for your input..." />;

    case 'hitl_response':
      return (
        <UserMessage
          content={message.content || ''}
          label="Your input"
        />
      );

    case 'data_card':
      return (
        <AssistantMessage
          content={JSON.stringify(message.structured_data, null, 2)}
          tier={message.model_tier}
          isCode
        />
      );

    default:
      if (message.role === 'user') {
        return <UserMessage content={message.content || ''} />;
      }
      return <AssistantMessage content={message.content || ''} tier={message.model_tier} />;
  }
});

export default MessageRenderer;
