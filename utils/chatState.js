// Simple state to track the active conversation
let activeConversationId = null;

export const setActiveConversationId = (id) => {
  activeConversationId = id;
};

export const getActiveConversationId = () => {
  return activeConversationId;
};
