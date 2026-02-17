import { Router } from "express";
import { findPrivateConversation,createPrivateConversation,getUserConversationsList,getMessages } from "./conversation.services.js";
import { checkSession } from "../middleware/checkSession.js";

const router=Router();

router.post('/private', checkSession, async (req,res)=>{
  const { targetUserId } = req.body;
  const userId = req.userId;
  if (!targetUserId || typeof targetUserId !== 'string' || !userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Both userId and targetUserId are required and must be strings"
    });
  }

  if(!targetUserId){
    return res.status(400).json({
      success:false,
      message:"Target user is required"
    })
  }

  const existing = await findPrivateConversation(userId, targetUserId);
  if(existing){ 
    return res.json({
      conversationId:existing.id
    })
  }
  const conversationId = await createPrivateConversation(userId, targetUserId);
  return res.status(200).json({
    conversationId
  })
})
checkSession, 
router.get("/", async (req, res) => {

  const userId = req.userId;

  const conversations = await getUserConversationsList(userId as string);

  res.json(conversations);
});
router.get("/:conversationId", checkSession, async (req, res) => {

  const { conversationId } = req.params;
  const page = Number(req.query.page) || 1;

  const messages = await getMessages(conversationId, page);
  if(messages==null){
    return res.json("No message");
  }

  res.json(messages);
});


export default router;

