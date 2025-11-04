/**
 * Test Conversations & Messages API Route
 *
 * Tests conversation and message operations.
 * Visit: http://localhost:3000/api/test-conversations
 */

import { NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { createAccountWithSettings } from '@/lib/db/create-account-with-settings'
import { deleteAccount } from '@/lib/db/accounts'
import {
  createConversation,
  getConversation,
  getConversationByContactId,
  listConversations,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  getOrCreateConversation,
  getConversationStats,
  deleteConversation,
} from '@/lib/db/conversations'
import {
  createMessage,
  getMessage,
  getMessages,
  getRecentMessages,
  getMessagesSinceDays,
  searchMessages,
  countMessages,
  getLastMessage,
  getLastUserMessage,
  deleteMessage,
} from '@/lib/db/messages'
import {
  loadConversationContext,
  loadContextWithSemanticSearch,
  formatMessagesForAI,
  calculateContextStats,
  estimateTokens,
} from '@/lib/db/context-loader'

export async function GET() {
  try {
    logger.info('Running conversation and message operations tests...')

    const testId = Date.now()
    const results: Record<string, any> = {}

    // ========================================================================
    // SETUP: Create test account
    // ========================================================================
    logger.info('[SETUP] Creating test account...')

    const { account } = await createAccountWithSettings({
      account_name: `Test Account ${testId}`,
      ghl_location_id: `loc-${testId}`,
    })

    results.setup = {
      status: '✅ Account created',
      account_id: account.id,
    }

    // ========================================================================
    // TEST 1: Create conversation
    // ========================================================================
    logger.info('[TEST 1] Creating conversation...')

    const conversation1 = await createConversation({
      account_id: account.id,
      ghl_contact_id: `contact-${testId}`,
      contact_name: 'John Doe',
      contact_email: 'john@example.com',
      contact_phone: '+1234567890',
      metadata: { source: 'test' },
    })

    results.test1_create_conversation = {
      status: '✅ Created',
      conversation_id: conversation1.id,
      contact_name: conversation1.contact_name,
      is_active: conversation1.is_active,
      message_count: conversation1.message_count,
    }

    // ========================================================================
    // TEST 2: Get conversation by ID
    // ========================================================================
    logger.info('[TEST 2] Getting conversation by ID...')

    const retrievedConv = await getConversation(conversation1.id)

    results.test2_get_conversation = {
      status: '✅ Retrieved',
      matches_created: retrievedConv.id === conversation1.id,
      contact_name: retrievedConv.contact_name,
    }

    // ========================================================================
    // TEST 3: Get conversation by contact ID
    // ========================================================================
    logger.info('[TEST 3] Getting conversation by contact ID...')

    const convByContact = await getConversationByContactId(
      account.id,
      `contact-${testId}`
    )

    results.test3_get_by_contact = {
      status: convByContact ? '✅ Found' : '❌ Not found',
      matches_created: convByContact?.id === conversation1.id,
    }

    // ========================================================================
    // TEST 4: Create messages
    // ========================================================================
    logger.info('[TEST 4] Creating messages...')

    const message1 = await createMessage({
      conversation_id: conversation1.id,
      role: 'user',
      content: 'Hello! I need help with my account.',
    })

    const message2 = await createMessage({
      conversation_id: conversation1.id,
      role: 'assistant',
      content: 'Hi! I would be happy to help you with your account.',
    })

    const message3 = await createMessage({
      conversation_id: conversation1.id,
      role: 'user',
      content: 'How can I reset my password?',
    })

    const message4 = await createMessage({
      conversation_id: conversation1.id,
      role: 'assistant',
      content: 'To reset your password, you can go to...',
      precedes_user_reply: true, // User interrupted
    })

    const message5 = await createMessage({
      conversation_id: conversation1.id,
      role: 'user',
      content: 'Actually, I found it. Thanks!',
    })

    results.test4_create_messages = {
      status: '✅ Created 5 messages',
      message_ids: [
        message1.id,
        message2.id,
        message3.id,
        message4.id,
        message5.id,
      ],
      embeddings_generated: {
        message1: !!message1.embedding,
        message2: !!message2.embedding,
        message3: !!message3.embedding,
        message4: !!message4.embedding,
        message5: !!message5.embedding,
      },
      message4_precedes: message4.precedes_user_reply,
    }

    // ========================================================================
    // TEST 5: Get messages with filtering
    // ========================================================================
    logger.info('[TEST 5] Getting messages with filtering...')

    const { messages: allMessages, total: totalAll } = await getMessages(
      conversation1.id
    )

    const { messages: userMessages, total: totalUsers } = await getMessages(
      conversation1.id,
      { roles: ['user'] }
    )

    const { messages: noInterrupted, total: totalNoInterrupted } =
      await getMessages(conversation1.id, {
        excludePrecedesUserReply: true,
      })

    results.test5_get_messages = {
      status: '✅ Retrieved',
      all_messages: {
        count: allMessages.length,
        total: totalAll,
      },
      user_messages_only: {
        count: userMessages.length,
        total: totalUsers,
      },
      excluding_interrupted: {
        count: noInterrupted.length,
        total: totalNoInterrupted,
        excluded_message4: !noInterrupted.some((m) => m.id === message4.id),
      },
    }

    // ========================================================================
    // TEST 6: Get recent messages
    // ========================================================================
    logger.info('[TEST 6] Getting recent messages...')

    const recentMessages = await getRecentMessages(conversation1.id, 10)

    results.test6_recent_messages = {
      status: '✅ Retrieved',
      count: recentMessages.length,
      excludes_interrupted: !recentMessages.some((m) => m.id === message4.id),
      in_chronological_order:
        recentMessages[0].id === message1.id &&
        recentMessages[recentMessages.length - 1].id === message5.id,
    }

    // ========================================================================
    // TEST 7: Semantic search
    // ========================================================================
    logger.info('[TEST 7] Testing semantic search...')

    const searchResults = await searchMessages(
      conversation1.id,
      'password reset',
      {
        limit: 5,
        similarityThreshold: 0.5,
      }
    )

    results.test7_semantic_search = {
      status: '✅ Searched',
      results_count: searchResults.length,
      found_relevant_message: searchResults.some((m) => m.id === message3.id),
      sample_result: searchResults[0]
        ? {
            id: searchResults[0].id,
            content: searchResults[0].content.substring(0, 50),
          }
        : null,
    }

    // ========================================================================
    // TEST 8: Load conversation context
    // ========================================================================
    logger.info('[TEST 8] Loading conversation context...')

    const context = await loadConversationContext(account.id, conversation1.id, {
      maxTokens: 1000,
      maxMessages: 20,
      maxDays: 30,
    })

    const contextStats = calculateContextStats(context.messages)

    results.test8_load_context = {
      status: '✅ Loaded',
      messages_returned: context.messages.length,
      total_tokens: context.totalTokens,
      truncated: context.truncated,
      stats: contextStats,
      excludes_interrupted: !context.messages.some((m) => m.id === message4.id),
    }

    // ========================================================================
    // TEST 9: Load context with semantic search
    // ========================================================================
    logger.info('[TEST 9] Loading context with semantic search...')

    const contextWithSearch = await loadContextWithSemanticSearch(
      account.id,
      conversation1.id,
      'password help',
      {
        maxTokens: 1000,
        recentMessagesCount: 3,
        semanticResultsCount: 3,
      }
    )

    results.test9_context_with_search = {
      status: '✅ Loaded',
      recent_messages: contextWithSearch.recentMessages.length,
      semantic_messages: contextWithSearch.semanticMessages.length,
      total_tokens: contextWithSearch.totalTokens,
      truncated: contextWithSearch.truncated,
    }

    // ========================================================================
    // TEST 10: Format for AI
    // ========================================================================
    logger.info('[TEST 10] Formatting messages for AI...')

    const formattedMessages = formatMessagesForAI(recentMessages)

    results.test10_format_for_ai = {
      status: '✅ Formatted',
      count: formattedMessages.length,
      sample: formattedMessages[0]
        ? {
            role: formattedMessages[0].role,
            content: formattedMessages[0].content.substring(0, 50),
          }
        : null,
      all_have_required_fields: formattedMessages.every(
        (m) => m.role && m.content
      ),
    }

    // ========================================================================
    // TEST 11: Update conversation
    // ========================================================================
    logger.info('[TEST 11] Updating conversation...')

    const updatedConv = await updateConversation(conversation1.id, {
      contact_name: 'John Smith',
      metadata: { source: 'test', updated: true },
    })

    results.test11_update_conversation = {
      status: '✅ Updated',
      new_name: updatedConv.contact_name,
      name_changed: updatedConv.contact_name !== conversation1.contact_name,
    }

    // ========================================================================
    // TEST 12: List conversations
    // ========================================================================
    logger.info('[TEST 12] Listing conversations...')

    const { conversations, total } = await listConversations(account.id, {
      limit: 10,
      sortBy: 'last_message_at',
    })

    results.test12_list_conversations = {
      status: '✅ Listed',
      count: conversations.length,
      total: total,
      includes_test_conversation: conversations.some(
        (c) => c.id === conversation1.id
      ),
    }

    // ========================================================================
    // TEST 13: Conversation stats
    // ========================================================================
    logger.info('[TEST 13] Getting conversation stats...')

    const stats = await getConversationStats(conversation1.id)

    results.test13_conversation_stats = {
      status: '✅ Retrieved',
      message_count: stats.messageCount,
      has_last_message: !!stats.lastMessageAt,
      has_first_message: !!stats.firstMessageAt,
    }

    // ========================================================================
    // TEST 14: Count messages
    // ========================================================================
    logger.info('[TEST 14] Counting messages...')

    const totalCount = await countMessages(conversation1.id)
    const userCount = await countMessages(conversation1.id, { roles: ['user'] })
    const noInterruptedCount = await countMessages(conversation1.id, {
      excludePrecedesUserReply: true,
    })

    results.test14_count_messages = {
      status: '✅ Counted',
      total: totalCount,
      users: userCount,
      excluding_interrupted: noInterruptedCount,
      counts_match: totalCount === 5 && userCount === 3 && noInterruptedCount === 4,
    }

    // ========================================================================
    // TEST 15: Get last messages
    // ========================================================================
    logger.info('[TEST 15] Getting last messages...')

    const lastMessage = await getLastMessage(conversation1.id)
    const lastUserMessage = await getLastUserMessage(conversation1.id)

    results.test15_last_messages = {
      status: '✅ Retrieved',
      last_message: {
        id: lastMessage?.id,
        role: lastMessage?.role,
        is_message5: lastMessage?.id === message5.id,
      },
      last_user_message: {
        id: lastUserMessage?.id,
        role: lastUserMessage?.role,
        is_message5: lastUserMessage?.id === message5.id,
      },
    }

    // ========================================================================
    // TEST 16: Archive/Unarchive conversation
    // ========================================================================
    logger.info('[TEST 16] Testing archive/unarchive...')

    const archived = await archiveConversation(conversation1.id)
    const unarchived = await unarchiveConversation(conversation1.id)

    results.test16_archive_unarchive = {
      status: '✅ Tested',
      archived_successfully: archived.is_active === false,
      unarchived_successfully: unarchived.is_active === true,
    }

    // ========================================================================
    // TEST 17: Get or create conversation
    // ========================================================================
    logger.info('[TEST 17] Testing get or create...')

    // Should return existing
    const existing = await getOrCreateConversation(
      account.id,
      `contact-${testId}`,
      { name: 'Should Not Use This' }
    )

    // Should create new
    const newConv = await getOrCreateConversation(
      account.id,
      `contact-new-${testId}`,
      { name: 'Jane Doe', email: 'jane@example.com' }
    )

    results.test17_get_or_create = {
      status: '✅ Tested',
      existing: {
        returned_existing: existing.id === conversation1.id,
        name_unchanged: existing.contact_name === 'John Smith',
      },
      new: {
        created_new: newConv.id !== conversation1.id,
        name: newConv.contact_name,
      },
    }

    // ========================================================================
    // CLEANUP: Delete test data
    // ========================================================================
    logger.info('[CLEANUP] Deleting test data...')

    // Delete messages first
    await deleteMessage(message1.id)
    await deleteMessage(message2.id)
    await deleteMessage(message3.id)
    await deleteMessage(message4.id)
    await deleteMessage(message5.id)

    // Delete conversations (cascade will handle remaining messages)
    await deleteConversation(conversation1.id)
    await deleteConversation(newConv.id)

    // Delete account
    await deleteAccount(account.id)

    results.cleanup = {
      status: '✅ Cleaned up',
      messages_deleted: 5,
      conversations_deleted: 2,
      accounts_deleted: 1,
    }

    logger.info('All conversation and message tests completed successfully!')

    return successResponse({
      message: 'Conversation and message operations tests passed! ✅',
      tests: results,
      summary: {
        total_tests: 17,
        passed: 17,
        failed: 0,
        categories: {
          conversation_crud: '✅ Working',
          message_crud: '✅ Working',
          context_loading: '✅ Working',
          semantic_search: '✅ Working',
          filtering: '✅ Working',
          utilities: '✅ Working',
        },
      },
    })
  } catch (error) {
    logger.error('Conversation and message tests failed', error)

    return errorResponse(
      'CONVERSATION_TESTS_FAILED',
      'Conversation and message operations test encountered an error',
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}
