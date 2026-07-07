import { Router, Request, Response, NextFunction } from 'express';
import getAccessFromCheck from '../middlewares/getAccessToken';
import AuthController from '../controller/AuthController';
import { UserModel } from '../model/userModel';

const auth = new AuthController();

const router = Router();


// Inside your Express router file:

router.get('/profile', 
  async (req: Request, res: Response, next: NextFunction) => { 
    await getAccessFromCheck(req, res, next); 
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. If middleware failed or user session didn't attach an identity
      if (!req.user) {
        return res.redirect('/login'); 
      }

      const fullUserData = await UserModel.findById(req.user.id).select('name email');

      if (!fullUserData) {
        return res.status(404).send('User profile not found in system storage.');
      }

      // 3. Render the page passing the rich database object instead of the dry shell user session
      res.render('profile', { user: fullUserData });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
