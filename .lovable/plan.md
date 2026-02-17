

# Real-Time Chat Application

## Overview
A clean, minimal real-time chat application (WhatsApp/Slack-inspired) with direct messaging and group channels, powered by Supabase for authentication, database, and real-time updates.

## Pages & Navigation

### 1. Auth Pages (Login / Sign Up)
- Email/password registration and login
- Clean, centered form design
- Redirect to chat after login

### 2. Main Chat Interface
- **Left sidebar**: List of conversations (DMs + group channels), search bar, user avatar, and a "New Chat" / "New Group" button
- **Right panel**: Active conversation with message bubbles, input bar, and header showing participant info

## Core Features

### Authentication & Profiles
- Email/password sign-up and login
- User profiles with display name and avatar
- Password reset flow

### Direct Messaging
- Start a 1-on-1 conversation with any registered user
- Search users to start new conversations

### Group Chat Rooms
- Create named group channels
- Add/remove members
- See member list in channel details

### Real-Time Messaging
- Messages appear instantly for all participants using Supabase Realtime subscriptions
- Message history with infinite scroll for older messages
- Timestamps on each message

### Online/Offline Status
- Green indicator for online users
- Track presence using Supabase Realtime Presence

### Typing Indicators
- "User is typing..." shown in real-time using Supabase Realtime broadcast

### Read Receipts
- Checkmarks or "Seen" indicator when messages are read by recipients

## Design Style
- Clean, minimal white/light interface
- Chat bubbles: sender on right (colored), receiver on left (gray)
- Smooth transitions and subtle animations
- Fully responsive — works on mobile and desktop

## Backend (Supabase)
- **Database**: Tables for profiles, conversations, conversation members, messages, read receipts, and user roles
- **Realtime**: Subscriptions for new messages, presence tracking, and typing broadcasts
- **Auth**: Built-in Supabase email/password authentication
- **RLS**: Row-level security so users can only access their own conversations and messages

