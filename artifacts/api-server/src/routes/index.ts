import { Router, type IRouter } from "express";
import healthRouter from "./health";
import districtsRouter from "./districts";
import servicesRouter from "./services";
import settingsRouter from "./settings";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(districtsRouter);
router.use(servicesRouter);
router.use(settingsRouter);
router.use(ordersRouter);

export default router;
