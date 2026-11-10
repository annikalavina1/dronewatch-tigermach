import { Router, type IRouter } from "express";
import dronewatchRouter from "./dronewatch";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dronewatchRouter);

export default router;
