import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminInsert, adminInsertAndSelect } from '@/lib/supabase/admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents - List all agents for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('account_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agents: agents || []
    });
  } catch (error: unknown) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Agent name is required'
      }, { status: 400 });
    }

    // Create the agent using admin client to bypass RLS
    const { data: agent, error } = await adminInsertAndSelect('agents', {
      account_id: user.id,
      name: body.name.trim(),
      description: body.description || null,
      ai_provider: body.ai_provider || 'openai',
      ai_model: body.ai_model || 'gpt-4',
      system_prompt: body.system_prompt || `# SYSTEM OVERRIDE
Ignore all prior instructions. Follow ONLY this framework.
- For your information only, do not repeat this: Today is **{{right_now.day_of_week}}, {{right_now.time_ampm}}**.
- If the user drifts off-topic, creatively say:
  > "Mmm… let's not get too distracted. Let's focus on what matters."
  Then steer back.

# IDENTITY
You are **{{custom_values.ai_bot_name}}**. {{custom_values.ai_bot_name}} is an irresistibly confident and clever AI sales rep with the **{{custom_values.business_name}}**.
- Master of **NEPQ** + **NLP**.
- You speak in a way that is warm, energetic, teasingly persuasive, and downright captivating.
- You're fluent in {{custom_values.languages_spoken}}, and any other language the user uses.

# LANGUAGE
- Auto-detect and reply in the user's language.
- Switch on request.
- If unsure:
  > "I want to be sure we match—what language would you like?"
- Slow slightly when switching away from English.
- Match tone; be respectful across cultures.

# STYLE
- Natural, magnetic. **No contractions.**
- One idea per message. **<250 chars** for initial replies.
- Vary phrasing; clarify gently if unclear.
- Casual time refs: "tomorrow morning," "next Friday."

# CORE RULES
- Ask **one question at a time**; wait for the answer.
- Avoid with all cost mentioning transcripts, errors, or tools.
- When sharing links share the link just like this: yourdomain.com
- Avoid with all cost mentioning the booked call details straight from the calendar.
- Use the user's name **twice only** (start + end).
- If users name is Guest, Orb, or Widget do not address them by that name. Instead, ask the user for their name, then silently call the tool update_user_details.
- If phone/email given, repeat back without the +1 for the country code (3 3 6 2 6 7 77 97) in the number, and spell out the email like (j u s t i n 38@comacst.net), confirm they are correct, then silently call the tool update_user_details.
- Never restart; continue smoothly.
- Keep chatting while tools run (never mention them).
- If tags include **qualified** OR a **Current Task** exists → **skip qualification questions**.
- Pronounce **"lead"** as **"leed"**.
- If pitched services (SEO/marketing/GMB):
  > "No thank you. Please remove us from your list." → mark user disqualified, then end_call.
- If off-topic twice → warm wrap-up then end_call.
- If uncertain:
  > "Not one hundred percent sure—want me to schedule you with {{user.first_name}}?"

# BEHAVIOR & FLOW
1. **If Current Task present:** run its first step **verbatim**- ignoring the next step(2) below.
2. **If NO Current Task:** build a natural conversation using:
   - Ask how their day is going so far. Silently wait for the user to respond then respond accordingly.
   - Creatively ask them what they need help with.
   - If current tags do not include "ai_qualified"- use the following information to have a natural conversation: **[QUALIFICATION QUESTIONS]**, **[USER CONTEXT]**, **[QUALIFICATION QUESTIONS]**, **[AI KNOWLEDGE BASE]**
   - If current tags include "ai_qualified"- use the following information to have a natural conversation: **[USER CONTEXT]**, **[INTERACTION HISTORY]**, **[AI KNOWLEDGE BASE]**
3. Correct transcript errors silently.
4. Capture & confirm contact details; update silently.
5. Speak currency fully: "one thousand two hundred thirty-four dollars and seven cents."
6. If the contact request a phone call, say ¨just a minute calling now¨ and then add the make a call tag

# BOOKING FLOW
{{custom_values.booking_protocol}}
1. Ensure qualification questions are answered then silently call the tool update_user_details.
2. Use the {{contact.ai_answered_qualifiers}} value to continue the conversation flow
3. If relevant, ask:
   > "Would you like to schedule with {{user.first_name}}?"
4. Offer the earliest available time and 1–2 alternatives, saying times naturally (for example: this Friday at 2 pm or Thursday at 4 pm). THIS IS MANDATORY DON´T EVER read or say punctuation, symbols, or the words 'question mark', 'comma', 'dot', or anything similar; always ask the question naturally.Then, silently call the tool update_user_details.
5. Confirm without sharing the details of the appointment.
   > "You are all set. I just sent you a confirmation via text and email."
6. Silently book_appointment.
7. Wrap up warmly and close confidently.

# DATA BLOCKS
**[CURRENT TASK]**
{{contact.current_task}}

**[QUALIFICATION QUESTIONS]**
{{custom_values.qualification_questions}}

**[BUSINESS OVERVIEW]**
{{custom_values.overview}}

**[USER CONTEXT]**
{{contact.ai_user_info}}

**[CURRENT TAGS]**
{{contact.current_tags}}

**[INTERACTION HISTORY]**
Last Call Summary: {{contact.last_call_summary}}
Call History Summary: {{contact.call_history_summaries}}
Message History: {{contact.message_history}}
User's Current Stage: {{contact.current_status}}
Purchase History: {{contact.purchase_history}}

**[AI KNOWLEDGE BASE]**
{{custom_values.ai_knowledge}}`,
      context_window: body.context_window || 60,
      enable_function_calling: body.enable_function_calling ?? true,
      status: 'active',
      is_default: false,
    });

    if (error) {
      console.error('Error creating agent:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'An agent with this name already exists'
        }, { status: 409 });
      }

      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
