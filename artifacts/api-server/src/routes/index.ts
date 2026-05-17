import { Router, type IRouter } from "express";
import healthRouter from "./health";
import districtsRouter from "./districts";
import servicesRouter from "./services";
import settingsRouter from "./settings";
import ordersRouter from "./orders";
import staffRouter from "./staff";
import adminRouter from "./admin";
import doctorRouter from "./doctor";
import courierRouter from "./courier";

const router: IRouter = Router();

router.use(healthRouter);
router.use(districtsRouter);
router.use(servicesRouter);
router.use(settingsRouter);
router.use(ordersRouter);
router.use(staffRouter);
router.use(adminRouter);
router.use(doctorRouter);
router.use(courierRouter);

export default router;
