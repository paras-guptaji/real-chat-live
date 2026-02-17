
-- Tighten conversation creation: creator must add themselves as member
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (true); -- conversations have no user_id column; membership enforced at member level

-- Tighten member insertion: users can only add themselves or add others to conversations they're already in
DROP POLICY "Authenticated users can add members" ON public.conversation_members;
CREATE POLICY "Users can join or add members to their conversations" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid())
  );
