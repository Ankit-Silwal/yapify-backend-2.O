import { pool } from "../config/db.js";

export const getUserConversations = async (userId: string) => {
  const result = await pool.query(
    `
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = $1
      AND deleted_at IS NULL
    `,
    [userId]
  );

  return result.rows;
};

export const checkUserInConversation = async (
  userId: string,
  conversationId: string
) => {
  const result = await pool.query(
    `
    SELECT 1
    FROM conversation_participants
    WHERE user_id = $1
      AND conversation_id = $2
      AND deleted_at IS NULL
    `,
    [userId, conversationId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const createMessage = async (
  conversationId: string,
  senderId: string,
  content: string
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const messageResult = await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [conversationId, senderId, content]
    );

    const message = messageResult.rows[0];

    await client.query(
      `
      INSERT INTO message_status (message_id, user_id, status)
      SELECT $1, user_id, 'sent'
      FROM conversation_participants
      WHERE conversation_id = $2
      `,
      [message.id, conversationId]
    );

    await client.query("COMMIT");

    return message;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
