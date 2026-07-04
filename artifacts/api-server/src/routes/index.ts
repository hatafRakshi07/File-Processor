import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import branchesRouter from "./branches";
import customersRouter from "./customers";
import collectorsRouter from "./collectors";
import committeesRouter from "./committees";
import tokensRouter from "./tokens";
import loansRouter from "./loans";
import collectionsRouter from "./collections";
import lotteriesRouter from "./lotteries";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
// Public: login, logout, me
router.use(authRouter);
// All routes below require a valid session token
router.use(requireAuth);
router.use(dashboardRouter);
router.use(branchesRouter);
router.use(customersRouter);
router.use(collectorsRouter);
router.use(committeesRouter);
router.use(tokensRouter);
router.use(loansRouter);
router.use(collectionsRouter);
router.use(lotteriesRouter);
router.use(reportsRouter);

export default router;
