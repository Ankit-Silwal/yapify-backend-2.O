import { constants } from "node:buffer";
import pool from "../config/db.js";

export const findPrivateConversation=async (
  userId1:string,
  userId2:string
)=>{
  const result = await pool.query(
    `
    SELECT c.id
    FROM conversations c
    JOIN conversation_participants cp1
      ON cp1.conversation_id = c.id
    JOIN conversation_participants cp2
      ON cp2.conversation_id = c.id
    WHERE c.is_group = false
      AND cp1.user_id = $1
      AND cp2.user_id = $2
    `,
    [userId1, userId2]
  );
  return result.rows[0]??null;
}
export const createPrivateConversation=async(
  userId1:string,
  userId2:string
)=>{
  const client=await pool.connect();

  try{
    await client.query("BEGIN");
    const convoResult=await client.query(
      `
      insert into conversations (is_group)
      values (false)
      returning id
      `
    )
    const conversationId=convoResult.rows[0].id;
    await client.query( `
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
      [conversationId, userId1, userId2])
      await client.query("commit");
      return conversationId;
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    client.release();
  }
}
export const getUserConversationsList = async (userId: string) => {

  const result = await pool.query(
    `
    SELECT c.id,
           c.is_group,
           MAX(m.created_at) as last_message_time
    FROM conversations c
    JOIN conversation_participants cp
      ON cp.conversation_id = c.id
    LEFT JOIN messages m
      ON m.conversation_id = c.id
    WHERE cp.user_id = $1
      AND cp.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY last_message_time DESC NULLS LAST
    `,
    [userId]
  );

  return result.rows;
};
export const getMessages = async (
  conversationId: string,
  page: number = 1,
  limit: number = 20
) => {

  const offset = (page - 1) * limit;

  const result = await pool.query(
    `
    SELECT *
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [conversationId, limit, offset]
  );

  return result.rows;
};

export const getConversationDetails = async (conversationId: string, userId: string) => {
  // 1️⃣ Check if user is participant
  const participantCheck = await pool.query(
    `
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = $1
    AND user_id = $2
    `,
    [conversationId, userId]
  );

  if (participantCheck.rowCount === 0) {
    return null; // Or throw an error indicating unauthorized/not found
  }

  // 2️⃣ Get conversation info
  const conversationResult = await pool.query(
    `
    SELECT id, is_group
    FROM conversations
    WHERE id = $1
    `,
    [conversationId]
  );

  if (conversationResult.rowCount === 0) {
    throw new Error("Conversation not found");
  }

  const conversation = conversationResult.rows[0];

  // 3️⃣ If private chat → get other user
  if (!conversation.is_group) {
    const otherUserResult = await pool.query(
      `
      SELECT u.id, u.username
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = $1
      AND cp.user_id != $2
      LIMIT 1
      `,
      [conversationId, userId]
    );

    return {
      id: conversation.id,
      is_group: false,
      other_user: otherUserResult.rows[0],
    };
  }

  // 4️⃣ If group (basic version)
  return {
    id: conversation.id,
    is_group: true,
  };
};


