# HOTFIX — Conversation Page Crash
EntityVisual crashes on /c/[id] with "Cannot read properties of undefined (reading 'scale')".
Root cause: Framer Motion variant lookup with undefined state.
