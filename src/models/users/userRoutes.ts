import { Router } from "express";
import { searchUsers } from "./userManager.js";
import { checkSession } from "../../middleware/checkSession.js";

const router = Router();

router.get('/users/search', checkSession, searchUsers);

export default router;
