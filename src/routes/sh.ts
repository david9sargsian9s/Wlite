import { Router, Request, Response, NextFunction } from 'express';
import { shController } from '../controller/ShController';
import getAccessFromCheck from '../middlewares/getAccessToken';

const router = Router();

router.get('/login', shController.renderLogin);
router.get('/register', shController.renderRegister);

router.get('/', 
  async (req: Request, res: Response, next: NextFunction) => { await getAccessFromCheck(req, res, next); }, 
  async (req: Request, res: Response, next: NextFunction) => { await shController.renderShell(req, res, next); }
);

router.post('/api/shell', 
  async (req: Request, res: Response, next: NextFunction) => { await getAccessFromCheck(req, res, next); }, 
  async (req: Request, res: Response, next: NextFunction) => { await shController.handleTerminalInput(req, res, next); }
);

export default router;
