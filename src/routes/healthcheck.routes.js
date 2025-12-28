/** The below code is like a boilerplate for routers
import { Router } from "express";

const router = Router();

export default router;
*/


import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controllers.js";

const router = Router();
router.route("/").get(healthCheck);

export default router;
