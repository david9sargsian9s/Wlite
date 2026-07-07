import { Router, Request, Response, NextFunction } from 'express';
import getAccessFromCheck from '../middlewares/getAccessToken';
import AuthController from '../controller/AuthController';

const auth = new AuthController();

const router = Router();


router.get('/profile', 
  async (req: Request, res: Response, next: NextFunction) => { await getAccessFromCheck(req, res, next); },
  async (req: Request, res: Response) => {
    // Pass the user object from request to the EJS template
    res.render('profile', { user: req.user });
  }
);

export default router;
