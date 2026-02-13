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

